import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { isHospitalityOrg } from "./lib/hospitalityAccess";
import {
  applyLegacyReservationReview,
  reviewLegacyReservations,
} from "./lib/reservationEngine";

const review = v.object({
  reservationId: v.id("reservations"),
  expectedUpdatedAt: v.number(),
  originalTimeModel: v.union(v.literal("utc"), v.literal("wall_utc")),
  timezone: v.string(),
  serviceDate: v.string(),
  actualStartAt: v.number(),
  tableIds: v.array(v.id("tables")),
  disposition: v.union(
    v.literal("convert"),
    v.literal("cancelled"),
    v.literal("completed"),
    v.literal("no_show"),
  ),
});

/** Deployment-operator tools only. No route, staff UI or scheduler calls these. */
export const inventory = internalQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, { orgId }) => {
    const org = await ctx.db.get(orgId);
    if (!isHospitalityOrg(org))
      throw new ConvexError("Restaurant reservations are unavailable.");
    const rows = await ctx.db
      .query("reservations")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .collect();
    return rows
      .filter((r) => !r.isDeleted && r.schemaVersion !== 2)
      .map((r) => ({
        reservationId: r._id,
        expectedUpdatedAt: r.updatedAt,
        status: r.status,
        storedStartAt: r.startAt,
        storedEndAt: r.endAt,
        durationMins: r.durationMins,
        partySize: r.partySize,
        tableId: r.tableId,
        requiresReview: ["pending", "confirmed", "seated"].includes(r.status),
      }));
  },
});

export const dryRun = internalQuery({
  args: { orgId: v.id("orgs"), reviews: v.array(review) },
  handler: async (ctx, { orgId, reviews }) => {
    const org = await ctx.db.get(orgId);
    if (!org || !isHospitalityOrg(org))
      throw new ConvexError("Restaurant reservations are unavailable.");
    const { planned } = await reviewLegacyReservations(ctx, org, reviews);
    return planned.map((p) => ({
      reservationId: p.old._id,
      disposition: p.review.disposition,
      storedStartAt: p.old.startAt,
      actualStartAt: p.review.actualStartAt,
      endAt: p.endAt,
      tableIds: p.option?.tableIds,
      originalTimeModel: p.review.originalTimeModel,
      timezone: p.review.timezone,
    }));
  },
});

export const apply = internalMutation({
  args: { orgId: v.id("orgs"), reviews: v.array(review), reason: v.string() },
  handler: async (ctx, { orgId, reviews, reason }) => {
    const org = await ctx.db.get(orgId);
    if (!org || !isHospitalityOrg(org))
      throw new ConvexError("Restaurant reservations are unavailable.");
    return applyLegacyReservationReview(ctx, org, reviews, reason);
  },
});
