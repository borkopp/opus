"use client";

import { formatPrice } from "@/lib/format-price";

export { formatPrice } from "@/lib/format-price";

interface PriceProps {
  amount: number; // in minor units, e.g., 2500 for $25.00
  currency: string;
  locale?: string;
  className?: string;
  showDecimals?: boolean;
}

export function Price({
  amount,
  currency,
  locale = "en-US",
  className = "",
  showDecimals = true,
}: PriceProps) {
  const formattedValue = formatPrice(amount, currency, locale, showDecimals);

  return <span className={className}>{formattedValue}</span>;
}
