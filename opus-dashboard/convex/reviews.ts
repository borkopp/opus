import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireRole } from "./lib/auth";

// ─────────────────────────────────────────────────────
// REVIEWS
// Consumer reviews of a business listing on opus.mk.
// Gated on: completed booking + verified opus_user account.
// ─────────────────────────────────────────────────────

// ─── Create a review ─────────────────────────────────
export const create = mutation({
    args: {
        orgId: v.id("orgs"),
        opusUserId: v.id("opus_users"),
        customerId: v.id("customers"),
        bookingId: v.optional(v.id("bookings")),
        reservationId: v.optional(v.id("reservations")),
        rating: v.number(),                  // 1–5
        body: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new ConvexError("Unauthenticated");

        // Verify the opus user matches the authenticated session
        const opusUser = await ctx.db.get(args.opusUserId);
        if (!opusUser || opusUser.isDeleted || opusUser.clerkId !== identity.subject) {
            throw new ConvexError("Unauthorised");
        }

        // Validate rating range
        if (!Number.isInteger(args.rating) || args.rating < 1 || args.rating > 5) {
            throw new ConvexError("Rating must be an integer between 1 and 5.");
        }

        // Require at least one of bookingId or reservationId
        if (!args.bookingId && !args.reservationId) {
            throw new ConvexError("A review must be linked to a completed booking or reservation.");
        }

        // Verify the referenced booking/reservation is completed and belongs to this customer
        if (args.bookingId) {
            const booking = await ctx.db.get(args.bookingId);
            if (
                !booking ||
                booking.orgId !== args.orgId ||
                booking.customerId !== args.customerId ||
                booking.status !== "completed"
            ) {
                throw new ConvexError("Can only review a completed booking.");
            }

            // One review per booking
            const existing = await ctx.db
                .query("reviews")
                .withIndex("by_booking", (q) => q.eq("bookingId", args.bookingId))
                .first();
            if (existing && !existing.isDeleted) {
                throw new ConvexError("A review for this booking already exists.");
            }
        }

        if (args.reservationId) {
            const reservation = await ctx.db.get(args.reservationId);
            if (
                !reservation ||
                reservation.orgId !== args.orgId ||
                reservation.customerId !== args.customerId ||
                reservation.status !== "completed"
            ) {
                throw new ConvexError("Can only review a completed reservation.");
            }

            const existing = await ctx.db
                .query("reviews")
                .withIndex("by_reservation", (q) => q.eq("reservationId", args.reservationId))
                .first();
            if (existing && !existing.isDeleted) {
                throw new ConvexError("A review for this reservation already exists.");
            }
        }

        const now = Date.now();

        const reviewId = await ctx.db.insert("reviews", {
            orgId: args.orgId,
            opusUserId: args.opusUserId,
            customerId: args.customerId,
            bookingId: args.bookingId,
            reservationId: args.reservationId,
            rating: args.rating,
            body: args.body,
            isPublished: true,              // auto-publish; add moderation queue later if needed
            publishedAt: now,
            isDeleted: false,
            createdAt: now,
            updatedAt: now,
        });

        // Update the org's aggregate rating
        await updateOrgRatingAggregate(ctx, args.orgId);

        await ctx.db.insert("audit_log", {
            orgId: args.orgId,
            actorType: "opus_user",
            actorId: args.opusUserId,
            action: "review.created",
            resourceType: "reviews",
            resourceId: reviewId,
            after: { rating: args.rating, bookingId: args.bookingId },
            createdAt: now,
        });

        return reviewId;
    },
});

// ─── Owner reply to a review ──────────────────────────
export const reply = mutation({
    args: {
        orgId: v.id("orgs"),
        reviewId: v.id("reviews"),
        reply: v.string(),
    },
    handler: async (ctx, args) => {
        const { staffMember } = await requireRole(ctx, args.orgId, "manager");

        const review = await ctx.db.get(args.reviewId);
        if (!review || review.orgId !== args.orgId || review.isDeleted) {
            throw new ConvexError("Review not found.");
        }

        const now = Date.now();
        await ctx.db.patch(args.reviewId, {
            reply: args.reply,
            repliedAt: now,
            repliedByStaffId: staffMember._id,
            updatedAt: now,
        });
    },
});

// ─── List published reviews for an org ───────────────
export const listByOrg = query({
    args: {
        orgId: v.id("orgs"),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const reviews = await ctx.db
            .query("reviews")
            .withIndex("by_org_published", (q) =>
                q.eq("orgId", args.orgId).eq("isPublished", true)
            )
            .filter((q) => q.eq(q.field("isDeleted"), false))
            .order("desc")
            .take(args.limit ?? 50);

        // Populate reviewer name + avatar from opus_users
        const populated = await Promise.all(
            reviews.map(async (review) => {
                const opusUser = await ctx.db.get(review.opusUserId);
                return {
                    ...review,
                    reviewerName: opusUser?.name ?? "Anonymous",
                    reviewerAvatarUrl: opusUser?.avatarUrl,
                };
            })
        );

        return populated;
    },
});

async function updateOrgRatingAggregate(
    ctx: MutationCtx,
    orgId: Id<"orgs">
) {
    const reviews = await ctx.db
        .query("reviews")
        .withIndex("by_org_published", (q) =>
            q.eq("orgId", orgId).eq("isPublished", true)
        )
        .filter((q) => q.eq(q.field("isDeleted"), false))
        .collect();

    const count = reviews.length;
    const avg = count > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / count
        : 0;

    const org = await ctx.db.get(orgId);
    if (org && !org.isDeleted) {
        await ctx.db.patch(orgId, {
            reviewCount: count,
            averageRating: Math.round(avg * 10) / 10,
            updatedAt: Date.now(),
        });
    }
}
