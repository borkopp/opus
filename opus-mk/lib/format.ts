/** Format minor units (e.g. 1500 MKD) to display string */
export function formatPrice(
  minorUnits: number,
  currency: string = "MKD",
): string {
  const major = minorUnits / 100;
  if (currency === "MKD") {
    return `${Math.round(major).toLocaleString()} ден.`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(major);
}
