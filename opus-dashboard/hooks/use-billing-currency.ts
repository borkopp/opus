"use client";

import { useEffect, useState } from "react";
import {
  billingCurrencyFromCookie,
  parseBillingCurrency,
  saveBillingCurrency,
  type BillingCurrency,
} from "../../shared/billing-currency";

export function useBillingCurrency(requested?: BillingCurrency) {
  const [detected, setDetected] = useState<BillingCurrency>();
  const [chosen, setChosen] = useState<BillingCurrency>();

  useEffect(() => {
    const saved = billingCurrencyFromCookie(document.cookie);
    const controller = new AbortController();
    if (requested || saved) {
      void Promise.resolve(requested ?? saved).then(setDetected);
      return;
    }
    const timeout = window.setTimeout(() => controller.abort(), 5000);
    void fetch("/api/billing/currency", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) =>
        setDetected(parseBillingCurrency(data?.currency) ?? "mkd"),
      )
      .catch(() => {
        setDetected("mkd");
      })
      .finally(() => window.clearTimeout(timeout));
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [requested]);

  const currency = chosen ?? requested ?? detected ?? "mkd";
  const ready = Boolean(chosen ?? requested ?? detected);
  function selectCurrency(value: BillingCurrency) {
    setChosen(value);
    saveBillingCurrency(value);
    // Preserve a changed selection if the page reloads with an earlier CTA currency.
    const url = new URL(window.location.href);
    url.searchParams.set("currency", value);
    window.history.replaceState(null, "", url);
  }
  return { currency, ready, selectCurrency };
}
