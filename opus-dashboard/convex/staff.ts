import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth, requireRole } from "./lib/auth";
import { internal } from "./_generated/api";

export const listStaffMembers = query({
  args: {
    orgId: v.id("orgs"),
  },
  returns: v.array(v.any()), // Can be refined later with Document<"staff_members">
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.orgId);

    const staff = await ctx.db
      .query("staff_members")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    return staff.sort((a, b) => a.displayName.localeCompare(b.displayName));
  },
});

export const getStaffMember = query({
  args: {
    orgId: v.id("orgs"),
    staffId: v.id("staff_members"),
  },
  returns: v.union(v.null(), v.any()),
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.orgId);

    const staffMember = await ctx.db.get(args.staffId);

    if (
      !staffMember ||
      staffMember.orgId !== args.orgId ||
      staffMember.isDeleted
    ) {
      return null;
    }

    return staffMember;
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
  },
  returns: v.id("staff_members"),
  handler: async (ctx, args) => {
    const { staffMember: caller } = await requireRole(
      ctx,
      args.orgId,
      "manager",
    );
    if (args.role === "owner" && caller.role !== "owner") {
      throw new ConvexError("Only an owner can add another owner");
    }

    const newStaffId = await ctx.db.insert("staff_members", {
      orgId: args.orgId,
      displayName: args.displayName,
      role: args.role,
      bio: args.bio,
      avatarUrl: args.avatarUrl,
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
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { staffMember: caller } = await requireAuth(ctx, args.orgId);

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

    const updates: Partial<typeof existingStaff> = {
      updatedAt: Date.now(),
    };
    if (args.displayName !== undefined) updates.displayName = args.displayName;
    if (args.bio !== undefined) updates.bio = args.bio;
    if (args.avatarUrl !== undefined) updates.avatarUrl = args.avatarUrl;
    if (args.specialties !== undefined) updates.specialties = args.specialties;
    if (args.role !== undefined) updates.role = args.role;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    await ctx.db.patch(args.staffId, updates);

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

    await ctx.db.patch(args.staffId, updates);

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

    if (existingStaff.userId) {
      throw new ConvexError("Staff member is already linked to a user account");
    }
    if (existingStaff.role === "owner" && caller.role !== "owner") {
      throw new ConvexError("Only an owner can invite another owner");
    }

    const token = crypto.randomUUID();
    const expiresAt = Date.now() + 72 * 60 * 60 * 1000; // 72 hours

    const inviteId = await ctx.db.insert("staff_invites", {
      orgId: args.orgId,
      staffId: args.staffId,
      email: args.email,
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
      recipientAddress: args.email,
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

    // Link the user to the staff member
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

    return null;
  },
});
