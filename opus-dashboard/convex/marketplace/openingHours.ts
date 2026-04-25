// Heuristic open/closed checker for orgs.openingHours.
//
// IMPORTANT: orgs.openingHours.dayOfWeek follows the ISO convention
// (0 = Mon … 6 = Sun) per the schema comment in schema.ts:90.
// JavaScript's Date.getDay() returns the JS convention (0 = Sun … 6 = Sat).
// We convert here once. Cross-wiring to availability_rules.dayOfWeek
// (which uses JS convention) will silently mark shops closed on the wrong day.

import { Doc } from "../_generated/dataModel";

const SKOPJE_TZ = "Europe/Skopje";

type OpeningHour = {
  dayOfWeek: number; // 0 = Mon … 6 = Sun (ISO)
  open: string; // "HH:MM"
  close: string; // "HH:MM"
  isClosed: boolean;
};

// Returns the ISO day-of-week (0=Mon … 6=Sun) for a given timestamp
// in Europe/Skopje local time.
function isoDayOfWeekInSkopje(ts: number): number {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: SKOPJE_TZ,
    weekday: "short",
  });
  const short = fmt.format(new Date(ts)); // "Mon", "Tue", ...
  const map: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  return map[short] ?? 0;
}

// Returns minutes-since-midnight in Europe/Skopje local time.
function minutesInSkopje(ts: number): number {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: SKOPJE_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = fmt.formatToParts(new Date(ts));
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return h * 60 + m;
}

function parseHHMM(s: string): number {
  const [h, m] = s.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function findRule(
  hours: OpeningHour[] | undefined,
  isoDay: number,
): OpeningHour | undefined {
  if (!hours) return undefined;
  return hours.find((h) => h.dayOfWeek === isoDay);
}

export function isOpenAt(
  org: Pick<Doc<"orgs">, "openingHours">,
  ts: number,
): boolean {
  const day = isoDayOfWeekInSkopje(ts);
  const rule = findRule(org.openingHours, day);
  if (!rule || rule.isClosed) return false;

  const mins = minutesInSkopje(ts);
  const open = parseHHMM(rule.open);
  const close = parseHHMM(rule.close);

  // Handle past-midnight close (e.g. open 18:00, close 02:00).
  if (close > open) {
    return mins >= open && mins < close;
  }
  return mins >= open || mins < close;
}

export function isOpenNow(org: Pick<Doc<"orgs">, "openingHours">): boolean {
  return isOpenAt(org, Date.now());
}

// Today's opening hours as a display-ready { open, close } pair.
// Returns undefined if closed today or no hours configured.
export function openingHoursToday(
  org: Pick<Doc<"orgs">, "openingHours">,
  now: number = Date.now(),
): { open: string; close: string } | undefined {
  const day = isoDayOfWeekInSkopje(now);
  const rule = findRule(org.openingHours, day);
  if (!rule || rule.isClosed) return undefined;
  return { open: rule.open, close: rule.close };
}
