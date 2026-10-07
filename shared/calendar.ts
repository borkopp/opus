// Calendar dates use OPUS studio wall-clock timestamps (UTC fields), not instants.
export const CALENDAR_DAY = 86_400_000;
export type CalendarPeriod = "day" | "week" | "month";
export const calendarDay = (timestamp: number) =>
  Math.floor(timestamp / CALENDAR_DAY) * CALENDAR_DAY;
export function calendarWeekStart(day: number) {
  return (
    calendarDay(day) - ((new Date(day).getUTCDay() + 6) % 7) * CALENDAR_DAY
  );
}
export function calendarMonthStart(day: number) {
  const date = new Date(day);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
}
export function calendarDays(day: number, period: "week" | "month") {
  const start = calendarWeekStart(
    period === "month" ? calendarMonthStart(day) : day,
  );
  const date = new Date(day);
  const end =
    period === "month"
      ? Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1)
      : start + 7 * CALENDAR_DAY;
  const count = Math.ceil((end - start) / (7 * CALENDAR_DAY)) * 7;
  return Array.from(
    { length: count },
    (_, index) => start + index * CALENDAR_DAY,
  );
}
export function calendarRange(day: number, period: CalendarPeriod) {
  const days =
    period === "day" ? [calendarDay(day)] : calendarDays(day, period);
  return { startAt: days[0], endAt: days[days.length - 1] + CALENDAR_DAY };
}
export function shiftCalendarPeriod(
  day: number,
  period: CalendarPeriod,
  direction: number,
) {
  if (period !== "month")
    return day + direction * (period === "week" ? 7 : 1) * CALENDAR_DAY;
  const date = new Date(day);
  const first = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + direction, 1),
  );
  const last = new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
  ).getUTCDate();
  return Date.UTC(
    first.getUTCFullYear(),
    first.getUTCMonth(),
    Math.min(date.getUTCDate(), last),
  );
}
export function isVisibleCalendarBooking(booking: {
  status: string;
  cancellationReason?: string;
}) {
  return !(
    booking.status === "cancelled" &&
    booking.cancellationReason === "Rescheduled"
  );
}
export function calendarEventBlocks<
  T extends { startAt: number; endAt: number },
>(
  appointments: readonly T[],
  day: number,
  {
    hourHeight,
    minimumHeight,
    inset = 0,
    key,
  }: {
    hourHeight: number;
    minimumHeight: number;
    inset?: number;
    key: (item: T) => string;
  },
) {
  const events = appointments
    .filter(
      (a) =>
        Number.isFinite(a.startAt) &&
        Number.isFinite(a.endAt) &&
        a.endAt > a.startAt &&
        a.startAt < day + CALENDAR_DAY &&
        a.endAt > day,
    )
    .map((appointment) => {
      const start = Math.max(0, (appointment.startAt - day) / 60_000);
      const end = Math.min(1440, (appointment.endAt - day) / 60_000);
      const height = Math.max(
        minimumHeight,
        ((end - start) * hourHeight) / 60 - 3,
      );
      return {
        appointment,
        start,
        end: start + ((height + 3) * 60) / hourHeight,
        height,
      };
    })
    .sort(
      (a, b) =>
        a.start - b.start ||
        b.end - a.end ||
        key(a.appointment).localeCompare(key(b.appointment)),
    );
  type Block = {
    appointment: T;
    top: number;
    height: number;
    lane: number;
    lanes: number;
  };
  const blocks: Block[] = [];
  let group: Block[] = [],
    laneEnds: number[] = [];
  let groupEnd = -1;
  function finish() {
    for (const block of group) block.lanes = laneEnds.length;
    blocks.push(...group);
    group = [];
    laneEnds = [];
  }
  for (const event of events) {
    if (event.start >= groupEnd) finish();
    let lane = laneEnds.findIndex((end) => end <= event.start);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = event.end;
    groupEnd = Math.max(...laneEnds);
    group.push({
      appointment: event.appointment,
      top: inset + (event.start * hourHeight) / 60,
      height: event.height,
      lane,
      lanes: 1,
    });
  }
  finish();
  return blocks;
}
