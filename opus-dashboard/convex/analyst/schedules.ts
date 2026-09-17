import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { wallClockNow } from "../lib/bookingTime";
import type { Schedule } from "./contracts";

export async function readSchedule(ctx: QueryCtx, orgId: Id<"orgs">) {
  const [staff, rules, overrides] = await Promise.all([
    ctx.db
      .query("staff_members")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .take(201),
    ctx.db
      .query("availability_rules")
      .withIndex("by_org_active", (q) =>
        q.eq("orgId", orgId).eq("isActive", true).eq("isDeleted", false),
      )
      .take(1501),
    ctx.db
      .query("availability_overrides")
      .withIndex("by_org_active", (q) =>
        q.eq("orgId", orgId).eq("isDeleted", false),
      )
      .take(2001),
  ]);
  const complete =
    staff.length <= 200 && rules.length <= 1500 && overrides.length <= 2000;
  const schedule: Schedule = {
    staff: staff.map((s) => ({
      id: s._id,
      active: s.isActive && !s.isDeleted,
    })),
    rules: rules.map((r) => ({
      staffId: r.staffId,
      dayOfWeek: r.dayOfWeek,
      startTime: r.startTime,
      endTime: r.endTime,
      breaks: r.breaks ?? [],
    })),
    overrides: overrides.map((o) => ({
      staffId: o.staffId,
      date: o.date,
      type: o.type,
      startTime: o.startTime ?? null,
      endTime: o.endTime ?? null,
    })),
  };
  return { complete, schedule };
}

export async function recordScheduleVersion(
  ctx: MutationCtx,
  orgId: Id<"orgs">,
) {
  const settings = await ctx.db
    .query("org_settings")
    .withIndex("by_org", (q) => q.eq("orgId", orgId))
    .first();
  const now = Date.now();
  const snapshot = await readSchedule(ctx, orgId);
  const latest = await ctx.db
    .query("analyst_schedule_versions")
    .withIndex("by_org_effective", (q) => q.eq("orgId", orgId))
    .order("desc")
    .first();
  if (
    latest &&
    latest.complete === snapshot.complete &&
    JSON.stringify(latest.schedule) === JSON.stringify(snapshot.schedule)
  )
    return;
  await ctx.db.insert("analyst_schedule_versions", {
    orgId,
    recordedAt: now,
    effectiveFrom: wallClockNow(settings?.timezone ?? "Europe/Skopje", now),
    ...snapshot,
  });
}

export async function ensureScheduleBaseline(
  ctx: MutationCtx,
  orgId: Id<"orgs">,
) {
  const existing = await ctx.db
    .query("analyst_schedule_versions")
    .withIndex("by_org", (q) => q.eq("orgId", orgId))
    .first();
  if (!existing) await recordScheduleVersion(ctx, orgId);
}

type Interval = [number, number];
function minute(value: string | null) {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return null;
  const [h, m] = value.split(":").map(Number);
  return h < 24 && m < 60 ? h * 60 + m : null;
}
function interval(start: string | null, end: string | null): Interval | null {
  const a = minute(start),
    b = minute(end);
  return a !== null && b !== null && b > a ? [a, b] : null;
}
function union(intervals: Interval[]) {
  const result: Interval[] = [];
  for (const current of intervals.sort((a, b) => a[0] - b[0])) {
    const last = result[result.length - 1];
    if (last && current[0] <= last[1]) last[1] = Math.max(last[1], current[1]);
    else result.push([...current]);
  }
  return result;
}

/** Actual staff minutes, with overlapping rules/breaks counted only once. */
export function availableMinutes(
  schedule: Schedule,
  staffId: string,
  date: string,
  weekday: number,
): number | null {
  if (!schedule.staff.some((s) => s.id === staffId && s.active)) return 0;
  const override = schedule.overrides.find(
    (o) => o.staffId === staffId && o.date === date,
  );
  if (override?.type === "day_off") return 0;
  if (override?.type === "custom_hours") {
    const hours = interval(override.startTime, override.endTime);
    return hours ? hours[1] - hours[0] : null;
  }
  const rules = schedule.rules.filter(
    (r) => r.staffId === staffId && r.dayOfWeek === weekday,
  );
  const working: Interval[] = [];
  for (const rule of rules) {
    const hours = interval(rule.startTime, rule.endTime);
    if (!hours) return null;
    let portions: Interval[] = [hours];
    for (const pause of rule.breaks) {
      const cut = interval(pause.startTime, pause.endTime);
      if (!cut) return null;
      portions = portions.flatMap(([a, b]): Interval[] =>
        cut[1] <= a || cut[0] >= b
          ? [[a, b]]
          : ([
              [a, Math.max(a, cut[0])],
              [Math.min(b, cut[1]), b],
            ].filter(([s, e]) => e > s) as Interval[]),
      );
    }
    working.push(...portions);
  }
  return union(working).reduce((sum, [a, b]) => sum + b - a, 0);
}
