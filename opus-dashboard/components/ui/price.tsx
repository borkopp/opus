"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/format-price";

export { formatPrice } from "@/lib/format-price";

interface PriceProps {
  amount: number; // in minor units, e.g., 2500 for $25.00
  className?: string;
  showDecimals?: boolean;
}

export function Price({
  amount,
  className = "",
  showDecimals = true,
}: PriceProps) {
  const profile = useQuery(api.users.getMyProfile);
  const data = useQuery(
    api.orgSettings.getOrgSettings,
    profile?.orgId ? { orgId: profile.orgId } : "skip",
  );

  if (profile === undefined || data === undefined) {
    return <Skeleton className="h-4 w-12 inline-block align-middle" />;
  }

  const currency = data?.settings?.currency || "USD";
  const locale = data?.settings?.locale || "en-US";

  const formattedValue = formatPrice(amount, currency, locale, showDecimals);

  return <span className={className}>{formattedValue}</span>;
}
