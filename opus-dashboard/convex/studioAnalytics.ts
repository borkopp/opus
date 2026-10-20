import { ConvexError, v } from "convex/values";
import { action, query } from "./_generated/server";
import { api } from "./_generated/api";
import { requirePaidPlan, requireRole } from "./lib/auth";
import { isActiveIndustry } from "./lib/productScope";
import { wallClockNow } from "./lib/bookingTime";
import { analyticsPeriods, buildStudioAnalytics } from "./lib/studioAnalytics";
import type { StudioAnalytics } from "../lib/studio-analytics";

const MAX_BOOKINGS = 10_000;
const MAX_CUSTOMERS = 5_000;
const analyticsArgs = {
  startMonth: v.string(),
  endMonth: v.string(),
  staffId: v.optional(v.id("staff_members")),
  currency: v.optional(v.string()),
};

/** Live dashboard data; report exports use getReport for a fresh server read. */
export const getDashboard = query({
  args: analyticsArgs,
  handler: async (ctx, args): Promise<StudioAnalytics> => {
    const { orgId, org } = await requireRole(ctx, undefined, "staff");
    requirePaidPlan(org, "Client directory");
    if (!isActiveIndustry(org.industry))
      throw new ConvexError("Analytics are available for beauty studios.");
    const periods = analyticsPeriods(args.startMonth, args.endMonth);
    const [settings, staff, services, customers, bookings, completedHistory] =
      await Promise.all([
        ctx.db
          .query("org_settings")
          .withIndex("by_org", (q) => q.eq("orgId", orgId))
          .first(),
        ctx.db
          .query("staff_members")
          .withIndex("by_org", (q) => q.eq("orgId", orgId))
          .take(201),
        ctx.db
          .query("services")
          .withIndex("by_org", (q) => q.eq("orgId", orgId))
          .take(501),
        ctx.db
          .query("customers")
          .withIndex("by_org", (q) => q.eq("orgId", orgId))
          .take(MAX_CUSTOMERS + 1),
        ctx.db
          .query("bookings")
          .withIndex("by_org_start", (q) =>
            q
              .eq("orgId", orgId)
              .gte("startAt", periods.previous.startMs)
              .lt("startAt", periods.period.endMs),
          )
          .take(MAX_BOOKINGS + 1),
        ctx.db
          .query("bookings")
          .withIndex("by_org_status", (q) =>
            q.eq("orgId", orgId).eq("status", "completed"),
          )
          .take(MAX_BOOKINGS + 1),
      ]);
    // Never silently truncate a financial or client report.
    if (
      bookings.length > MAX_BOOKINGS ||
      completedHistory.length > MAX_BOOKINGS ||
      customers.length > MAX_CUSTOMERS ||
      staff.length > 200 ||
      services.length > 500
    )
      throw new ConvexError(
        "This studio has more data than this report can safely include. Contact support for a full report.",
      );
    if (
      args.staffId &&
      !staff.some((member) => member._id === args.staffId && !member.isDeleted)
    )
      throw new ConvexError("Choose a staff member from this studio.");
    const timezone = settings?.timezone ?? "Europe/Skopje";
    const generatedAt = Date.now();
    return buildStudioAnalytics({
      studioName: org.name,
      timezone,
      generatedAt,
      localNow: wallClockNow(timezone, generatedAt),
      defaultCurrency: settings?.currency ?? "MKD",
      currency: args.currency,
      staffId: args.staffId,
      periods,
      staff,
      services,
      customers,
      bookings,
      completedHistory,
    });
  },
});

/** Actions bypass subscribed client query snapshots, so every export checks the
 * current membership and plan and reads a complete, current report on the server. */
export const getReport = action({
  args: analyticsArgs,
  handler: async (ctx, args): Promise<StudioAnalytics> =>
    ctx.runQuery(api.studioAnalytics.getDashboard, args),
});
