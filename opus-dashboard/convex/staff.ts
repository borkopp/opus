import { scheduleRecoveryRefresh } from "./lib/gapRecovery";
import {
  ensureScheduleBaseline,
  recordScheduleVersion,
} from "./analyst/schedules";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import {
  requireActiveOrg,
  requireAuth,
  requirePaidPlan,
  requireRole,
} from "./lib/auth";
import { api, internal } from "./_generated/api";
import {
  isValidBookingEmail,
  normalizeBookingEmail,
} from "./lib/bookingEmailSecurity";
import { resolveStoredImageUrl } from "./lib/imageUrl";
import {
  getStaffPlanStatusForOrg,
  requireStaffPlanCapacity,
} from "./lib/staffPlanLimits";
import {
  hasPersonalBookingAccess,
  requireBookingAccess,
} from "./lib/staffAccess";
import { wallClockNow } from "./lib/bookingTime";
import {
  isAppReviewEmail,
  rejectAppReviewIdentity,
  requireLiveStudio,
} from "./lib/appReview";

type StorageCtx = Pick<import("./_generated/server").QueryCtx, "storage">;

async function visibleStaffMember(
  ctx: StorageCtx,
  staffMember: Doc<"staff_members">,
) {
  const visible = { ...staffMember };
  const avatarUrl = await resolveStoredImageUrl(ctx, visible.avatarUrl);
  if (avatarUrl) {
    visible.avatarUrl = avatarUrl;
  } else {
    delete visible.avatarUrl;
  }
  // Deprecated appointment emails are never exposed by active APIs.
  delete visible.appointmentEmail;
  return visible;
}

async function normalizeAvatarUrl(
  ctx: StorageCtx,
  value: string | null | undefined,
) {
  const avatarUrl = await resolveStoredImageUrl(ctx, value);
  if (value?.trim() && !avatarUrl) {
    throw new ConvexError(
      "Profile photo could not be loaded. Upload it again.",
    );
  }
  return avatarUrl;
}

function normalizeSignInEmail(value: string | null | undefined) {
  if (!value?.trim()) return undefined;
  const email = normalizeBookingEmail(value);
  if (!isValidBookingEmail(email)) {
    throw new ConvexError("Enter a valid sign-in email address.");
  }
  return email;
}

export const getStaffPlanStatus = query({
  args: { staffId: v.optional(v.id("staff_members")) },
  handler: async (ctx, args) => {
    const { org } = await requireAuth(ctx);
    const existingStaff = args.staffId
      ? await ctx.db.get(args.staffId)
      : undefined;
    if (
      args.staffId &&
      (!existingStaff ||
        existingStaff.orgId !== org._id ||
        existingStaff.isDeleted)
    ) {
      throw new ConvexError("Staff member not found");
    }
    return getStaffPlanStatusForOrg(ctx, org, existingStaff ?? undefined);
  },
});

export const listStaffMembers = query({
  args: {
    orgId: v.id("orgs"),
  },
  returns: v.array(v.any()), // Can be refined later with Document<"staff_members">
  handler: async (ctx, args) => {
    const { staffMember: caller } = await requireActiveOrg(ctx, args.orgId);

    const staff = await ctx.db
      .query("staff_members")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    return await Promise.all(
      staff
        .filter(
          (member) =>
            !hasPersonalBookingAccess(caller) || member._id === caller._id,
        )
        .sort((a, b) => a.displayName.localeCompare(b.displayName))
        .map((staffMember) => visibleStaffMember(ctx, staffMember)),
    );
  },
});

export const getStaffMember = query({
  args: {
    orgId: v.id("orgs"),
    staffId: v.id("staff_members"),
  },
  returns: v.union(v.null(), v.any()),
  handler: async (ctx, args) => {
    const { staffMember: caller } = await requireActiveOrg(ctx, args.orgId);

    const staffMember = await ctx.db.get(args.staffId);

    if (
      !staffMember ||
      staffMember.orgId !== args.orgId ||
      staffMember.isDeleted
    ) {
      return null;
    }

    if (hasPersonalBookingAccess(caller) && staffMember._id !== caller._id)
      return null;
    return await visibleStaffMember(ctx, staffMember);
  },
});

export const createStaffMember = mutation({
  args: {
    orgId: v.id("orgs"),
    displayName: v.string(),
    role: v.union(v.literal("owner"), v.literal("manager"), v.literal("staff")),
    bio: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    specialties: v.array(v.string()),
    appointmentEmail: v.optional(v.string()), // Accepted for older clients; ignored.
    signInEmail: v.optional(v.string()),
  },
  returns: v.id("staff_members"),
  handler: async (ctx, args) => {
    const { staffMember: caller, org } = await requireRole(
      ctx,
      args.orgId,
      "manager",
    );
    if (args.role === "owner" && caller.role !== "owner") {
      throw new ConvexError("Only an owner can add another owner");
    }
    await requireStaffPlanCapacity(ctx, org, args.role);
    const signInEmail = normalizeSignInEmail(args.signInEmail);
    if (signInEmail) requirePaidPlan(org, "Staff accounts");
    const avatarUrl = await normalizeAvatarUrl(ctx, args.avatarUrl);

    await ensureScheduleBaseline(ctx, args.orgId);
    const newStaffId = await ctx.db.insert("staff_members", {
      orgId: args.orgId,
      displayName: args.displayName,
      role: args.role,
      bookingAccess: args.role === "staff" ? "own" : "team",
      bio: args.bio,
      avatarUrl,
      specialties: args.specialties,
      isActive: true,
      isDeleted: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await ctx.db.insert("audit_log", {
      orgId: args.orgId,
      actorType: "staff",
      actorId: caller._id,
      action: "staff.created",
      resourceType: "staff_members",
      resourceId: newStaffId,
      after: {
        id: newStaffId,
        displayName: args.displayName,
        role: args.role,
        specialties: args.specialties,
      },
      createdAt: Date.now(),
    });

    await ctx.runMutation(internal.publication.recomputeWebsiteStatus, {
      orgId: args.orgId,
    });

    await recordScheduleVersion(ctx, args.orgId);
    await scheduleRecoveryRefresh(ctx, args.orgId);
    if (signInEmail) {
      await ctx.runMutation(api.staff.inviteStaffMember, {
        orgId: args.orgId,
        staffId: newStaffId,
        email: signInEmail,
      });
    }
    return newStaffId;
  },
});

export const updateStaffMember = mutation({
  args: {
    orgId: v.id("orgs"),
    staffId: v.id("staff_members"),
    displayName: v.optional(v.string()),
    bio: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    specialties: v.optional(v.array(v.string())),
    role: v.optional(
      v.union(v.literal("owner"), v.literal("manager"), v.literal("staff")),
    ),
    isActive: v.optional(v.boolean()),
    appointmentEmail: v.optional(v.union(v.string(), v.null())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { staffMember: caller, org } = await requireAuth(ctx, args.orgId);

    // Only managers and owners can update roles or other people's profiles
    const tryingToUpdateSelf = caller._id === args.staffId;
    if (!tryingToUpdateSelf && caller.role === "staff") {
      throw new ConvexError("Unauthorised to update other staff members");
    }

    if (args.role !== undefined && caller.role === "staff") {
      throw new ConvexError("Staff cannot change their own role");
    }

    const existingStaff = await ctx.db.get(args.staffId);
    if (
      !existingStaff ||
      existingStaff.orgId !== args.orgId ||
      existingStaff.isDeleted
    ) {
      throw new ConvexError("Staff member not found");
    }

    if (existingStaff.role === "owner" && caller.role !== "owner") {
      throw new ConvexError("Only an owner can update another owner");
    }
    if (args.role === "owner" && caller.role !== "owner") {
      throw new ConvexError("Only an owner can assign the owner role");
    }

    const removesActiveOwner =
      existingStaff.role === "owner" &&
      existingStaff.isActive &&
      ((args.role !== undefined && args.role !== "owner") ||
        args.isActive === false);
    if (removesActiveOwner) {
      const activeOwners = await ctx.db
        .query("staff_members")
        .withIndex("by_org_active", (q) =>
          q.eq("orgId", args.orgId).eq("isActive", true).eq("isDeleted", false),
        )
        .collect();
      if (
        activeOwners.filter((member) => member.role === "owner").length <= 1
      ) {
        throw new ConvexError(
          "The business must keep at least one active owner",
        );
      }
    }

    const nextRole = args.role ?? existingStaff.role;
    const nextIsActive = args.isActive ?? existingStaff.isActive;
    if (
      nextIsActive &&
      (!existingStaff.isActive || nextRole !== existingStaff.role)
    ) {
      await requireStaffPlanCapacity(ctx, org, nextRole, existingStaff);
    }

    const updates: Partial<typeof existingStaff> = {
      updatedAt: Date.now(),
    };
    if (args.displayName !== undefined) {
      const trimmedName = args.displayName.trim();
      updates.displayName = trimmedName;
      if (
        existingStaff.userId &&
        (tryingToUpdateSelf ||
          (caller.role === "owner" && existingStaff.role === "owner"))
      ) {
        await ctx.db.patch(existingStaff.userId, {
          name: trimmedName,
          updatedAt: Date.now(),
        });
      }
    }
    if (args.bio !== undefined) updates.bio = args.bio;
    if (args.avatarUrl !== undefined) {
      updates.avatarUrl = await normalizeAvatarUrl(ctx, args.avatarUrl);
    }
    if (args.specialties !== undefined) updates.specialties = args.specialties;
    if (args.role !== undefined) updates.role = args.role;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    await ensureScheduleBaseline(ctx, args.orgId);
    await ctx.db.patch(args.staffId, updates);
    await recordScheduleVersion(ctx, args.orgId);
    await scheduleRecoveryRefresh(ctx, args.orgId);

    await ctx.db.insert("audit_log", {
      orgId: args.orgId,
      actorType: "staff",
      actorId: caller._id,
      action: "staff.updated",
      resourceType: "staff_members",
      resourceId: args.staffId,
      before: existingStaff,
      after: { ...existingStaff, ...updates },
      createdAt: Date.now(),
    });

    // Owner role and active state both affect website readiness.
    if (args.role !== undefined || args.isActive !== undefined) {
      await ctx.runMutation(internal.publication.recomputeWebsiteStatus, {
        orgId: args.orgId,
      });
    }

    return null;
  },
});

export const deactivateStaffMember = mutation({
  args: {
    orgId: v.id("orgs"),
    staffId: v.id("staff_members"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { staffMember: caller } = await requireRole(
      ctx,
      args.orgId,
      "manager",
    );

    const existingStaff = await ctx.db.get(args.staffId);
    if (
      !existingStaff ||
      existingStaff.orgId !== args.orgId ||
      existingStaff.isDeleted
    ) {
      throw new ConvexError("Staff member not found");
    }

    if (existingStaff._id === caller._id) {
      throw new ConvexError("You cannot deactivate yourself");
    }
    if (existingStaff.role === "owner" && caller.role !== "owner") {
      throw new ConvexError("Only an owner can deactivate another owner");
    }
    if (existingStaff.role === "owner" && existingStaff.isActive) {
      const activeOwners = await ctx.db
        .query("staff_members")
        .withIndex("by_org_active", (q) =>
          q.eq("orgId", args.orgId).eq("isActive", true).eq("isDeleted", false),
        )
        .collect();
      if (
        activeOwners.filter((member) => member.role === "owner").length <= 1
      ) {
        throw new ConvexError(
          "The business must keep at least one active owner",
        );
      }
    }

    const updates = {
      isActive: false,
      isDeleted: true,
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    };

    await ensureScheduleBaseline(ctx, args.orgId);
    await ctx.db.patch(args.staffId, updates);
    await recordScheduleVersion(ctx, args.orgId);
    await scheduleRecoveryRefresh(ctx, args.orgId);

    await ctx.db.insert("audit_log", {
      orgId: args.orgId,
      actorType: "staff",
      actorId: caller._id,
      action: "staff.deactivated",
      resourceType: "staff_members",
      resourceId: args.staffId,
      before: existingStaff,
      after: { ...existingStaff, ...updates },
      createdAt: Date.now(),
    });

    // Recompute website status — a staff member was deactivated.
    await ctx.runMutation(internal.publication.recomputeWebsiteStatus, {
      orgId: args.orgId,
    });

    return null;
  },
});

// Invites

export const inviteStaffMember = mutation({
  args: {
    orgId: v.id("orgs"),
    staffId: v.id("staff_members"),
    email: v.string(),
  },
  returns: v.id("staff_invites"),
  handler: async (ctx, args) => {
    const { staffMember: caller, org } = await requireRole(
      ctx,
      args.orgId,
      "manager",
    );

    const existingStaff = await ctx.db.get(args.staffId);
    if (
      !existingStaff ||
      existingStaff.orgId !== args.orgId ||
      existingStaff.isDeleted
    ) {
      throw new ConvexError("Staff member not found");
    }

    if (existingStaff.userId) {
      throw new ConvexError("Staff member is already linked to a user account");
    }
    if (existingStaff.role === "owner" && caller.role !== "owner") {
      throw new ConvexError("Only an owner can invite another owner");
    }

    requirePaidPlan(org, "Staff accounts");
    const email = normalizeSignInEmail(args.email);
    if (!email) throw new ConvexError("Enter a valid invitation email.");
    requireLiveStudio(org);
    if (isAppReviewEmail(email))
      throw new ConvexError(
        "The reserved App Review account cannot be invited to a studio.",
      );
    if (!existingStaff.isActive)
      throw new ConvexError("Activate this staff member before inviting them.");
    const pending = await ctx.db
      .query("staff_invites")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();
    for (const invite of pending) {
      if (
        invite.staffId === args.staffId &&
        invite.status === "pending" &&
        !invite.isDeleted
      )
        await ctx.db.patch(invite._id, {
          status: "cancelled",
          updatedAt: Date.now(),
        });
    }
    const token = crypto.randomUUID();
    const expiresAt = Date.now() + 72 * 60 * 60 * 1000; // 72 hours

    if (
      existingStaff.role === "staff" &&
      existingStaff.bookingAccess === undefined
    )
      await ctx.db.patch(existingStaff._id, {
        bookingAccess: "own",
        updatedAt: Date.now(),
      });
    const inviteId = await ctx.db.insert("staff_invites", {
      orgId: args.orgId,
      staffId: args.staffId,
      email,
      personalAccount: true,
      token,
      status: "pending",
      expiresAt,
      isDeleted: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await ctx.runMutation(internal.notifications.scheduleNotification, {
      orgId: args.orgId,
      channel: "email",
      type: "staff_invite",
      recipientAddress: email,
      templateData: { token, inviteId },
      dedupeKey: `staff-invite:${inviteId}:${args.email.trim().toLowerCase()}`,
    });

    await ctx.db.insert("audit_log", {
      orgId: args.orgId,
      actorType: "staff",
      actorId: caller._id,
      action: "staff.invited",
      resourceType: "staff_invites",
      resourceId: inviteId,
      after: { inviteId, staffId: args.staffId, email: args.email },
      createdAt: Date.now(),
    });

    return inviteId;
  },
});

export const acceptStaffInvite = mutation({
  args: {
    token: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Unauthenticated");
    }
    rejectAppReviewIdentity(identity);
    if (identity.emailVerified === false)
      throw new ConvexError(
        "Verify your account email before accepting this invitation.",
      );

    const user = await ctx.db
      .query("users")
      .withIndex("by_auth_user_id", (q) => q.eq("authUserId", identity.subject))
      .first();

    if (!user || user.isDeleted) {
      throw new ConvexError("User not found or deleted");
    }

    const invite = await ctx.db
      .query("staff_invites")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!invite || invite.isDeleted || invite.status !== "pending") {
      throw new ConvexError("Invalid or expired invite");
    }

    if (Date.now() > invite.expiresAt) {
      await ctx.db.patch(invite._id, {
        status: "expired",
        updatedAt: Date.now(),
      });
      throw new ConvexError("Invite has expired");
    }

    if (
      !identity.email ||
      normalizeBookingEmail(identity.email) !==
        normalizeBookingEmail(invite.email)
    )
      throw new ConvexError(
        "Sign in with the email address that received this invitation.",
      );
    const [target, org] = await Promise.all([
      ctx.db.get(invite.staffId),
      ctx.db.get(invite.orgId),
    ]);
    if (
      !target ||
      target.orgId !== invite.orgId ||
      target.isDeleted ||
      !target.isActive ||
      !org ||
      org.isDeleted
    )
      throw new ConvexError("This invitation is no longer available.");
    if (target.userId && target.userId !== user._id)
      throw new ConvexError(
        "Staff member is already linked to another account.",
      );
    requireLiveStudio(org);
    if (invite.personalAccount) requirePaidPlan(org, "Staff accounts");
    const memberships = await ctx.db
      .query("staff_members")
      .withIndex("by_org_user", (q) =>
        q.eq("orgId", invite.orgId).eq("userId", user._id),
      )
      .collect();
    if (
      memberships.some(
        (member) => !member.isDeleted && member._id !== target._id,
      )
    )
      throw new ConvexError(
        "This account already has a membership in this studio.",
      );

    // Link the user to the existing staff seat without replacing its bookings.
    await ctx.db.patch(invite.staffId, {
      userId: user._id,
      updatedAt: Date.now(),
    });
    await ctx.db.patch(user._id, {
      activeOrgId: invite.orgId,
      updatedAt: Date.now(),
    });

    // Mark invite as accepted
    await ctx.db.patch(invite._id, {
      status: "accepted",
      updatedAt: Date.now(),
    });

    await ctx.db.insert("audit_log", {
      orgId: invite.orgId,
      actorType: "user",
      actorId: user._id,
      action: "staff.invite_accepted",
      resourceType: "staff_invites",
      resourceId: invite._id,
      after: {
        inviteId: invite._id,
        staffId: invite.staffId,
        userId: user._id,
      },
      createdAt: Date.now(),
    });

    await ctx.scheduler.runAfter(
      0,
      internal.notifications.reconcileBookingRemindersForOrg,
      { orgId: invite.orgId },
    );

    return null;
  },
});

export const getPersonalContext = query({
  args: {},
  handler: async (ctx) => {
    const { org, orgId, staffMember } = await requireBookingAccess(ctx);
    const settings = await ctx.db
      .query("org_settings")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .first();
    const timezone = settings?.timezone ?? "Europe/Skopje";
    return {
      name: org.name,
      staffName: staffMember.displayName,
      timezone,
      now: wallClockNow(timezone),
    };
  },
});

export const getAccountAccess = query({
  args: { orgId: v.id("orgs"), staffId: v.id("staff_members") },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.orgId, "manager");
    const staff = await ctx.db.get(args.staffId);
    if (!staff || staff.orgId !== args.orgId || staff.isDeleted)
      throw new ConvexError("Staff member not found.");
    const account = staff.userId ? await ctx.db.get(staff.userId) : null;
    const invites = await ctx.db
      .query("staff_invites")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();
    const pending = invites
      .filter(
        (invite) =>
          invite.staffId === staff._id &&
          invite.status === "pending" &&
          !invite.isDeleted &&
          invite.expiresAt > Date.now(),
      )
      .sort((a, b) => b.createdAt - a.createdAt)[0];
    return {
      email: account && !account.isDeleted ? account.email : null,
      linked: Boolean(account && !account.isDeleted),
      bookingAccess: hasPersonalBookingAccess(staff)
        ? ("own" as const)
        : ("team" as const),
      invite: pending
        ? { email: pending.email, expiresAt: pending.expiresAt }
        : null,
    };
  },
});

export const updateAccountAccess = mutation({
  args: {
    orgId: v.id("orgs"),
    staffId: v.id("staff_members"),
    bookingAccess: v.union(v.literal("own"), v.literal("team")),
  },
  handler: async (ctx, args) => {
    const { staffMember: caller } = await requireRole(ctx, args.orgId, "owner");
    const staff = await ctx.db.get(args.staffId);
    if (
      !staff ||
      staff.orgId !== args.orgId ||
      staff.isDeleted ||
      staff.role !== "staff"
    )
      throw new ConvexError(
        "Only a staff member's appointment access can be changed.",
      );
    await ctx.db.patch(staff._id, {
      bookingAccess: args.bookingAccess,
      updatedAt: Date.now(),
    });
    await ctx.db.insert("audit_log", {
      orgId: args.orgId,
      actorType: "staff",
      actorId: caller._id,
      action: "staff.account_access_updated",
      resourceType: "staff_members",
      resourceId: staff._id,
      before: { bookingAccess: staff.bookingAccess ?? "team" },
      after: { bookingAccess: args.bookingAccess },
      createdAt: Date.now(),
    });
    return null;
  },
});

export const revokeAccountAccess = mutation({
  args: { orgId: v.id("orgs"), staffId: v.id("staff_members") },
  handler: async (ctx, args) => {
    const { staffMember: caller } = await requireRole(ctx, args.orgId, "owner");
    const staff = await ctx.db.get(args.staffId);
    if (
      !staff ||
      staff.orgId !== args.orgId ||
      staff.isDeleted ||
      staff.role === "owner"
    )
      throw new ConvexError(
        "Owner access must be managed through studio ownership.",
      );
    await ctx.db.patch(staff._id, { userId: undefined, updatedAt: Date.now() });
    const invites = await ctx.db
      .query("staff_invites")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();
    for (const invite of invites)
      if (
        invite.staffId === staff._id &&
        invite.status === "pending" &&
        !invite.isDeleted
      )
        await ctx.db.patch(invite._id, {
          status: "cancelled",
          updatedAt: Date.now(),
        });
    await ctx.db.insert("audit_log", {
      orgId: args.orgId,
      actorType: "staff",
      actorId: caller._id,
      action: "staff.account_access_revoked",
      resourceType: "staff_members",
      resourceId: staff._id,
      createdAt: Date.now(),
    });
    return null;
  },
});

export const getInvite = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const invite = await ctx.db
      .query("staff_invites")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();
    if (
      !invite ||
      invite.isDeleted ||
      invite.status !== "pending" ||
      invite.expiresAt <= Date.now()
    )
      return null;
    const [org, staff] = await Promise.all([
      ctx.db.get(invite.orgId),
      ctx.db.get(invite.staffId),
    ]);
    if (
      !org ||
      org.isDeleted ||
      !staff ||
      staff.isDeleted ||
      !staff.isActive ||
      staff.orgId !== org._id
    )
      return null;
    const identity = await ctx.auth.getUserIdentity();
    return {
      studioName: org.name,
      staffName: staff.displayName,
      emailMatches: Boolean(
        identity?.email &&
        normalizeBookingEmail(identity.email) ===
          normalizeBookingEmail(invite.email),
      ),
    };
  },
});
