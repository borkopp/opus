import type { Locale } from "./i18n/locale";
import type { BillingCurrency } from "../../shared/billing-currency";

export { PRO_TEAM_TIERS, proPriceMinorUnits } from "../../shared/pro-pricing";

export function formatProPrice(
  monthlyPriceMinorUnits: number,
  locale: Locale,
  currency: BillingCurrency = "mkd",
) {
  return new Intl.NumberFormat(locale === "en" ? "en-US" : "de-DE", {
    minimumFractionDigits: currency === "eur" ? 2 : 0,
    maximumFractionDigits: currency === "eur" ? 2 : 0,
  }).format(monthlyPriceMinorUnits / 100);
}

export function proPriceLabel(
  amount: number,
  locale: Locale,
  currency: BillingCurrency,
) {
  return `${formatProPrice(amount, locale, currency)} ${currency === "eur" ? "EUR" : locale === "mk" ? "ден." : locale === "sq" ? "den." : "MKD"}`;
}
