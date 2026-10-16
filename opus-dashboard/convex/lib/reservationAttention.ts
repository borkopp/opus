import type { Doc } from "../_generated/dataModel";

const MINUTE_MS = 60_000;
const ENDING_SOON_MINS = 15;

type TimedReservation = Pick<
  Doc<"reservations">,
  "status" | "startAt" | "endAt" | "arrivedAt"
> & { schemaVersion?: number; timeModel?: string };

export type ReservationTimingAttention = {
  kind: "late_arrival" | "ending_soon" | "overdue";
  minutes: number;
};

/** Use one server timestamp for the whole projection, never a client clock. */
export function reservationTimingAttention(
  reservation: TimedReservation,
  noShowGraceMins: number | undefined,
  asOf: number,
): ReservationTimingAttention | null {
  if (
    reservation.schemaVersion !== 2 ||
    reservation.timeModel !== "utc" ||
    !Number.isFinite(reservation.startAt) ||
    !Number.isFinite(reservation.endAt) ||
    reservation.endAt <= reservation.startAt ||
    !Number.isFinite(asOf)
  )
    return null;

  // Match legacy settings validation's missing-value default. Malformed stored
  // values keep the floor's zero-grace fallback so existing visits stay readable.
  const graceMins =
    noShowGraceMins === undefined
      ? 15
      : Number.isFinite(noShowGraceMins)
        ? Math.max(0, noShowGraceMins)
        : 0;
  if (
    reservation.status === "confirmed" &&
    reservation.arrivedAt === undefined &&
    asOf >= reservation.startAt + graceMins * MINUTE_MS
  )
    return {
      kind: "late_arrival",
      minutes: Math.floor((asOf - reservation.startAt) / MINUTE_MS),
    };

  if (reservation.status !== "seated") return null;
  const remaining = reservation.endAt - asOf;
  if (remaining <= 0)
    return {
      kind: "overdue",
      minutes: Math.max(0, Math.floor(-remaining / MINUTE_MS)),
    };
  if (remaining <= ENDING_SOON_MINS * MINUTE_MS)
    return { kind: "ending_soon", minutes: Math.ceil(remaining / MINUTE_MS) };
  return null;
}

/** Elapsing the buffer permits explicit release; it never frees a table. */
export function reservationCleaningAttention(readyAt: number, asOf: number) {
  const validDeadline = Number.isFinite(readyAt) && Number.isFinite(asOf);
  return {
    canRelease: validDeadline && asOf >= readyAt,
    minutesUntilReady: validDeadline
      ? Math.max(0, Math.ceil((readyAt - asOf) / MINUTE_MS))
      : 0,
  };
}

/** Reading existing holds must survive a venue whose setup needs repair. */
export function reservationDisplayTimezone(timezone: string | undefined) {
  try {
    if (timezone) {
      new Intl.DateTimeFormat("en", { timeZone: timezone }).format(0);
      return timezone;
    }
  } catch {
    // Legacy or incomplete settings fall back to the venue's supported locale.
  }
  return "Europe/Skopje";
}
