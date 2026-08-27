import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireRole } from "./lib/auth";
import { requireCurrentOpusUser } from "./lib/opusUserAuth";
import { internal } from "./_generated/api";

// ─────────────────────────────────────────────────────
// REVIEWS
// Consumer reviews of a business listing on opus.mk.
// Gated on: completed booking + verified opus_user account.
// ─────────────────────────────────────────────────────

// ─── Create a review ─────────────────────────────────
export const create = mutation({
    args: {
        bookingId: v.optional(v.id("bookings")),
        reservationId: v.optional(v.id("reservations")),
        rating: v.number(),                  // 1–5
        body: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Identity and ownership are derived server-side; no client-supplied
        // opusUserId, orgId, or customerId is trusted.
        const { user: opusUser } = await requireCurrentOpusUser(ctx);
        const opusUserId = opusUser._id;

        // Validate rating range
        if (!Number.isInteger(args.rating) || args.rating < 1 || args.rating > 5) {
            throw new ConvexError("Rating must be an integer between 1 and 5.");
        }

        // Require at least one of bookingId or reservationId
        if (
            (!args.bookingId && !args.reservationId) ||
            (args.bookingId && args.reservationId)
        ) {
            throw new ConvexError("A review must be linked to a completed booking or reservation.");
        }

        let orgId: Id<"orgs">;
        let customerId: Id<"customers">;

        // Verify the referenced booking/reservation belongs to this account.
        if (args.bookingId) {
            const booking = await ctx.db.get(args.bookingId);
            if (
                !booking ||
                booking.opusUserId !== opusUserId ||
                booking.status !== "completed"
            ) {
                throw new ConvexError("Can only review a completed booking.");
            }
            orgId = booking.orgId;
            customerId = booking.customerId;

            // One review per booking
            const existing = await ctx.db
                .query("reviews")
                .withIndex("by_booking", (q) => q.eq("bookingId", args.bookingId))
                .first();
            if (existing && !existing.isDeleted) {
                throw new ConvexError("A review for this booking already exists.");
            }
        } else {
            const reservationId = args.reservationId;
            if (!reservationId) {
                throw new ConvexError("A review target is required.");
            }
            const reservation = await ctx.db.get(reservationId);
            if (
                !reservation ||
                reservation.opusUserId !== opusUserId ||
                reservation.status !== "completed"
            ) {
                throw new ConvexError("Can only review a completed reservation.");
            }
            orgId = reservation.orgId;
            customerId = reservation.customerId;

            const existing = await ctx.db
                .query("reviews")
                .withIndex("by_reservation", (q) => q.eq("reservationId", reservationId))
                .first();
            if (existing && !existing.isDeleted) {
                throw new ConvexError("A review for this reservation already exists.");
            }
        }

        const now = Date.now();

        const reviewId = await ctx.db.insert("reviews", {
            orgId,
            opusUserId,
            customerId,
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
        await updateOrgRatingAggregate(ctx, orgId);

        await ctx.db.insert("audit_log", {
            orgId,
            actorType: "opus_user",
            actorId: opusUserId,
            action: "review.created",
            resourceType: "reviews",
            resourceId: reviewId,
            after: { rating: args.rating, bookingId: args.bookingId },
            createdAt: now,
        });

        // Refresh the org's reputation embedding — new review changes the snippet
        await ctx.scheduler.runAfter(0, internal.marketplace.embeddings.embedEntity, {
            entityType: "reputation",
            entityId: orgId,
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
