import type { Doc } from "../_generated/dataModel";

export const DAY_MS = 86_400_000;

/** Booking dates use UTC fields to encode the studio's wall clock. */
export function overviewDayStart(wallClock: number) {
  return Math.floor(wallClock / DAY_MS) * DAY_MS;
}

export function buildOverviewRevenue(
  bookings: Pick<
    Doc<"bookings">,
    "startAt" | "status" | "isDeleted" | "currency" | "priceMinorUnits"
  >[],
  today: number,
  days: 7 | 30,
  defaultCurrency: string,
) {
  const end = today + DAY_MS;
  const start = end - days * DAY_MS;
  const previousStart = start - days * DAY_MS;
  const completed = bookings.filter(
    (b) =>
      !b.isDeleted &&
      b.status === "completed" &&
      b.startAt >= previousStart &&
      b.startAt < end,
  );
  const currencies = new Set(completed.map((b) => b.currency.toUpperCase()));
  const currency =
    currencies.size > 1
      ? null
      : ([...currencies][0] ?? defaultCurrency.toUpperCase());
  const current = completed.filter((b) => b.startAt >= start);
  const previous = completed.filter((b) => b.startAt < start);
  const total = (items: typeof completed) =>
    items.reduce((sum, b) => sum + b.priceMinorUnits, 0);
  const totalMinor = currency ? total(current) : null;
  const previousMinor = currency ? total(previous) : null;
  // Seven buckets keep the reference chart readable. For 30 days each bucket
  // covers a consecutive, non-overlapping group of four or five calendar days.
  const buckets = Array.from({ length: 7 }, (_, index) => {
    const bucketStart = start + Math.floor((index * days) / 7) * DAY_MS;
    const bucketEnd = start + Math.floor(((index + 1) * days) / 7) * DAY_MS;
    return {
      startAt: bucketStart,
      endAt: bucketEnd,
      valueMinor: currency
        ? total(
            current.filter(
              (b) => b.startAt >= bucketStart && b.startAt < bucketEnd,
            ),
          )
        : null,
    };
  });
  return {
    days,
    currency,
    totalMinor,
    previousMinor,
    changePct:
      totalMinor !== null && previousMinor !== null && previousMinor > 0
        ? ((totalMinor - previousMinor) / previousMinor) * 100
        : null,
    buckets,
  };
}
