export const SUBSCRIPTION_TRIAL_MONTHS = 2;

/** Add calendar months in UTC, clamping the day to the destination month. */
export function addUtcCalendarMonths(
  timestamp: number,
  months: number,
): number {
  if (!Number.isFinite(timestamp) || !Number.isInteger(months) || months < 0) {
    throw new Error("Invalid subscription trial date");
  }
  const original = new Date(timestamp);
  if (Number.isNaN(original.getTime())) {
    throw new Error("Invalid subscription trial date");
  }
  const result = new Date(timestamp);
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const monthEnd = new Date(result.getTime());
  monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1, 0);
  result.setUTCDate(Math.min(original.getUTCDate(), monthEnd.getUTCDate()));
  if (Number.isNaN(result.getTime())) {
    throw new Error("Invalid subscription trial date");
  }
  return result.getTime();
}

export function createSubscriptionTrial(startedAt: number) {
  return {
    startedAt,
    endsAt: addUtcCalendarMonths(startedAt, SUBSCRIPTION_TRIAL_MONTHS),
  };
}
