const dateTimeFormatterCache = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timezone: string) {
  const cached = dateTimeFormatterCache.get(timezone);
  if (cached) return cached;

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  dateTimeFormatterCache.set(timezone, formatter);
  return formatter;
}

function formattedWallClockTimestamp(timestamp: number, timezone: string) {
  const values = Object.fromEntries(
    formatterFor(timezone)
      .formatToParts(new Date(timestamp))
      .map((part) => [part.type, part.value]),
  );

  return Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );
}

/**
 * Booking slots are stored as UTC-shaped wall-clock values: 10:00 in Skopje is
 * represented by a Date whose UTC fields say 10:00. Convert that representation
 * to the real instant before scheduling reminders or producing calendar files.
 */
export function wallClockTimestampToInstant(
  wallClockTimestamp: number,
  timezone: string,
) {
  let instant = wallClockTimestamp;

  // Iteration handles DST offsets without relying on a runtime-specific timezone
  // offset API. Macedonia's transitions converge in one or two passes.
  for (let index = 0; index < 4; index += 1) {
    const renderedWallClock = formattedWallClockTimestamp(instant, timezone);
    const difference = wallClockTimestamp - renderedWallClock;
    instant += difference;
    if (Math.abs(difference) < 1_000) break;
  }

  return instant;
}

/** Returns "now" in the same UTC-shaped wall-clock representation as bookings. */
export function wallClockNow(timezone: string, now = Date.now()) {
  return formattedWallClockTimestamp(now, timezone);
}

export function compactWallClockDateTime(timestamp: number) {
  const date = new Date(timestamp);
  return [
    String(date.getUTCFullYear()).padStart(4, "0"),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
    "T",
    String(date.getUTCHours()).padStart(2, "0"),
    String(date.getUTCMinutes()).padStart(2, "0"),
    String(date.getUTCSeconds()).padStart(2, "0"),
  ].join("");
}

export function compactInstantDateTime(timestamp: number) {
  return new Date(timestamp)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

export function formatBookingNotificationDateTime(
  timestamp: number,
  locale = "en-GB",
) {
  const date = new Date(timestamp);
  const datePart = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(date);
  const timePart = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "UTC",
  }).format(date);
  return `${datePart} at ${timePart}`;
}
