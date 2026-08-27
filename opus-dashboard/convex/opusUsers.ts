import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
    ensureCurrentOpusUser,
    getCurrentOpusUser,
    requireCurrentOpusUser,
} from "./lib/opusUserAuth";

// ─────────────────────────────────────────────────────
// opus_users — platform-wide end-consumer identity
// Used by opus.mk visitors. NOT business owners / staff.
// Identity is derived server-side from ctx.auth (Better Auth); legacy clerkId
// data is retained only for one-time email-based account relinking.
// ─────────────────────────────────────────────────────

// ─── Upsert: create or return existing opus user ─────
// Called on sign-in or at booking time when creating via opus.mk. All identity
// and profile fields come from ctx.auth.
export const getOrCreate = mutation({
    args: {},
    handler: async (ctx) => {
        const user = await ensureCurrentOpusUser(ctx);
        return user._id;
    },
});

// ─── Get current signed-in consumer ─────────────────
export const getCurrent = query({
    args: {},
    handler: async (ctx) => {
        const current = await getCurrentOpusUser(ctx);
        return current?.user ?? null;
    },
});

// ─── Update preferences ──────────────────────────────
export const updatePreferences = mutation({
    args: {
        preferredCity: v.optional(v.string()),
        preferredChannel: v.optional(v.union(
            v.literal("whatsapp"),
            v.literal("sms"),
            v.literal("email"),
        )),
        marketingOptIn: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const { user } = await requireCurrentOpusUser(ctx);
        const patch: Record<string, unknown> = { updatedAt: Date.now() };

        if (args.preferredCity !== undefined) patch.preferredCity = args.preferredCity;
        if (args.preferredChannel !== undefined) patch.preferredChannel = args.preferredChannel;
        if (args.marketingOptIn !== undefined) patch.marketingOptIn = args.marketingOptIn;

        await ctx.db.patch(user._id, patch);
    },
});

// ─── Get my bookings (for opus.mk "My Bookings" page) ──
export const getMyBookings = query({
    args: {},
    handler: async (ctx) => {
        const current = await getCurrentOpusUser(ctx);
        if (!current) return [];
        const opusUser = current.user;

        // Get all bookings for this opus user
        const bookings = await ctx.db
            .query("bookings")
            .withIndex("by_opus_user", (q) => q.eq("opusUserId", opusUser._id))
            .filter((q) => q.eq(q.field("isDeleted"), false))
            .collect();

        // Sort by startAt descending (most recent first)
        bookings.sort((a, b) => b.startAt - a.startAt);

        // Populate org, service, staff names + review status
        const populated = await Promise.all(
            bookings.map(async (booking) => {
                const [org, service, staff, existingReview] = await Promise.all([
                    ctx.db.get(booking.orgId),
                    ctx.db.get(booking.serviceId),
                    ctx.db.get(booking.staffId),
                    // Check if a review already exists for this booking
                    ctx.db
                        .query("reviews")
                        .withIndex("by_booking", (q) => q.eq("bookingId", booking._id))
                        .first(),
                ]);

                return {
                    _id: booking._id,
                    orgId: booking.orgId,
                    customerId: booking.customerId,
                    opusUserId: opusUser._id,
                    startAt: booking.startAt,
                    endAt: booking.endAt,
                    status: booking.status,
                    priceMinorUnits: booking.priceMinorUnits,
                    currency: booking.currency,
                    createdAt: booking.createdAt,
                    orgName: org?.name ?? "Unknown Business",
                    orgSlug: org?.slug ?? "",
                    orgLogoUrl: org?.logoUrl,
                    serviceName: service?.name ?? "Unknown Service",
                    serviceDurationMins: service?.durationMins ?? 0,
                    staffName: staff?.displayName ?? "Unknown",
                    hasReview: !!(existingReview && !existingReview.isDeleted),
                };
            })
        );

        return populated;
    },
});
