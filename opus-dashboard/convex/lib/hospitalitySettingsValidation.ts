import { ConvexError } from "convex/values";
import type { Doc } from "../_generated/dataModel";

/** Normalize stored defaults and validate without reading data or checking authorization. */
export function validateStoredReservationSettings(
  stored: Doc<"reservation_settings"> | null,
) {
  if (!stored || stored.schemaVersion !== 2 || !stored.timezone)
    throw new ConvexError("Reservation setup is incomplete.");
  const settings = {
    ...stored,
    timezone: stored.timezone,
    bufferMins: stored.bufferMins ?? 0,
    cancellationWindowHours: stored.cancellationWindowHours ?? 24,
    noShowGraceMins: stored.noShowGraceMins ?? 15,
    servicePeriods: stored.servicePeriods ?? [],
  };
  validateReservationSettings(settings);
  return settings;
}

export type ReservationPeriod = {
  name: string;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  endDayOffset?: 0 | 1;
  lastSeatingTime?: string;
};

export type ReservationSettingsInput = {
  timezone: string;
  defaultDurationMins: number;
  minDurationMins: number;
  maxDurationMins: number;
  bufferMins: number;
  slotIntervalMins: number;
  bookingWindowDays: number;
  minAdvanceBookingHours: number;
  minPartySize: number;
  maxPartySize: number;
  cancellationWindowHours: number;
  noShowGraceMins: number;
  servicePeriods: ReservationPeriod[];
};

export function integerInRange(
  value: number,
  min: number,
  max: number,
  label: string,
) {
  if (!Number.isInteger(value) || value < min || value > max)
    throw new ConvexError(
      `${label} must be a whole number from ${min} to ${max}.`,
    );
}

export function reservationTimeMinutes(value: string): number {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value))
    throw new ConvexError(
      "Service times must use HH:mm between 00:00 and 23:59.",
    );
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

export function validateReservationSettings(
  settings: ReservationSettingsInput,
): void {
  try {
    new Intl.DateTimeFormat("en", { timeZone: settings.timezone }).format(0);
  } catch {
    throw new ConvexError(
      "Choose a valid IANA timezone, such as Europe/Skopje.",
    );
  }
  integerInRange(settings.defaultDurationMins, 1, 1440, "Dining duration");
  integerInRange(settings.minDurationMins, 1, 1440, "Minimum duration");
  integerInRange(settings.maxDurationMins, 1, 1440, "Maximum duration");
  if (
    settings.minDurationMins > settings.defaultDurationMins ||
    settings.maxDurationMins < settings.defaultDurationMins
  )
    throw new ConvexError(
      "Default duration must be between the minimum and maximum duration.",
    );
  integerInRange(settings.bufferMins, 0, 240, "Reset buffer");
  integerInRange(settings.slotIntervalMins, 5, 120, "Start interval");
  integerInRange(settings.bookingWindowDays, 1, 365, "Booking window");
  integerInRange(settings.minAdvanceBookingHours, 0, 168, "Advance notice");
  integerInRange(
    settings.cancellationWindowHours,
    0,
    168,
    "Cancellation notice",
  );
  integerInRange(settings.noShowGraceMins, 0, 240, "No-show grace period");
  integerInRange(settings.minPartySize, 1, 100, "Minimum party size");
  integerInRange(
    settings.maxPartySize,
    settings.minPartySize,
    100,
    "Maximum party size",
  );
  if (settings.servicePeriods.length > 28)
    throw new ConvexError("Use at most 28 service periods.");
  const windows: Array<{ start: number; end: number }> = [];
  for (const period of settings.servicePeriods) {
    if (!period.name.trim() || period.name.trim().length > 80)
      throw new ConvexError(
        "Each service period needs a name up to 80 characters.",
      );
    if (
      !period.daysOfWeek.length ||
      new Set(period.daysOfWeek).size !== period.daysOfWeek.length
    )
      throw new ConvexError(
        "Choose distinct weekdays for every service period.",
      );
    const start = reservationTimeMinutes(period.startTime);
    const offset = period.endDayOffset ?? 0;
    if (offset !== 0 && offset !== 1)
      throw new ConvexError("Invalid closing day.");
    const end = reservationTimeMinutes(period.endTime) + offset * 1440;
    if (end <= start || end - start > 1440)
      throw new ConvexError(
        "A service period must last between one minute and 24 hours. Select next day for overnight service.",
      );
    if (end - start < settings.defaultDurationMins + settings.bufferMins)
      throw new ConvexError(
        "Each service period must fit the dining duration and reset buffer.",
      );
    if (period.lastSeatingTime) {
      let last = reservationTimeMinutes(period.lastSeatingTime);
      if (offset && last < start) last += 1440;
      if (
        last < start ||
        last + settings.defaultDurationMins + settings.bufferMins > end
      )
        throw new ConvexError(
          "Last seating must leave room for the dining duration and reset buffer before closing.",
        );
    }
    for (const day of period.daysOfWeek) {
      integerInRange(day, 0, 6, "Service weekday");
      const window = { start: day * 1440 + start, end: day * 1440 + end };
      for (const existing of windows) {
        for (const shift of [-10080, 0, 10080]) {
          if (
            window.start < existing.end + shift &&
            window.end > existing.start + shift
          )
            throw new ConvexError(
              "Service periods must not overlap, including overnight into the following day.",
            );
        }
      }
      windows.push(window);
    }
  }
}
