import type { MobileAppointment } from "../../../shared/mobile";
import { DAY, dayOf } from "./format";
import { calendarEventBlocks } from "../../../shared/calendar";

export const HOUR_HEIGHT = 112;
export const TIMELINE_INSET = 16;
export const MIN_EVENT_HEIGHT = 48;
export const TIMELINE_HEIGHT =
  TIMELINE_INSET + 24 * HOUR_HEIGHT + MIN_EVENT_HEIGHT;
const MINUTE = 60_000;
const minutesToHeight = (minutes: number) => (minutes * HOUR_HEIGHT) / 60;

export type TimelineBlock = {
  appointment: MobileAppointment;
  top: number;
  height: number;
  lane: number;
  lanes: number;
};

// Pack connected overlaps into lanes, including the touch area of short events.
// This is display geometry only; availability is still decided by the server.
export function timelineBlocks(
  appointments: MobileAppointment[],
  day: number,
): TimelineBlock[] {
  return calendarEventBlocks(appointments, day, {
    hourHeight: HOUR_HEIGHT,
    minimumHeight: MIN_EVENT_HEIGHT,
    inset: TIMELINE_INSET,
    key: (appointment) => appointment.id,
  });
}

export function timelineScrollOffset(
  day: number,
  now: number,
  appointments: MobileAppointment[],
  viewportHeight: number,
) {
  const first = appointments
    .filter(
      (a) => a.endAt > day && a.startAt < day + DAY && a.endAt > a.startAt,
    )
    .reduce((start, a) => Math.min(start, Math.max(day, a.startAt)), Infinity);
  const minute =
    dayOf(now) === day
      ? (now - day) / MINUTE
      : Number.isFinite(first)
        ? (first - day) / MINUTE
        : 9 * 60;
  // Leave one hour of context above the time/first appointment.
  return Math.max(
    0,
    Math.min(
      TIMELINE_HEIGHT - Math.max(0, viewportHeight),
      TIMELINE_INSET + minutesToHeight(minute) - HOUR_HEIGHT,
    ),
  );
}

export function startAtFromParam(value: string | undefined, day: number) {
  if (!value?.trim()) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && dayOf(parsed) === day ? parsed : null;
}
