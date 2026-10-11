import type { Locale } from "./i18n/locale";

export { PRO_TEAM_TIERS } from "../../shared/pro-pricing";

export function formatProPrice(monthlyPriceMinorUnits: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "en" ? "en-US" : "de-DE", {
    maximumFractionDigits: 0,
  }).format(monthlyPriceMinorUnits / 100);
}
