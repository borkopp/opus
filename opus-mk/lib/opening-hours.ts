export function isOpenNow(
  openingHours?: { dayOfWeek: number; open: string; close: string; isClosed: boolean }[],
  now: Date = new Date(),
  timezone: string = "Europe/Belgrade"
): { isOpen: boolean; closesAt?: string } {
  if (!openingHours || openingHours.length === 0) {
    return { isOpen: false };
  }

  // Get current day/time in the target timezone
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const hourPart = parts.find((p) => p.type === "hour")?.value || "00";
  const minutePart = parts.find((p) => p.type === "minute")?.value || "00";
  const currentMinutes = parseInt(hourPart, 10) * 60 + parseInt(minutePart, 10);

  // Convert JS day to ISO day (0=Mon...6=Sun) to match schema
  const jsDay = now.getDay();
  const currentDayOfWeek = jsDay === 0 ? 6 : jsDay - 1;
  const previousDayOfWeek = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;

  const getMinutesFromTime = (timeStr: string) => {
    const [h, m] = timeStr.split(":").map(Number);
    return h * 60 + m;
  };

  // Check if we are in today's opening hours
  const todaySchedule = openingHours.find((h) => h.dayOfWeek === currentDayOfWeek);
  if (todaySchedule && !todaySchedule.isClosed) {
    const openMins = getMinutesFromTime(todaySchedule.open);
    const closeMins = getMinutesFromTime(todaySchedule.close);

    if (closeMins > openMins) {
      // Normal hours (e.g. 09:00 - 17:00)
      if (currentMinutes >= openMins && currentMinutes < closeMins) {
        return { isOpen: true, closesAt: todaySchedule.close };
      }
    } else {
      // Overnight hours (e.g. 20:00 - 04:00)
      if (currentMinutes >= openMins) {
        return { isOpen: true, closesAt: todaySchedule.close };
      }
    }
  }

  // Check if we are still open from yesterday's overnight hours
  const yesterdaySchedule = openingHours.find((h) => h.dayOfWeek === previousDayOfWeek);
  if (yesterdaySchedule && !yesterdaySchedule.isClosed) {
    const openMins = getMinutesFromTime(yesterdaySchedule.open);
    const closeMins = getMinutesFromTime(yesterdaySchedule.close);

    if (closeMins < openMins) {
      // Yesterday went overnight
      if (currentMinutes < closeMins) {
        return { isOpen: true, closesAt: yesterdaySchedule.close };
      }
    }
  }

  return { isOpen: false };
}
