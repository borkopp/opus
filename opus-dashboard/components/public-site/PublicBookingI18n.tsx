"use client";

import { createContext, useCallback, useContext, useEffect } from "react";
import type { Locale } from "../../../shared/i18n/locale";
import { publicBookingText } from "@/lib/public-booking-i18n";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";

const BookingLocale = createContext<Locale | null>(null);

export function PublicBookingI18n({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return (
    <BookingLocale.Provider value={locale}>{children}</BookingLocale.Provider>
  );
}

export function usePublicBookingI18n() {
  const provided = useContext(BookingLocale);
  const dashboard = useDashboardI18n();
  const locale = provided ?? "mk";
  const text = useCallback(
    (source: string, values?: Record<string, string | number>) =>
      publicBookingText(source, locale, values),
    [locale],
  );
  return {
    locale,
    text,
    t: (en: string, mk?: string, sq?: string) =>
      provided
        ? { en, mk: mk ?? en, sq: sq ?? en }[provided]
        : dashboard.t(en, mk, sq),
  };
}
