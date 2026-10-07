import { bookingDateKey } from "./booking-wall-clock";
import { isVisibleCalendarBooking } from "../../shared/calendar";
export { isVisibleCalendarBooking } from "../../shared/calendar";

type CalendarBooking = {
  startAt: number;
  status: string;
  cancellationReason?: string;
};

export function getBookingDateCounts(bookings: readonly CalendarBooking[]) {
  const counts = new Map<string, number>();
  for (const booking of bookings) {
    if (!isVisibleCalendarBooking(booking)) continue;
    // Use studio wall-clock fields, not the browser's timezone.
    const key = bookingDateKey(booking.startAt);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}
