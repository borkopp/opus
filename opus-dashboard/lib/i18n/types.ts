export type DashboardLanguage = "en" | "mk";

export type DashboardSupportedLocale = "mk-MK" | "en-GB";

export const DEFAULT_DASHBOARD_LANGUAGE: DashboardLanguage = "en";
export const DEFAULT_DASHBOARD_LOCALE: DashboardSupportedLocale = "en-GB";

export const SUPPORTED_DASHBOARD_LOCALES = [
  {
    code: "mk-MK" as const,
    language: "mk" as const,
    label: {
      en: "Macedonian (mk-MK)",
      mk: "Македонски (mk-MK)",
    },
  },
  {
    code: "en-GB" as const,
    language: "en" as const,
    label: {
      en: "English (en-GB)",
      mk: "Англиски (en-GB)",
    },
  },
] as const;

/**
 * Derives the active UI language from an org settings locale string.
 * A locale starting with "mk" (case-insensitive) maps to Macedonian ("mk"),
 * otherwise falls back to English ("en").
 */
export function resolveDashboardLanguage(
  locale?: string | null,
): DashboardLanguage {
  if (!locale || typeof locale !== "string") {
    return "en";
  }
  const normalized = locale.trim().toLowerCase();
  return normalized.startsWith("mk") ? "mk" : "en";
}

/**
 * Normalizes any locale string to one of the two canonical supported dashboard locales.
 */
export function normalizeDashboardLocale(
  locale?: string | null,
): DashboardSupportedLocale {
  return resolveDashboardLanguage(locale) === "mk" ? "mk-MK" : "en-GB";
}

/**
 * Translates between English and Macedonian given an active DashboardLanguage.
 */
export function translate(
  language: DashboardLanguage,
  english: string,
  macedonian: string,
): string {
  return language === "mk" ? macedonian : english;
}

const DASHBOARD_PAGE_TITLES = [
  {
    path: "/beauty/bookings",
    en: "Appointments",
    mk: "Термини",
  },
  { path: "/beauty/services", en: "Services", mk: "Услуги" },
  { path: "/beauty/staff", en: "Team", mk: "Тим" },
  {
    path: "/gap-optimizer",
    en: "Fill Gaps",
    mk: "Празни термини",
  },
  { path: "/notifications", en: "Notifications", mk: "Известувања" },
  { path: "/settings", en: "Settings", mk: "Поставки" },
  { path: "/ai-inbox", en: "AI Inbox", mk: "AI сандаче" },
  { path: "/beauty", en: "Dashboard", mk: "Контролна табла" },
] as const;

export function getDashboardPageTitle(
  pathname: string,
  language: DashboardLanguage,
): string | null {
  const match = DASHBOARD_PAGE_TITLES.find(
    ({ path }) => pathname === path || pathname.startsWith(`${path}/`),
  );

  return match ? match[language] : null;
}
