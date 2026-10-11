"use client";

import { useId } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useI18n } from "@/lib/i18n/context";
import { parseBillingCurrency } from "../../../shared/billing-currency";
import { useBillingCurrency } from "./billing-currency-provider";

export function CurrencySelector() {
  const { locale } = useI18n();
  const { currency, selectCurrency } = useBillingCurrency();
  const labelId = useId();
  return (
    <div className="pricing-currency-selector">
      <span id={labelId}>
        {locale === "mk" ? "Валута" : locale === "sq" ? "Monedha" : "Currency"}
      </span>
      <ToggleGroup
        type="single"
        variant="outline"
        value={currency}
        aria-labelledby={labelId}
        onValueChange={(value) => {
          const next = parseBillingCurrency(value);
          if (next) selectCurrency(next);
        }}
      >
        <ToggleGroupItem value="mkd" aria-label="MKD">
          MKD
        </ToggleGroupItem>
        <ToggleGroupItem value="eur" aria-label="EUR">
          EUR
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
