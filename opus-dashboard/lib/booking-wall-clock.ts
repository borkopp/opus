/** Booking timestamps encode the organization's wall clock in UTC fields. */
export function bookingMinuteOfDay(timestamp: number) {
  const date = new Date(timestamp);
  return date.getUTCHours() * 60 + date.getUTCMinutes();
}

export function bookingTimeLabel(timestamp: number) {
  const date = new Date(timestamp);
  return `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
}

export function bookingDateKey(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

export function dateKey(date: Date) {
  return [
    String(date.getFullYear()).padStart(4, "0"),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function dateFromKey(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;

  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    12,
  );
  return dateKey(date) === value ? date : undefined;
}

export function monthFromKey(value: string) {
  return dateFromKey(`${value}-01`) ?? new Date();
}

export function monthKey(date: Date) {
  return dateKey(date).slice(0, 7);
}

export function isBookingOnDate(timestamp: number, date: Date) {
  return bookingDateKey(timestamp) === dateKey(date);
}

export function bookingTimestampForDate(date: Date, minuteOfDay: number) {
  const hours = Math.floor(minuteOfDay / 60);
  const minutes = minuteOfDay % 60;
  return Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hours,
    minutes,
  );
}

export function bookingDateLabel(timestamp: number) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(timestamp));
}
