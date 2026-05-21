import type { OpeningHoursEntry } from '@/lib/discover/types';

/** Mirrors opus-mk `isOpenNow` (Europe/Belgrade, ISO weekday 0 = Monday). */
export function isOpenNow(
  openingHours?: OpeningHoursEntry[],
  now: Date = new Date(),
  timezone = 'Europe/Belgrade',
): boolean {
  if (!openingHours?.length) return false;

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const hourPart = parts.find((p) => p.type === 'hour')?.value ?? '00';
  const minutePart = parts.find((p) => p.type === 'minute')?.value ?? '00';
  const currentMinutes = parseInt(hourPart, 10) * 60 + parseInt(minutePart, 10);

  const jsDay = now.getDay();
  const currentDayOfWeek = jsDay === 0 ? 6 : jsDay - 1;
  const previousDayOfWeek = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;

  const getMinutesFromTime = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const todaySchedule = openingHours.find((h) => h.dayOfWeek === currentDayOfWeek);
  if (todaySchedule && !todaySchedule.isClosed) {
    const openMins = getMinutesFromTime(todaySchedule.open);
    const closeMins = getMinutesFromTime(todaySchedule.close);

    if (closeMins > openMins) {
      if (currentMinutes >= openMins && currentMinutes < closeMins) return true;
    } else if (currentMinutes >= openMins) {
      return true;
    }
  }

  const yesterdaySchedule = openingHours.find((h) => h.dayOfWeek === previousDayOfWeek);
  if (yesterdaySchedule && !yesterdaySchedule.isClosed) {
    const openMins = getMinutesFromTime(yesterdaySchedule.open);
    const closeMins = getMinutesFromTime(yesterdaySchedule.close);
    if (closeMins < openMins && currentMinutes < closeMins) return true;
  }

  return false;
}
