import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { normalizeProductPlan } from "./lib/auth";

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
            role: v.optional(v.union(v.literal("owner"), v.literal("manager"), v.literal("staff"))),
            industry: v.optional(v.union(
                v.literal("beauty_wellness"),
                v.literal("hospitality"),
            )),
            plan: v.optional(v.union(v.literal("free"), v.literal("paid"))),
        })
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

        // Resolve the active tenant from server-owned user state. Memberships are
        // only a fallback for development data created before activeOrgId.
        const staffProfiles = await ctx.db
            .query("staff_members")
            .withIndex("by_user", (q) => q.eq("userId", user._id))
            .filter((q) => q.eq(q.field("isDeleted"), false))
            .filter((q) => q.eq(q.field("isActive"), true))
            .collect();

        const preferredStaff = user.activeOrgId
            ? staffProfiles.find((profile) => profile.orgId === user.activeOrgId)
            : undefined;
        const activeStaff = preferredStaff ?? staffProfiles[0] ?? null;
        const activeOrg = activeStaff ? await ctx.db.get(activeStaff.orgId) : null;

        if (activeOrg?.isDeleted) {
            return { user };
        }

        return {
            user,
            orgId: activeStaff?.orgId,
            role: activeStaff?.role,
            industry: activeOrg?.industry,
            plan: activeOrg ? normalizeProductPlan(activeOrg.plan) : undefined,
        };
    },
});
