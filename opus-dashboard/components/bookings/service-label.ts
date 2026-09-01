import type { BookingView } from "./types";

export function bookingServiceLabel(booking: BookingView) {
  const names = booking.services
    ?.map((service) => service.name)
    .filter(Boolean);
  if (names?.length) return names.join(" + ");
  return booking.service?.name || "Service";
}
