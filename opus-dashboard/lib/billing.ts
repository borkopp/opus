import { enGB, mk } from "date-fns/locale";
import type { Month } from "date-fns";

export function formatBillingDate(timestamp: number, locale: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Skopje",
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).formatToParts(timestamp);
  const value = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  // Some browsers lack Macedonian Intl data. Use the existing bundled locales.
  const language = locale.toLowerCase().startsWith("mk") ? mk : enGB;
  const month = language.localize.month((Number(value.month) - 1) as Month, {
    width: "abbreviated",
  });
  return `${value.day} ${month} ${value.year}`;
}
