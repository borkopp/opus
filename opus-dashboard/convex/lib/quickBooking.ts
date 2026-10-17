export type QuickBookingFreeInterval = {
  startAt: number;
  endAt: number;
};

export type QuickBookingSlot = {
  startAt: number;
  endAt: number;
  durationMins: number;
  availableDurationMins: number;
  isFallback: boolean;
};

type BuildQuickBookingSlotsArgs = {
  freeIntervals: QuickBookingFreeInterval[];
  dayStartAt: number;
  slotDurationMins: number;
  quickBookingDurationMins: number;
  bufferTimeMins: number;
  requiredDurationMins?: number;
};

function alignUp(timestamp: number, origin: number, intervalMs: number) {
  return origin + Math.ceil((timestamp - origin) / intervalMs) * intervalMs;
}

/**
 * Builds every hoverable start time inside the staff member's free windows.
 * The preferred quick-booking duration wins when it fits. At the tail of a
 * shorter gap, the organization's smallest slot duration is returned instead.
 * Once services are selected, only starts that fit their full duration remain.
 */
export function buildQuickBookingSlots({
  freeIntervals,
  dayStartAt,
  slotDurationMins,
  quickBookingDurationMins,
  bufferTimeMins,
  requiredDurationMins,
}: BuildQuickBookingSlotsArgs): QuickBookingSlot[] {
  if (
    !Number.isInteger(slotDurationMins) ||
    slotDurationMins <= 0 ||
    !Number.isInteger(quickBookingDurationMins) ||
    quickBookingDurationMins < slotDurationMins ||
    quickBookingDurationMins % slotDurationMins !== 0 ||
    !Number.isInteger(bufferTimeMins) ||
    bufferTimeMins < 0 ||
    (requiredDurationMins !== undefined &&
      (!Number.isInteger(requiredDurationMins) || requiredDurationMins <= 0))
  ) {
    return [];
  }

  const intervalMs = slotDurationMins * 60_000;
  const bufferMs = bufferTimeMins * 60_000;
  const minimumDurationMs = (requiredDurationMins ?? slotDurationMins) * 60_000;
  const results: QuickBookingSlot[] = [];

  for (const interval of freeIntervals) {
    let startAt = alignUp(interval.startAt, dayStartAt, intervalMs);

    while (startAt + minimumDurationMs + bufferMs <= interval.endAt) {
      const rawAvailableMins = Math.floor(
        (interval.endAt - startAt - bufferMs) / 60_000,
      );
      const availableDurationMins =
        Math.floor(rawAvailableMins / slotDurationMins) * slotDurationMins;
      const durationMins =
        requiredDurationMins ??
        (availableDurationMins >= quickBookingDurationMins
          ? quickBookingDurationMins
          : slotDurationMins);

      results.push({
        startAt,
        endAt: startAt + durationMins * 60_000,
        durationMins,
        availableDurationMins,
        isFallback:
          requiredDurationMins === undefined &&
          durationMins !== quickBookingDurationMins,
      });

      startAt += intervalMs;
    }
  }

  return results;
}

export function rangeFitsFreeInterval(
  freeIntervals: QuickBookingFreeInterval[],
  startAt: number,
  durationMins: number,
  bufferTimeMins: number,
) {
  const endWithBuffer = startAt + (durationMins + bufferTimeMins) * 60_000;
  return freeIntervals.some(
    (interval) =>
      interval.startAt <= startAt && interval.endAt >= endWithBuffer,
  );
}
