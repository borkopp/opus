import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";

// ─────────────────────────────────────────────────────
// opus_users — platform-wide end-consumer identity
// Used by opus.mk visitors. NOT business owners / staff.
// ─────────────────────────────────────────────────────

// ─── Upsert: create or return existing opus user ─────
// Called on sign-in or at booking time when creating via opus.mk.
export const getOrCreate = mutation({
    args: {
        clerkId: v.string(),
        email: v.string(),
        name: v.string(),
        phone: v.optional(v.string()),
        avatarUrl: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Look up existing user by Clerk ID
        const existing = await ctx.db
            .query("opus_users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
            .first();

        if (existing && !existing.isDeleted) {
            // Update profile fields that may have changed in Clerk
            await ctx.db.patch(existing._id, {
                email: args.email,
                name: args.name,
                phone: args.phone ?? existing.phone,
                avatarUrl: args.avatarUrl ?? existing.avatarUrl,
                updatedAt: Date.now(),
            });
            return existing._id;
        }

        // Create new opus_user
        const userId = await ctx.db.insert("opus_users", {
            clerkId: args.clerkId,
            email: args.email,
            name: args.name,
            phone: args.phone,
            avatarUrl: args.avatarUrl,
            opusPoints: 0,
            tier: "bronze",
            marketingOptIn: false,
            isDeleted: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });

        return userId;
    },
});

// ─── Get by Clerk ID ─────────────────────────────────
export const getByClerkId = query({
    args: { clerkId: v.string() },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("opus_users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
            .first();
        if (!user || user.isDeleted) return null;
        return user;
    },
});

// ─── Update preferences ──────────────────────────────
export const updatePreferences = mutation({
    args: {
        opusUserId: v.id("opus_users"),
        preferredCity: v.optional(v.string()),
        preferredChannel: v.optional(v.union(
            v.literal("whatsapp"),
            v.literal("sms"),
            v.literal("email"),
        )),
        marketingOptIn: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new ConvexError("Unauthenticated");

        const user = await ctx.db.get(args.opusUserId);
        if (!user || user.isDeleted) throw new ConvexError("User not found.");
        if (user.clerkId !== identity.subject) throw new ConvexError("Unauthorised");

        const { opusUserId, ...updates } = args;
        const patch: Record<string, unknown> = { updatedAt: Date.now() };

        if (updates.preferredCity !== undefined) patch.preferredCity = updates.preferredCity;
        if (updates.preferredChannel !== undefined) patch.preferredChannel = updates.preferredChannel;
        if (updates.marketingOptIn !== undefined) patch.marketingOptIn = updates.marketingOptIn;

        await ctx.db.patch(args.opusUserId, patch);
    },
});
