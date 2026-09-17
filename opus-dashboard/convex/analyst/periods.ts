import { ConvexError } from "convex/values";
import { wallClockNow } from "../lib/bookingTime";
import type { AnalysisRequest } from "./contracts";
import { ANALYST_LIMITS } from "./limits";

export const DAY_MS = 86_400_000;
export function dateKey(ms: number) {
  return new Date(ms).toISOString().slice(0, 10);
}

export function parseDate(value: string | null): number {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new ConvexError("ANALYST_INVALID_PERIOD");
  const ms = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(ms) || dateKey(ms) !== value)
    throw new ConvexError("ANALYST_INVALID_PERIOD");
  return ms;
}

export function resolvePeriod(
  period: AnalysisRequest["period"],
  timezone: string,
  now: number,
) {
  // Bookings use UTC-shaped local wall-clock timestamps, not UTC instants.
  const localNow = wallClockNow(timezone, now);
  const today = Math.floor(localNow / DAY_MS) * DAY_MS;
  const date = new Date(today);
  const month = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
  const week = today - ((date.getUTCDay() + 6) % 7) * DAY_MS;
  let startMs: number;
  let endMs: number;
  switch (period.preset) {
    case "this_month":
      startMs = month;
      endMs = today + DAY_MS;
      break;
    case "last_month":
      startMs = Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1);
      endMs = month;
      break;
    case "this_week":
      startMs = week;
      endMs = today + DAY_MS;
      break;
    case "last_week":
      startMs = week - 7 * DAY_MS;
      endMs = week;
      break;
    case "last_90_days":
      startMs = today - 90 * DAY_MS;
      endMs = today;
      break;
    case "next_week":
      startMs = week + 7 * DAY_MS;
      endMs = week + 14 * DAY_MS;
      break;
    case "custom":
      startMs = parseDate(period.startDate);
      endMs = parseDate(period.endDate) + DAY_MS;
      break;
  }
  if (
    endMs <= startMs ||
    endMs - startMs > ANALYST_LIMITS.maxRangeDays * DAY_MS ||
    startMs < Date.UTC(2000, 0, 1) ||
    endMs > today + 91 * DAY_MS
  ) {
    throw new ConvexError("ANALYST_INVALID_PERIOD");
  }
  return { startMs, endMs, localNow };
}

export function comparisonPeriod(
  startMs: number,
  endMs: number,
  comparison: AnalysisRequest["comparison"],
  preset?: AnalysisRequest["period"]["preset"],
) {
  if (!comparison) return null;
  if (comparison === "previous_period") {
    const start = new Date(startMs),
      end = new Date(endMs);
    if (preset === "this_month") {
      const previousStart = Date.UTC(
        start.getUTCFullYear(),
        start.getUTCMonth() - 1,
        1,
      );
      return {
        startMs: previousStart,
        endMs: Math.min(startMs, previousStart + endMs - startMs),
      };
    }
    if (preset === "this_week")
      return { startMs: startMs - 7 * DAY_MS, endMs: endMs - 7 * DAY_MS };
    // A whole calendar month compares to the preceding calendar month.
    if (
      start.getUTCDate() === 1 &&
      end.getUTCDate() === 1 &&
      endMs === Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1)
    ) {
      return {
        startMs: Date.UTC(start.getUTCFullYear(), start.getUTCMonth() - 1, 1),
        endMs: startMs,
      };
    }
    return { startMs: startMs - (endMs - startMs), endMs: startMs };
  }
  const shift = (ms: number) => {
    const date = new Date(ms);
    const year = date.getUTCFullYear() - 1;
    const day = Math.min(
      date.getUTCDate(),
      new Date(Date.UTC(year, date.getUTCMonth() + 1, 0)).getUTCDate(),
    );
    return Date.UTC(year, date.getUTCMonth(), day);
  };
  return { startMs: shift(startMs), endMs: shift(endMs) };
}
