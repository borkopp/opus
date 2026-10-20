export type AnalyticsFilters = {
  startMonth: string;
  endMonth: string;
  staffId: string;
  currency: string;
};

export function studioMonth(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Skopje",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  return `${parts.find((part) => part.type === "year")!.value}-${parts.find((part) => part.type === "month")!.value}`;
}

export function offsetMonth(month: string, offset: number) {
  const [year, number] = month.split("-").map(Number);
  return new Date(Date.UTC(year, number - 1 + offset, 1))
    .toISOString()
    .slice(0, 7);
}

export function validAnalyticsMonths(start: string, end: string) {
  const pattern = /^(20\d{2})-(0[1-9]|1[0-2])$/;
  if (!pattern.test(start) || !pattern.test(end)) return false;
  const monthNumber = (value: string) =>
    Number(value.slice(0, 4)) * 12 + Number(value.slice(5));
  const length = monthNumber(end) - monthNumber(start) + 1;
  return length >= 1 && length <= 12;
}

export function analyticsMonthLabel(month: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(new Date(`${month}-01T00:00:00Z`));
}

export function analyticsPeriodLabel(
  filters: Pick<AnalyticsFilters, "startMonth" | "endMonth">,
  locale: string,
) {
  if (!validAnalyticsMonths(filters.startMonth, filters.endMonth)) return "";
  const start = analyticsMonthLabel(filters.startMonth, locale);
  return filters.startMonth === filters.endMonth
    ? start
    : `${start} – ${analyticsMonthLabel(filters.endMonth, locale)}`;
}
