export function dateInTimezone(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${value.year}-${value.month}-${value.day}`;
}

export function addDays(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

const DAYS = [
  "Недела",
  "Понеделник",
  "Вторник",
  "Среда",
  "Четврток",
  "Петок",
  "Сабота",
];

const MONTHS = [
  "јануари",
  "февруари",
  "март",
  "април",
  "мај",
  "јуни",
  "јули",
  "август",
  "септември",
  "октомври",
  "ноември",
  "декември",
];

export function formatBookingTime(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function formatBookingDate(
  timestamp: number,
  locale: "mk" | "en" | "sq" = "mk",
): string {
  const date = new Date(timestamp);
  if (locale !== "mk")
    return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : locale, {
      timeZone: "UTC",
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  return `${DAYS[date.getUTCDay()]}, ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

export function formatBookingDateValue(
  date: string,
  locale: "mk" | "en" | "sq" = "mk",
): string {
  return formatBookingDate(new Date(`${date}T12:00:00Z`).getTime(), locale);
}
