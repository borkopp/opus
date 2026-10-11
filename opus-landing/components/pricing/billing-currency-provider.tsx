"use client";

import { createContext, useContext, useState } from "react";
import {
  saveBillingCurrency,
  type BillingCurrency,
} from "../../../shared/billing-currency";

const CurrencyContext = createContext<{
  currency: BillingCurrency;
  selectCurrency: (currency: BillingCurrency) => void;
} | null>(null);

export function BillingCurrencyProvider({
  initialCurrency,
  children,
}: {
  initialCurrency: BillingCurrency;
  children: React.ReactNode;
}) {
  const [currency, setCurrency] = useState(initialCurrency);
  function selectCurrency(value: BillingCurrency) {
    setCurrency(value);
    saveBillingCurrency(value);
  }
  return (
    <CurrencyContext.Provider value={{ currency, selectCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useBillingCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) throw new Error("Billing currency provider is missing");
  return context;
}
