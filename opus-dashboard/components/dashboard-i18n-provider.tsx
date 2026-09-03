"use client";

import React, { createContext, useContext, useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import {
  getDashboardPageTitle,
  normalizeDashboardLocale,
  resolveDashboardLanguage,
  translate,
  type DashboardLanguage,
} from "@/lib/i18n/types";

export interface DashboardI18nContextValue {
  language: DashboardLanguage;
  locale: string;
  t: (english: string, macedonian: string) => string;
}

const DashboardI18nContext = createContext<DashboardI18nContextValue | null>(
  null,
);

export function DashboardI18nProvider({
  locale,
  children,
}: {
  locale?: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const language = resolveDashboardLanguage(locale);
  const activeLocale = normalizeDashboardLocale(locale);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = activeLocale;
      const pageTitle = getDashboardPageTitle(pathname, language);
      if (pageTitle) document.title = `${pageTitle} | OPUS`;
    }
  }, [activeLocale, language, pathname]);

  const value = useMemo<DashboardI18nContextValue>(() => {
    return {
      language,
      locale: activeLocale,
      t: (english: string, macedonian: string) =>
        translate(language, english, macedonian),
    };
  }, [language, activeLocale]);

  return (
    <DashboardI18nContext.Provider value={value}>
      {children}
    </DashboardI18nContext.Provider>
  );
}

export function useDashboardI18n(): DashboardI18nContextValue {
  const context = useContext(DashboardI18nContext);
  if (!context) {
    throw new Error(
      "useDashboardI18n must be used within DashboardI18nProvider.",
    );
  }
  return context;
}
