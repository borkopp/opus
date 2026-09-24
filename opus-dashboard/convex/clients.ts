import { ConvexError, v } from "convex/values";
import { query, type QueryCtx } from "./_generated/server";
import { requirePaidPlan, requireRole } from "./lib/auth";
import { isActiveIndustry } from "./lib/productScope";
import { wallClockNow } from "./lib/bookingTime";
import {
  buildClientRecords,
  clientRecord,
  selectClients,
  type ClientProfile,
} from "./lib/clientDirectory";

async function clientAccess(ctx: QueryCtx) {
  const auth = await requireRole(ctx, undefined, "staff");
  requirePaidPlan(auth.org, "Client directory");
  if (!isActiveIndustry(auth.org.industry))
    throw new ConvexError("Clients are available for beauty studios.");
  const settings = await ctx.db
    .query("org_settings")
    .withIndex("by_org", (q) => q.eq("orgId", auth.orgId))
    .first();
  return { ...auth, now: wallClockNow(settings?.timezone ?? "Europe/Skopje") };
}

export const getDirectory = query({
  args: {
    search: v.string(),
    segment: v.union(
      v.literal("all"),
      v.literal("returning"),
      v.literal("unvisited"),
    ),
    sort: v.union(v.literal("recent"), v.literal("visits"), v.literal("name")),
    page: v.number(),
  },
  handler: async (ctx, args) => {
    const { orgId, now } = await clientAccess(ctx);
    if (
      args.search.length > 150 ||
      !Number.isInteger(args.page) ||
      args.page < 0
    )
      throw new ConvexError("Invalid client search.");
    const [customers, completed] = await Promise.all([
      ctx.db
        .query("customers")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .collect(),
      ctx.db
        .query("bookings")
        .withIndex("by_org_status", (q) =>
          q.eq("orgId", orgId).eq("status", "completed"),
        )
        .collect(),
    ]);
    // Legacy customer counters count some bookings at creation. Build visit
    // statistics from completed appointments instead of those counters.
    return selectClients(buildClientRecords(customers, completed, now), args);
  },
});

export const getProfile = query({
  args: { customerId: v.id("customers") },
  handler: async (ctx, { customerId }): Promise<ClientProfile | null> => {
    const { orgId, now } = await clientAccess(ctx);
    const customer = await ctx.db.get(customerId);
    if (!customer || customer.orgId !== orgId || customer.isDeleted)
      return null;
    const [bookings, services, staff] = await Promise.all([
      ctx.db
        .query("bookings")
        .withIndex("by_org_customer_start", (q) =>
          q.eq("orgId", orgId).eq("customerId", customerId),
        )
        .order("desc")
        .collect(),
      ctx.db
        .query("services")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .collect(),
      ctx.db
        .query("staff_members")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .collect(),
    ]);
    const serviceNames = new Map(
      services.map((service) => [service._id, service.name]),
    );
    const staffNames = new Map(
      staff.map((member) => [member._id, member.displayName]),
    );
    const active = bookings.filter((booking) => !booking.isDeleted);
    const favourites = new Map<string, number>();
    const appointments = active.map((booking) => {
      const names = [...new Set(booking.serviceIds ?? [booking.serviceId])]
        .map((id) => serviceNames.get(id))
        .filter((name): name is string => Boolean(name));
      if (booking.status === "completed" && booking.startAt <= now)
        for (const name of names)
          favourites.set(name, (favourites.get(name) ?? 0) + 1);
      return {
        id: booking._id,
        startAt: booking.startAt,
        endAt: booking.endAt,
        status: booking.status,
        services: names,
        staffName: staffNames.get(booking.staffId) ?? "",
        priceMinorUnits: booking.priceMinorUnits,
        currency: booking.currency,
      };
    });
    const isUpcoming = (booking: (typeof appointments)[number]) =>
      booking.startAt >= now &&
      ["confirmed", "checked_in"].includes(booking.status);
    return {
      client: clientRecord(customer, active, now),
      upcoming: appointments
        .filter(isUpcoming)
        .sort((a, b) => a.startAt - b.startAt),
      history: appointments.filter((booking) => !isUpcoming(booking)),
      cancelled: active.filter((booking) => booking.status === "cancelled")
        .length,
      noShows: active.filter((booking) => booking.status === "no_show").length,
      favouriteService:
        [...favourites].sort(
          ([a, countA], [b, countB]) => countB - countA || a.localeCompare(b),
        )[0]?.[0] ?? null,
    };
  },
});
