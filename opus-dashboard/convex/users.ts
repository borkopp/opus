import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import {
  requireActiveOrg,
  requireUser,
  resolveActiveMembership,
} from "./lib/auth";
import { dashboardThemeValidator } from "./lib/dashboardTheme";
import { resolveStoredImageUrl } from "./lib/imageUrl";
import {
  appReviewBindings,
  assertAppReviewUser,
  isAppReviewEmail,
  isAppReviewIdentity,
  isAppReviewOrg,
} from "./lib/appReview";

export const ensureUser = mutation({
  args: {},
  returns: v.id("users"),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Unauthenticated");
    }

    const authUserId = identity.subject;
    const email = identity.email?.trim().toLowerCase();
    if (!email) {
      throw new ConvexError("Authenticated account has no verified email");
    }
    const name = identity.name?.trim() || email.split("@")[0] || "OPUS user";
    const { pictureUrl, phoneNumber } = identity;

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_auth_user_id", (q) => q.eq("authUserId", authUserId))
      .first();

    if (isAppReviewIdentity(identity, existingUser ?? undefined)) {
      if (!existingUser || existingUser.isDeleted)
        throw new ConvexError("App review access is unavailable.");
      assertAppReviewUser(identity, existingUser);
      return existingUser._id;
    }

    if (existingUser) {
      if (existingUser.isDeleted) {
        throw new ConvexError("Account unavailable");
      }
      if (
        existingUser.email !== email ||
        existingUser.avatarUrl !== pictureUrl ||
        existingUser.phone !== phoneNumber
      ) {
        await ctx.db.patch(existingUser._id, {
          email,
          avatarUrl: pictureUrl,
          phone: phoneNumber,
          updatedAt: Date.now(),
        });
      }
      return existingUser._id;
    }

    const emailMatches = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .collect();
    const activeEmailMatches = emailMatches.filter((user) => !user.isDeleted);

    if (activeEmailMatches.length > 1) {
      throw new ConvexError("Multiple accounts use this email");
    }

    const legacyUser = activeEmailMatches[0];
    if (legacyUser) {
      if (legacyUser.authUserId && legacyUser.authUserId !== authUserId) {
        throw new ConvexError("Account email is already linked");
      }

      await ctx.db.patch(legacyUser._id, {
        authUserId,
        email,
        avatarUrl: pictureUrl,
        phone: phoneNumber,
        updatedAt: Date.now(),
      });
      return legacyUser._id;
    }

    if (emailMatches.some((user) => user.isDeleted)) {
      throw new ConvexError("Account unavailable");
    }

    return await ctx.db.insert("users", {
      authUserId,
      email,
      name,
      avatarUrl: pictureUrl,
      phone: phoneNumber,
      isDeleted: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const getMyProfile = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      user: v.any(),
      orgId: v.optional(v.id("orgs")),
      role: v.optional(
        v.union(v.literal("owner"), v.literal("manager"), v.literal("staff")),
      ),
      industry: v.optional(
        v.union(v.literal("beauty_wellness"), v.literal("hospitality")),
      ),
      plan: v.optional(v.union(v.literal("free"), v.literal("paid"))),
      dashboardTheme: v.optional(dashboardThemeValidator),
      staffId: v.optional(v.id("staff_members")),
      bookingAccess: v.optional(v.union(v.literal("own"), v.literal("team"))),
      orgName: v.optional(v.string()),
      orgLogoUrl: v.optional(v.string()),
      staffAvatarUrl: v.optional(v.string()),
      staffDisplayName: v.optional(v.string()),
    }),
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_auth_user_id", (q) => q.eq("authUserId", identity.subject))
      .first();

    if (!user || user.isDeleted) {
      return null;
    }
    assertAppReviewUser(identity, user);

    const membership = await resolveActiveMembership(ctx, user);
    const activeStaff = membership?.staffMember;
    const activeOrg = membership?.org;

    const [orgLogoUrl, staffAvatarUrl, userAvatarUrl] = await Promise.all([
      activeOrg ? resolveStoredImageUrl(ctx, activeOrg.logoUrl) : undefined,
      activeStaff
        ? resolveStoredImageUrl(ctx, activeStaff.avatarUrl)
        : undefined,
      resolveStoredImageUrl(ctx, user.avatarUrl),
    ]);

    return {
      user: {
        ...user,
        name: activeStaff?.displayName || user.name,
        avatarUrl: userAvatarUrl ?? user.avatarUrl,
      },
      orgId: activeStaff?.orgId,
      role: activeStaff?.role,
      staffId: activeStaff?._id,
      bookingAccess:
        activeStaff?.role === "staff" && activeStaff.bookingAccess === "own"
          ? ("own" as const)
          : ("team" as const),
      industry: activeOrg?.industry,
      plan: activeOrg?.plan,
      dashboardTheme: activeStaff?.dashboardTheme,
      orgName: activeOrg?.name,
      orgLogoUrl,
      staffAvatarUrl,
      staffDisplayName: activeStaff?.displayName,
    };
  },
});

export const setDashboardTheme = mutation({
  args: { theme: dashboardThemeValidator },
  returns: v.null(),
  handler: async (ctx, { theme }) => {
    const { orgId, staffMember } = await requireActiveOrg(ctx);
    if (staffMember.dashboardTheme === theme) return null;

    const now = Date.now();
    await ctx.db.patch(staffMember._id, {
      dashboardTheme: theme,
      updatedAt: now,
    });
    await ctx.db.insert("audit_log", {
      orgId,
      actorType: "staff",
      actorId: staffMember._id,
      action: "staff.dashboard_theme_updated",
      resourceType: "staff_members",
      resourceId: staffMember._id,
      before: { dashboardTheme: staffMember.dashboardTheme ?? "clarity" },
      after: { dashboardTheme: theme },
      createdAt: now,
    });
    return null;
  },
});

/** Identity-root lookup; membership is revalidated for every subsequent org read. */
export const listMemberships = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireUser(ctx);
    const members = await ctx.db
      .query("staff_members")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const entries = await Promise.all(
      members
        .filter((member) => !member.isDeleted && member.isActive)
        .filter(
          (member) =>
            !isAppReviewEmail(user.email) ||
            member.orgId === appReviewBindings().orgId,
        )
        .map(async (member) => {
          const org = await ctx.db.get(member.orgId);
          return org &&
            !org.isDeleted &&
            org.industry === "beauty_wellness" &&
            (isAppReviewEmail(user.email) || !isAppReviewOrg(org))
            ? { orgId: org._id, name: org.name, role: member.role }
            : null;
        }),
    );
    return entries.filter((entry) => entry !== null);
  },
});

export const switchOrg = mutation({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, { orgId }) => {
    const { user } = await requireUser(ctx);
    if (isAppReviewEmail(user.email) && orgId !== appReviewBindings().orgId)
      throw new ConvexError("App Review access is limited to its demo studio.");
    const membership = await ctx.db
      .query("staff_members")
      .withIndex("by_org_user", (q) =>
        q.eq("orgId", orgId).eq("userId", user._id),
      )
      .first();
    const org = await ctx.db.get(orgId);
    if (
      !membership ||
      membership.isDeleted ||
      !membership.isActive ||
      !org ||
      org.isDeleted ||
      (!isAppReviewEmail(user.email) && isAppReviewOrg(org)) ||
      org.industry !== "beauty_wellness"
    )
      throw new ConvexError("No active access to this studio.");
    await ctx.db.patch(user._id, { activeOrgId: orgId, updatedAt: Date.now() });
    await ctx.db.insert("audit_log", {
      orgId,
      actorType: "user",
      actorId: user._id,
      action: "auth.studio_switched",
      resourceType: "staff_members",
      resourceId: membership._id,
      createdAt: Date.now(),
    });
    return null;
  },
});
