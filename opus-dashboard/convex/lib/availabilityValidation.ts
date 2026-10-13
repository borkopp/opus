import { ConvexError } from "convex/values";

function minutes(value: string) {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value) && value !== "24:00") {
    throw new ConvexError("Use HH:MM for working hours.");
  }
  const [hours, mins] = value.split(":").map(Number);
  return hours * 60 + mins;
}

export function assertWorkingHours(
  startTime: string,
  endTime: string,
  breaks: { startTime: string; endTime: string }[] = [],
) {
  const start = minutes(startTime);
  const end = minutes(endTime);
  if (start >= end || start === 1_440) {
    throw new ConvexError("Working hours must end after they start.");
  }
  if (breaks.length > 20) throw new ConvexError("Too many breaks.");
  let previousEnd = start;
  for (const pause of [...breaks].sort((a, b) =>
    a.startTime.localeCompare(b.startTime),
  )) {
    const from = minutes(pause.startTime);
    const to = minutes(pause.endTime);
    if (from < previousEnd || to > end || from >= to) {
      throw new ConvexError(
        "Breaks must fit within working hours and must not overlap.",
      );
    }
    previousEnd = to;
  }
}

export function assertAvailabilityDate(date: string) {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date
  ) {
    throw new ConvexError("Enter a valid availability date.");
  }
}
