export function formatPrice(
  amount: number,
  currency = "USD",
  locale = "en-US",
  showDecimals = true,
): string {
  const value = amount / 100;
  const fractionDigits = showDecimals ? 2 : 0;

  if (currency.toUpperCase() === "MKD") {
    return `${showDecimals ? value.toFixed(2) : Math.round(value)} ден`;
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(value);
  } catch {
    const fallbackValue = showDecimals
      ? value.toFixed(2)
      : String(Math.round(value));
    return `${fallbackValue} ${currency.trim().toUpperCase() || "MKD"}`;
  }
}
