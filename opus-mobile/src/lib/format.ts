import { Language, localeFor } from "./theme";

export const DAY = 86_400_000;
// OPUS bookings encode studio wall-clock time in UTC fields, as the web app does.
export function studioWallClock(
  timeZone = "Europe/Skopje",
  timestamp = Date.now(),
) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(timestamp);
  const part = (key: string) =>
    Number(parts.find((p) => p.type === key)?.value);
  return Date.UTC(
    part("year"),
    part("month") - 1,
    part("day"),
    part("hour"),
    part("minute"),
    part("second"),
  );
}

export const studioToday = (timeZone = "Europe/Skopje") =>
  dayOf(studioWallClock(timeZone));

export const timeLabel = (value: number) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);

export function dateLabel(
  value: number,
  language: Language,
  options: Intl.DateTimeFormatOptions = {},
) {
  // Hermes and some browser builds omit Macedonian ICU data.
  if (language === "mk") {
    const date = new Date(value);
    const format = { day: "numeric", month: "long", ...options };
    const weekdays = [
      "Недела",
      "Понеделник",
      "Вторник",
      "Среда",
      "Четврток",
      "Петок",
      "Сабота",
    ];
    const shortDays = ["нед", "пон", "вто", "сре", "чет", "пет", "саб"];
    const months = [
      "јануари",
      "февруари",
      "март",
      "април",
      "мај",
      "јуни",
      "јули",
      "август",
      "септември",
      "октомври",
      "ноември",
      "декември",
    ];
    const shortMonths = [
      "јан",
      "фев",
      "мар",
      "апр",
      "мај",
      "јун",
      "јул",
      "авг",
      "сеп",
      "окт",
      "ное",
      "дек",
    ];
    const month =
      format.month === "numeric" || format.month === "2-digit"
        ? String(date.getUTCMonth() + 1).padStart(
            format.month === "2-digit" ? 2 : 1,
            "0",
          )
        : format.month === "short"
          ? shortMonths[date.getUTCMonth()]
          : months[date.getUTCMonth()];
    return [
      format.weekday &&
        (format.weekday === "long"
          ? weekdays[date.getUTCDay()]
          : shortDays[date.getUTCDay()]),
      format.day && String(date.getUTCDate()),
      format.month && month,
      format.year && String(date.getUTCFullYear()),
    ]
      .filter(Boolean)
      .join(" ");
  }
  return new Intl.DateTimeFormat(localeFor(language), {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    ...options,
  }).format(value);
}

export function moneyLabel(
  minorUnits: number,
  language: Language,
  currency = "MKD",
) {
  return `${numberLabel(minorUnits / 100, language)} ${currency === "MKD" && language === "mk" ? "ден." : currency}`;
}

export function numberLabel(value: number, language: Language) {
  return new Intl.NumberFormat(language === "mk" ? "de-DE" : "en-GB", {
    maximumFractionDigits: 2,
  }).format(value);
}

export function dayFromParam(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && Number.isFinite(new Date(parsed).getTime())
    ? dayOf(parsed)
    : fallback;
}

export const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
export const dayOf = (value: number) => Math.floor(value / DAY) * DAY;
