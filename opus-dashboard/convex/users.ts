import { internalMutation, mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";

export const ensureUser = mutation({
    args: {},
    returns: v.id("users"),
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new ConvexError("Unauthenticated");
        }

        const { subject: clerkId, email, name, pictureUrl, phoneNumber } = identity;

        const existingUser = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
            .first();

        if (existingUser) {
            if (
                existingUser.email !== email ||
                existingUser.name !== name ||
                existingUser.avatarUrl !== pictureUrl ||
                existingUser.phone !== phoneNumber
            ) {
                await ctx.db.patch(existingUser._id, {
                    email: email ?? "",
                    name: name ?? "Unknown User",
                    avatarUrl: pictureUrl,
                    phone: phoneNumber,
                    updatedAt: Date.now(),
                });
            }
            return existingUser._id;
        }

        return await ctx.db.insert("users", {
            clerkId,
            email: email ?? "",
            name: name ?? "Unknown User",
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
        })
    ),
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            return null;
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
            .first();

        if (!user || user.isDeleted) {
            return null;
        }

        // Find the first org this user belongs to (with a valid, non-deleted org)
        const staffProfiles = await ctx.db
            .query("staff_members")
            .withIndex("by_user", (q) => q.eq("userId", user._id))
            .filter((q) => q.eq(q.field("isDeleted"), false))
            .filter((q) => q.eq(q.field("isActive"), true))
            .collect();

        let activeStaff = null;
        let activeOrg = null;
        for (const sp of staffProfiles) {
            const org = await ctx.db.get(sp.orgId);
            if (org && !org.isDeleted) {
                activeStaff = sp;
                activeOrg = org;
                break;
            }
        }

        return {
            user,
            orgId: activeStaff?.orgId,
            role: activeStaff?.role,
            industry: activeOrg?.industry,
        };
    },
});
