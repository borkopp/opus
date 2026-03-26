"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Skeleton } from "@/components/ui/skeleton";

interface PriceProps {
  amount: number; // in minor units, e.g., 2500 for $25.00
  className?: string;
  showDecimals?: boolean;
}

export function formatPrice(amount: number, currency: string = "USD", locale: string = "en-US", showDecimals: boolean = true) {
  const value = amount / 100;
  
  // Custom mapping for symbols if desired by the user
  const currencySymbols: Record<string, string> = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    MKD: "ден",
  };

  const symbol = currencySymbols[currency.toUpperCase()];
  
  // Create formatter
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  });
  
  // Standard format
  let formattedValue = formatter.format(value);

  // If we have a custom symbol mapping and Intl didn't use a narrowed symbol effectively 
  // (e.g. MKD usually renders as "MKD 100.00" instead of "100 ден" depending on locale)
  if (symbol && currency.toUpperCase() === "MKD") {
     formattedValue = `${showDecimals ? value.toFixed(2) : Math.round(value)} ${symbol}`;
  }

  return formattedValue;
}

export function Price({ amount, className = "", showDecimals = true }: PriceProps) {
  const profile = useQuery(api.users.getMyProfile);
  const data = useQuery(
    api.orgSettings.getOrgSettings,
    profile?.orgId ? { orgId: profile.orgId } : "skip"
  );
  
  if (profile === undefined || data === undefined) {
    return <Skeleton className="h-4 w-12 inline-block align-middle" />;
  }

  const currency = data?.settings?.currency || "USD";
  const locale = data?.settings?.locale || "en-US";
  
  const formattedValue = formatPrice(amount, currency, locale, showDecimals);

  return <span className={className}>{formattedValue}</span>;
}
