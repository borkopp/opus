import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireRole } from "../lib/auth";

// ─────────────────────────────────────────────────────────────────────────────
// Reservation Settings — Org-level configuration for hospitality reservations
// ─────────────────────────────────────────────────────────────────────────────

export const createOrUpdateReservationSettings = mutation({
  args: {
    orgId: v.id("orgs"),

    // Booking window
    bookingWindowDays: v.number(),
    minAdvanceBookingHours: v.number(),
    maxAdvanceBookingDays: v.optional(v.number()),

    // Party size
    minPartySize: v.number(),
    maxPartySize: v.number(),

    // Duration
    defaultDurationMins: v.number(),
    minDurationMins: v.number(),
    maxDurationMins: v.number(),

    // Slot intervals
    slotIntervalMins: v.number(),

    // Service periods
    servicePeriods: v.optional(
      v.array(
        v.object({
          name: v.string(),
          startTime: v.string(),
          endTime: v.string(),
          daysOfWeek: v.array(v.number()),
        }),
      ),
    ),

    // Walk-ins
    walkInsAccepted: v.boolean(),
    walkInBufferMins: v.number(),

    // Deposit
    depositRequired: v.boolean(),
    depositAmountMinorUnits: v.optional(v.number()),

    // Notifications
    confirmationMessage: v.optional(v.string()),
    reminderHoursBefore: v.array(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { staffMember } = await requireRole(ctx, args.orgId, "owner");

    const now = Date.now();

    // Upsert — check if settings already exist for this org
    const existing = await ctx.db
      .query("reservation_settings")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();

    const settingsData = {
      bookingWindowDays: args.bookingWindowDays,
      minAdvanceBookingHours: args.minAdvanceBookingHours,
      maxAdvanceBookingDays: args.maxAdvanceBookingDays,
      minPartySize: args.minPartySize,
      maxPartySize: args.maxPartySize,
      defaultDurationMins: args.defaultDurationMins,
      minDurationMins: args.minDurationMins,
      maxDurationMins: args.maxDurationMins,
      slotIntervalMins: args.slotIntervalMins,
      servicePeriods: args.servicePeriods,
      walkInsAccepted: args.walkInsAccepted,
      walkInBufferMins: args.walkInBufferMins,
      depositRequired: args.depositRequired,
      depositAmountMinorUnits: args.depositAmountMinorUnits,
      confirmationMessage: args.confirmationMessage,
      reminderHoursBefore: args.reminderHoursBefore,
      updatedAt: now,
    };

    if (existing) {
      const before = { ...existing };
      await ctx.db.patch(existing._id, settingsData);

      await ctx.db.insert("audit_log", {
        orgId: args.orgId,
        actorType: "staff",
        actorId: staffMember._id,
        action: "reservation_settings.updated",
        resourceType: "reservation_settings",
        resourceId: existing._id,
        before,
        after: settingsData,
        createdAt: now,
      });
    } else {
      const settingsId = await ctx.db.insert("reservation_settings", {
        orgId: args.orgId,
        ...settingsData,
      });

      await ctx.db.insert("audit_log", {
        orgId: args.orgId,
        actorType: "staff",
        actorId: staffMember._id,
        action: "reservation_settings.created",
        resourceType: "reservation_settings",
        resourceId: settingsId,
        after: settingsData,
        createdAt: now,
      });
    }

    return null;
  },
});

export const getReservationSettings = query({
  args: { orgId: v.id("orgs") },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("reservation_settings")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();
  },
});
