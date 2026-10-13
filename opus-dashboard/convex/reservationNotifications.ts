import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { isHospitalityOrg } from "./lib/hospitalityAccess";
import { normalizeReminderHours } from "./lib/bookingEmailNotifications";
import { queueReservationReminders } from "./lib/reservationEmailNotifications";

// Each transaction reads a bounded indexed page. Continuations survive a busy
// venue and do not silently omit reservations after the first batch.
export const reconcileOrg = internalMutation({
  args: {
    orgId: v.id("orgs"),
    cursor: v.optional(v.string()),
    from: v.optional(v.number()),
    through: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.orgId);
    if (!org || !isHospitalityOrg(org)) return { count: 0, isDone: true };
    const settings = await ctx.db
      .query("reservation_settings")
      .withIndex("by_org", (q) => q.eq("orgId", org._id))
      .unique();
    const hours = normalizeReminderHours(settings?.reminderHoursBefore);
    if (settings?.schemaVersion !== 2 || !hours.length)
      return { count: 0, isDone: true };
    const from = args.from ?? Date.now();
    const through =
      args.through ?? from + (Math.max(...hours) + 24) * 3_600_000;
    const page = await ctx.db
      .query("reservations")
      .withIndex("by_org_start", (q) =>
        q.eq("orgId", org._id).gte("startAt", from).lt("startAt", through),
      )
      .paginate({ cursor: args.cursor ?? null, numItems: 100 });
    let count = 0;
    for (const reservation of page.page) {
      if (
        reservation.isDeleted ||
        reservation.schemaVersion !== 2 ||
        reservation.status !== "confirmed"
      )
        continue;
      await queueReservationReminders(ctx, org, reservation);
      count++;
    }
    if (!page.isDone)
      await ctx.scheduler.runAfter(
        0,
        internal.reservationNotifications.reconcileOrg,
        { orgId: org._id, cursor: page.continueCursor, from, through },
      );
    return { count, isDone: page.isDone };
  },
});

export const reconcileAll = internalMutation({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("orgs")
      .withIndex("by_industry_created", (q) => q.eq("industry", "hospitality"))
      .paginate({ cursor: args.cursor ?? null, numItems: 50 });
    for (const org of page.page) {
      if (isHospitalityOrg(org))
        await ctx.scheduler.runAfter(
          0,
          internal.reservationNotifications.reconcileOrg,
          { orgId: org._id },
        );
    }
    if (!page.isDone)
      await ctx.scheduler.runAfter(
        0,
        internal.reservationNotifications.reconcileAll,
        { cursor: page.continueCursor },
      );
  },
});
