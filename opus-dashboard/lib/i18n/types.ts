export type DashboardLanguage = "en" | "mk" | "sq";

export type DashboardSupportedLocale = "mk-MK" | "en-GB" | "sq-AL";

export const DEFAULT_DASHBOARD_LANGUAGE: DashboardLanguage = "en";
export const DEFAULT_DASHBOARD_LOCALE: DashboardSupportedLocale = "en-GB";

export const SUPPORTED_DASHBOARD_LOCALES = [
  {
    code: "mk-MK" as const,
    language: "mk" as const,
    label: {
      en: "Macedonian",
      mk: "Македонски",
      sq: "Maqedonisht",
    },
  },
  {
    code: "sq-AL" as const,
    language: "sq" as const,
    label: {
      en: "Albanian",
      mk: "Албански",
      sq: "Shqip",
    },
  },
  {
    code: "en-GB" as const,
    language: "en" as const,
    label: {
      en: "English",
      mk: "Англиски",
      sq: "Anglisht",
    },
  },
] as const;

/**
 * Derives the active UI language from an org settings locale string.
 * A locale starting with "sq" maps to Albanian ("sq"),
 * a locale starting with "mk" maps to Macedonian ("mk"),
 * otherwise falls back to English ("en").
 */
export function resolveDashboardLanguage(
  locale?: string | null,
): DashboardLanguage {
  if (!locale || typeof locale !== "string") {
    return "en";
  }
  const normalized = locale.trim().toLowerCase();
  if (normalized.startsWith("sq")) {
    return "sq";
  }
  if (normalized.startsWith("mk")) {
    return "mk";
  }
  return "en";
}

/**
 * Normalizes any locale string to one of the canonical supported dashboard locales.
 */
export function normalizeDashboardLocale(
  locale?: string | null,
): DashboardSupportedLocale {
  const language = resolveDashboardLanguage(locale);
  if (language === "sq") return "sq-AL";
  if (language === "mk") return "mk-MK";
  return "en-GB";
}

/**
 * Translates between English, Macedonian, and Albanian given an active DashboardLanguage.
 */
export function translate(
  language: DashboardLanguage,
  english: string,
  macedonian: string,
  albanian?: string,
): string {
  if (language === "sq") {
    return albanian || english;
  }
  return language === "mk" ? macedonian : english;
}

const DASHBOARD_PAGE_TITLES = [
  {
    path: "/beauty/assistant",
    en: "Business assistant",
    mk: "Деловен асистент",
    sq: "Asistenti i biznesit",
  },
  {
    path: "/beauty/bookings",
    en: "Appointments",
    mk: "Термини",
    sq: "Terminet",
  },
  {
    path: "/beauty/services",
    en: "Services & staff",
    mk: "Услуги и тим",
    sq: "Shërbimet dhe ekipi",
  },
  {
    path: "/beauty/promote",
    en: "Promote your studio",
    mk: "Промовирајте го студиото",
    sq: "Promovoni studion tuaj",
  },
  {
    path: "/beauty/clients",
    en: "Clients",
    mk: "Клиенти",
    sq: "Klientët",
  },
  {
    path: "/beauty/staff",
    en: "Team",
    mk: "Тим",
    sq: "Ekipi",
  },
  {
    path: "/gap-optimizer",
    en: "Fill Gaps",
    mk: "Празни термини",
    sq: "Hapësirat boshe",
  },
  {
    path: "/notifications",
    en: "Notifications",
    mk: "Известувања",
    sq: "Njoftimet",
  },
  {
    path: "/settings",
    en: "Settings",
    mk: "Поставки",
    sq: "Cilësimet",
  },
  {
    path: "/ai-inbox",
    en: "AI Inbox",
    mk: "AI сандаче",
    sq: "Kutia e AI",
  },
  {
    path: "/beauty",
    en: "Dashboard",
    mk: "Контролна табла",
    sq: "Paneli",
  },
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
