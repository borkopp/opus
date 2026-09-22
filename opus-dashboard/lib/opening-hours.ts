export interface OpeningHour {
  dayOfWeek: number;
  open: string;
  close: string;
  isClosed: boolean;
}

export function applyHoursToOpenDays(
  hours: OpeningHour[],
  source: OpeningHour,
): OpeningHour[] {
  return hours.map((day) =>
    day.isClosed ? day : { ...day, open: source.open, close: source.close },
  );
}
