import { query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { requireAuth } from "./lib/auth";
import { wallClockNow } from "./lib/bookingTime";
import {
  buildOverviewRevenue,
  overviewDayStart,
  DAY_MS,
} from "./lib/overviewMetrics";

/** Clarity overview. Tenant identity and studio time are resolved on the server. */
export const getOverview = query({
  args: {
    date: v.optional(v.string()),
    days: v.union(v.literal(7), v.literal(30)),
    refreshMinute: v.number(),
  },
  handler: async (ctx, args) => {
    const { orgId, org } = await requireAuth(ctx);
    const settings = await ctx.db
      .query("org_settings")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .first();
    const now = wallClockNow(settings?.timezone || "Europe/Skopje");
    const today = overviewDayStart(now);
    const selected = args.date
      ? Date.parse(`${args.date}T00:00:00.000Z`)
      : today;
    if (
      !Number.isFinite(selected) ||
      (args.date &&
        (!/^\d{4}-\d{2}-\d{2}$/.test(args.date) ||
          new Date(selected).toISOString().slice(0, 10) !== args.date))
    )
      throw new ConvexError("Invalid appointment date");
    const start = today + DAY_MS - args.days * 2 * DAY_MS;
    const end = today + DAY_MS;
    const [bookings, selectedBookings, staff] = await Promise.all([
      ctx.db
        .query("bookings")
        .withIndex("by_org_start", (q) =>
          q.eq("orgId", orgId).gte("startAt", start).lt("startAt", end),
        )
        .collect(),
      selected >= start && selected < end
        ? null
        : ctx.db
            .query("bookings")
            .withIndex("by_org_start", (q) =>
              q
                .eq("orgId", orgId)
                .gte("startAt", selected)
                .lt("startAt", selected + DAY_MS),
            )
            .collect(),
      ctx.db
        .query("staff_members")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .collect(),
    ]);
    const isActive = (b: (typeof bookings)[number]) =>
      !b.isDeleted &&
      ["confirmed", "checked_in", "completed"].includes(b.status);
    const active = bookings.filter(isActive);
    const onDate = (selectedBookings ?? bookings).filter(
      (b) =>
        isActive(b) && b.startAt >= selected && b.startAt < selected + DAY_MS,
    );
    const next = active
      .filter(
        (b) => b.status !== "completed" && b.startAt >= today && b.endAt > now,
      )
      .sort((a, b) => a.startAt - b.startAt)[0];
    const populate = async (b: (typeof bookings)[number]) => {
      const [customer, member, services] = await Promise.all([
        ctx.db.get(b.customerId),
        ctx.db.get(b.staffId),
        Promise.all(
          [...new Set(b.serviceIds?.length ? b.serviceIds : [b.serviceId])].map(
            (id) => ctx.db.get(id),
          ),
        ),
      ]);
      // Never expose a related record if a historical reference points outside
      // this tenant. Soft-deleted names remain useful for historical bookings.
      return {
        id: b._id,
        staffId: b.staffId,
        startAt: b.startAt,
        endAt: b.endAt,
        status: b.status,
        priceMinorUnits: b.priceMinorUnits,
        currency: b.currency,
        customerName: customer?.orgId === orgId ? customer.name : "—",
        staffName: member?.orgId === orgId ? member.displayName : "—",
        serviceName: services
          .map((service) => (service?.orgId === orgId ? service.name : "—"))
          .join(" + "),
        notes: b.customerNote ?? null,
      };
    };
    return {
      orgName: org.name,
      today,
      now,
      selected,
      todayCount: active.filter((b) => b.startAt >= today && b.startAt < end)
        .length,
      staff: staff
        .filter((s) => !s.isDeleted && s.isActive)
        .map((s) => ({
          id: s._id,
          name: s.displayName,
          role: s.role,
          todayCount: active.filter(
            (b) => b.staffId === s._id && b.startAt >= today && b.startAt < end,
          ).length,
        })),
      schedule: await Promise.all(
        onDate.sort((a, b) => a.startAt - b.startAt).map(populate),
      ),
      next: next ? await populate(next) : null,
      revenue: buildOverviewRevenue(
        bookings,
        today,
        args.days,
        settings?.currency ?? "MKD",
      ),
    };
  },
});
