import { ConvexError } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import type { AnalysisRequest } from "./contracts";
import type { AnalyticsData } from "./metrics";
import { ANALYST_LIMITS } from "./limits";
import { DAY_MS } from "./periods";
import { readSchedule } from "./schedules";

/** Bounded tenant reads shared by chat and the dashboard capacity widget. */
export async function loadAnalyticsData(
  ctx: QueryCtx,
  orgId: Id<"orgs">,
  request: AnalysisRequest,
  range: { startMs: number; endMs: number; localNow: number },
  previous: { startMs: number; endMs: number } | null,
): Promise<AnalyticsData> {
  const firstDay = Math.min(range.startMs, previous?.startMs ?? Infinity);
  const ranges = previous ? [range, previous] : [range];
  const [
    periodBookings,
    staff,
    services,
    currentSchedule,
    baseline,
    versions,
    visits,
  ] = await Promise.all([
    Promise.all(
      ranges.map((r) =>
        ctx.db
          .query("bookings")
          .withIndex("by_org_start", (q) =>
            q
              .eq("orgId", orgId)
              .gte("startAt", r.startMs)
              .lt("startAt", r.endMs),
          )
          .take(ANALYST_LIMITS.maxBookings + 1),
      ),
    ),
    ctx.db
      .query("staff_members")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .take(201),
    ctx.db
      .query("services")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .take(301),
    readSchedule(ctx, orgId),
    ctx.db
      .query("analyst_schedule_versions")
      .withIndex("by_org_effective", (q) =>
        q.eq("orgId", orgId).lte("effectiveFrom", firstDay),
      )
      .order("desc")
      .first(),
    ctx.db
      .query("analyst_schedule_versions")
      .withIndex("by_org_effective", (q) =>
        q
          .eq("orgId", orgId)
          .gt("effectiveFrom", firstDay)
          .lt("effectiveFrom", range.endMs + DAY_MS),
      )
      .take(2001),
    ["returning_client_share", "returning_clients"].includes(request.metric)
      ? ctx.db
          .query("bookings")
          .withIndex("by_org_status", (q) =>
            q.eq("orgId", orgId).eq("status", "completed"),
          )
          .take(ANALYST_LIMITS.maxBookings + 1)
      : null,
  ]);
  if (
    periodBookings.some((b) => b.length > ANALYST_LIMITS.maxBookings) ||
    (visits?.length ?? 0) > ANALYST_LIMITS.maxBookings ||
    staff.length > 200 ||
    services.length > 300 ||
    versions.length > 2000
  )
    throw new ConvexError("ANALYST_RANGE_TOO_LARGE");
  const firstVisits = visits ? new Map<string, number>() : null;
  for (const booking of visits ?? []) {
    if (booking.isDeleted || booking.startAt >= range.localNow) continue;
    firstVisits!.set(
      booking.customerId,
      Math.min(
        firstVisits!.get(booking.customerId) ?? Infinity,
        booking.startAt,
      ),
    );
  }
  return {
    bookings: [
      ...new Map(periodBookings.flat().map((b) => [b._id, b])).values(),
    ],
    staff,
    services,
    firstVisits,
    currentSchedule,
    schedules: baseline ? [baseline, ...versions] : versions,
  };
}
