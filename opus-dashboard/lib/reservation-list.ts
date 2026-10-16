import type { Doc } from "@/convex/_generated/dataModel";

export type ReservationStatusFilter =
  | "all"
  | "upcoming"
  | "arrived"
  | "seated"
  | "completed"
  | "cancelled"
  | "no_show"
  | "pending";

type SearchableReservation = {
  status: Doc<"reservations">["status"];
  arrivedAt?: number;
  customerName: string;
  customerPhone?: string;
  guestErased?: boolean;
};

export function reservationStatusFilter(
  reservation: Pick<SearchableReservation, "status" | "arrivedAt">,
): Exclude<ReservationStatusFilter, "all"> {
  if (reservation.status === "confirmed") {
    // A late guest still needs an arrival action; elapsed time is not a status.
    return reservation.arrivedAt !== undefined ? "arrived" : "upcoming";
  }
  return reservation.status;
}

function normalizedSearch(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function completeMacedonianPhoneNumber(digits: string): string | undefined {
  // Only derive alternate formats from complete domestic or +389/00389 stored
  // numbers. Never remove arbitrary leading zeroes from a partial search query.
  const national = /^(?:00389|389|0)([1-9]\d{7})$/.exec(digits)?.[1];
  return national ? `389${national}` : undefined;
}

export function matchesReservationSearch(
  reservation: Pick<
    SearchableReservation,
    "customerName" | "customerPhone" | "guestErased"
  >,
  search: string,
): boolean {
  const query = normalizedSearch(search);
  if (!query) return true;
  // Never search historical identity fields on an anonymised visit, even if a
  // retained snapshot happens to contain them. Callers pass the staff projection.
  if (reservation.guestErased) return false;

  const name = normalizedSearch(reservation.customerName);
  if (query.split(/\s+/).every((token) => name.includes(token))) return true;

  const digits = query.replace(/\D/g, "");
  if (!digits || !/^[\d\s()+./-]+$/.test(query)) return false;
  const phoneDigits = normalizedSearch(reservation.customerPhone ?? "").replace(
    /\D/g,
    "",
  );
  if (phoneDigits.includes(digits)) return true;

  const fullNumber = completeMacedonianPhoneNumber(phoneDigits);
  return (
    fullNumber !== undefined &&
    [fullNumber, `00${fullNumber}`, `0${fullNumber.slice(3)}`].some((variant) =>
      variant.includes(digits),
    )
  );
}

export function filterReservations<T extends SearchableReservation>(
  reservations: readonly T[],
  { search, status }: { search: string; status: ReservationStatusFilter },
): T[] {
  return reservations.filter(
    (reservation) =>
      (status === "all" || reservationStatusFilter(reservation) === status) &&
      matchesReservationSearch(reservation, search),
  );
}

export function countReservationStatuses(
  reservations: readonly SearchableReservation[],
  search: string,
): Record<ReservationStatusFilter, number> {
  const counts: Record<ReservationStatusFilter, number> = {
    all: 0,
    upcoming: 0,
    arrived: 0,
    seated: 0,
    completed: 0,
    cancelled: 0,
    no_show: 0,
    pending: 0,
  };
  for (const reservation of reservations) {
    if (!matchesReservationSearch(reservation, search)) continue;
    counts.all += 1;
    counts[reservationStatusFilter(reservation)] += 1;
  }
  return counts;
}
