import { ConvexError } from "convex/values";

const formatters = new Map<string, Intl.DateTimeFormat>();
function parts(instant: number, timezone: string) {
  let formatter = formatters.get(timezone);
  if (!formatter) {
    try {
      formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      });
    } catch {
      throw new ConvexError("Choose a valid venue timezone.");
    }
    formatters.set(timezone, formatter);
  }
  return Object.fromEntries(
    formatter.formatToParts(instant).map((p) => [p.type, p.value]),
  );
}

export function validServiceDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const instant = Date.parse(`${date}T00:00:00Z`);
  return (
    Number.isFinite(instant) &&
    new Date(instant).toISOString().slice(0, 10) === date
  );
}

export function addServiceDays(date: string, count: number) {
  if (!validServiceDate(date))
    throw new ConvexError("Choose a valid service date.");
  return new Date(Date.parse(`${date}T00:00:00Z`) + count * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

export function localDate(instant: number, timezone: string) {
  const p = parts(instant, timezone);
  return `${p.year}-${p.month}-${p.day}`;
}

/** A nonexistent local minute returns none; a repeated minute returns both UTC instants. */
export function localDateTimeInstants(
  date: string,
  time: string,
  timezone: string,
): number[] {
  if (!validServiceDate(date) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time))
    throw new ConvexError("Choose a valid local reservation time.");
  const wall = Date.parse(`${date}T${time}:00Z`);
  const offsets = new Set<number>();
  for (const hour of [-36, -12, 0, 12, 36]) {
    const sample = wall + hour * 3_600_000;
    const p = parts(sample, timezone);
    offsets.add(
      Date.parse(
        `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`,
      ) - sample,
    );
  }
  return [...offsets]
    .map((offset) => wall - offset)
    .filter((instant) => {
      const p = parts(instant, timezone);
      return (
        `${p.year}-${p.month}-${p.day}` === date &&
        `${p.hour}:${p.minute}` === time
      );
    })
    .sort((a, b) => a - b);
}

export function localTimeLabel(instant: number, timezone: string) {
  const p = parts(instant, timezone);
  const date = `${p.year}-${p.month}-${p.day}`;
  const time = `${p.hour}:${p.minute}`;
  if (localDateTimeInstants(date, time, timezone).length < 2) return time;
  const offsetMins = (Date.parse(`${date}T${time}:00Z`) - instant) / 60_000;
  return `${time} (UTC${offsetMins >= 0 ? "+" : "-"}${String(Math.floor(Math.abs(offsetMins) / 60)).padStart(2, "0")}:${String(Math.abs(offsetMins) % 60).padStart(2, "0")})`;
}
