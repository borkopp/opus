"use client";

import { useId } from "react";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { Field, FieldLabel } from "@/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  parseBillingCurrency,
  type BillingCurrency,
} from "../../../shared/billing-currency";

export function BillingCurrencySelector({
  value,
  onChange,
  disabled,
}: {
  value: BillingCurrency;
  onChange: (value: BillingCurrency) => void;
  disabled: boolean;
}) {
  const { t } = useDashboardI18n();
  const labelId = useId();
  return (
    <Field>
      <FieldLabel id={labelId}>
        {t("Billing currency", "Валута за наплата", "Monedha e faturimit")}
      </FieldLabel>
      <ToggleGroup
        type="single"
        variant="outline"
        value={value}
        disabled={disabled}
        aria-labelledby={labelId}
        onValueChange={(value) => {
          const currency = parseBillingCurrency(value);
          if (currency) onChange(currency);
        }}
      >
        <ToggleGroupItem value="mkd">MKD</ToggleGroupItem>
        <ToggleGroupItem value="eur">EUR</ToggleGroupItem>
      </ToggleGroup>
    </Field>
  );
}
