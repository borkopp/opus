const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function dateInTimezone(timestamp: number, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function isCalendarDate(date: string): boolean {
  if (!DATE_PATTERN.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date
  );
}

export function isWithinPublicBookingWindow(
  date: string,
  timezone: string,
  bookingWindowDays: number,
  now = Date.now(),
): boolean {
  if (!isCalendarDate(date)) return false;

  const today = dateInTimezone(now, timezone);
  const windowDays = Math.max(1, Math.floor(bookingWindowDays));
  const lastBookableDate = addDays(today, windowDays - 1);
  return date >= today && date <= lastBookableDate;
}
