export const BILLING_CURRENCIES = ["mkd", "eur"] as const;
export type BillingCurrency = (typeof BILLING_CURRENCIES)[number];
export const BILLING_CURRENCY_COOKIE = "opus-billing-currency";

export function parseBillingCurrency(
  value: unknown,
): BillingCurrency | undefined {
  return value === "mkd" || value === "eur" ? value : undefined;
}

// Countries using EUR. Other locations and missing geolocation default to MKD.
const euroCountries = new Set([
  "AD",
  "AT",
  "BE",
  "BG",
  "CY",
  "DE",
  "EE",
  "ES",
  "FI",
  "FR",
  "GR",
  "HR",
  "IE",
  "IT",
  "LT",
  "LU",
  "LV",
  "MC",
  "ME",
  "MT",
  "NL",
  "PT",
  "SI",
  "SK",
  "SM",
  "VA",
  "XK",
]);

export function billingCurrencyForCountry(
  country: string | null | undefined,
): BillingCurrency {
  return country && euroCountries.has(country.toUpperCase()) ? "eur" : "mkd";
}

export function billingCurrencyFromCookie(
  cookie: string,
): BillingCurrency | undefined {
  const value = cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${BILLING_CURRENCY_COOKIE}=`))
    ?.slice(BILLING_CURRENCY_COOKIE.length + 1);
  return parseBillingCurrency(value);
}

export function requestBillingCurrency(requestHeaders: {
  get(name: string): string | null;
}) {
  return (
    billingCurrencyFromCookie(requestHeaders.get("cookie") ?? "") ??
    billingCurrencyForCountry(requestHeaders.get("x-vercel-ip-country"))
  );
}

/** A functional preference shared by opus.mk and studio.opus.mk. */
export function billingCurrencyCookie(
  currency: BillingCurrency,
  hostname: string,
  secure: boolean,
) {
  const domain =
    hostname === "opus.mk" || hostname.endsWith(".opus.mk")
      ? "; Domain=opus.mk"
      : "";
  return `${BILLING_CURRENCY_COOKIE}=${currency}; Path=/; Max-Age=31536000; SameSite=Lax${domain}${secure ? "; Secure" : ""}`;
}

export function saveBillingCurrency(currency: BillingCurrency) {
  document.cookie = billingCurrencyCookie(
    currency,
    window.location.hostname,
    window.location.protocol === "https:",
  );
}
