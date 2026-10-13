import { ConvexError } from "convex/values";

/** Reservation v2 timestamps are actual instants, unlike legacy beauty wall clocks. */
export function reservationDateTime(
  startAt: number,
  timezone: string,
  locale = "en",
) {
  return new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "shortOffset",
  }).format(startAt);
}

export function reservationTime(
  startAt: number,
  timezone: string,
  locale = "en",
) {
  return new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(startAt);
}

export function reservationLocalDate(timezone: string, instant = Date.now()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const value = (type: string) =>
    parts.find((part) => part.type === type)!.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function earliestReservationServiceDate(timezone: string) {
  const today = reservationLocalDate(timezone);
  return new Date(Date.parse(`${today}T00:00:00Z`) - 86_400_000)
    .toISOString()
    .slice(0, 10);
}

/** Only public selection values may travel through a sign-in redirect. */
export function reservationPath(
  slug: string,
  selection: {
    date?: string;
    partySize?: number;
    startAt?: number;
  } = {},
) {
  const query = new URLSearchParams();
  if (selection.date && /^\d{4}-\d{2}-\d{2}$/.test(selection.date))
    query.set("date", selection.date);
  if (Number.isSafeInteger(selection.partySize) && selection.partySize! > 0)
    query.set("partySize", String(selection.partySize));
  if (Number.isSafeInteger(selection.startAt) && selection.startAt! > 0)
    query.set("at", String(selection.startAt));
  return `/reserve/${encodeURIComponent(slug)}${query.size ? `?${query}` : ""}`;
}

export function reservationError(error: unknown) {
  if (error instanceof ConvexError && typeof error.data === "string")
    return error.data;
  return "We could not complete that request. Please try again.";
}
