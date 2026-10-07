import en from "./en";
import mk from "./mk";
import al from "./al";

export type DashboardLanguage = "en" | "mk" | "sq";

export type DashboardSupportedLocale = "mk-MK" | "en-GB" | "sq-AL";

export const DEFAULT_DASHBOARD_LANGUAGE: DashboardLanguage = "en";
export const DEFAULT_DASHBOARD_LOCALE: DashboardSupportedLocale = "en-GB";

export interface DashboardTranslations {
  locale: {
    code: DashboardSupportedLocale;
    language: "en" | "mk" | "sq";
    name: string;
  };
  pageTitles: Record<string, string>;
  nav: {
    industryLabel: string;
    dashboard: string;
    calendar: string;
    clients: string;
    management: string;
    promote: string;
    settings: string;
    assistant: string;
  };
  locales: Record<string, string>;
  handoffReasons: Record<string, string>;
  analyst: {
    metrics: Record<string, string>;
    warnings: Record<string, string>;
    errors: Record<string, string>;
    genericError: string;
  };
  notifications: {
    titles: {
      ai_handoff: string;
      new_booking: string;
      booking_rescheduled: string;
      booking_cancelled: string;
      no_show: string;
    };
    dateTokens: Record<string, string>;
    at: string;
    bodies: {
      ai_handoff: string;
      new_booking: (
        customer: string,
        service: string,
        staff: string,
        appointment: string,
      ) => string;
      rescheduled: (
        customer: string,
        service: string,
        staff: string,
        appointment: string,
      ) => string;
      cancelled: (
        customer: string,
        service: string,
        appointment: string,
      ) => string;
      no_show: (
        customer: string,
        service: string,
        appointment: string,
      ) => string;
    };
  };
  onboarding: {
    categories: Record<
      string,
      {
        label: string;
        defaultService: string;
      }
    >;
    days: string[];
    daysShort: string[];
    errors: Record<string, string>;
    genericError: string;
    requirements: Record<string, { title: string; description: string }>;
  };
  staffErrors: {
    FREE_STAFF_LIMIT: string;
    PRO_STAFF_LIMIT: string;
  };
  gapRecovery: {
    errors: Record<string, string>;
    defaultError: string;
    statuses: Record<string, string>;
    defaultStatus: string;
  };
  messages: Record<string, string>;
}

export const translations = {
  en,
  mk,
  al,
  sq: al,
} as const;

export function getTranslations(
  lang?: DashboardLanguage | string | null,
): DashboardTranslations {
  if (lang === "al") {
    return al;
  }
  const normalized = resolveDashboardLanguage(lang);
  return translations[normalized as keyof typeof translations] ?? en;
}

export const SUPPORTED_DASHBOARD_LOCALES = [
  {
    code: "mk-MK" as const,
    language: "mk" as const,
    label: {
      en: en.locales["mk-MK"],
      mk: mk.locales["mk-MK"],
      sq: al.locales["mk-MK"],
    },
  },
  {
    code: "sq-AL" as const,
    language: "sq" as const,
    label: {
      en: en.locales["sq-AL"],
      mk: mk.locales["sq-AL"],
      sq: al.locales["sq-AL"],
    },
  },
  {
    code: "en-GB" as const,
    language: "en" as const,
    label: {
      en: en.locales["en-GB"],
      mk: mk.locales["en-GB"],
      sq: al.locales["en-GB"],
    },
  },
] as const;

/**
 * Derives the active UI language from an org settings locale string.
 * A locale starting with "sq" or "al" maps to Albanian ("sq"),
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
  if (normalized.startsWith("sq" ) || normalized.startsWith("al")) {
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
 * Checks language-specific dictionary files first, falling back to optional inline arguments.
 */
export function translate(
  language: DashboardLanguage | string,
  english: string,
  macedonian?: string,
  albanian?: string,
): string {
  if (language === "mk" && macedonian !== undefined) {
    return macedonian;
  }
  if (language === "sq" || language === "al") {
    if (albanian !== undefined) {
      return albanian;
    }
    if (macedonian !== undefined) {
      return english;
    }
  }

  const dict = getTranslations(language);
  const localized = dict?.messages?.[english];
  if (localized !== undefined) {
    return localized;
  }

  if (language === "mk" && macedonian) {
    return macedonian;
  }
  if ((language === "sq" || language === "al") && albanian) {
    return albanian;
  }
  return english;
}

export function getDashboardPageTitle(
  pathname: string,
  language: DashboardLanguage | string,
): string | null {
  const dict = getTranslations(language);
  for (const [path, title] of Object.entries(dict.pageTitles)) {
    if (pathname === path || pathname.startsWith(`${path}/`)) {
      return title;
    }
  }

  return null;
}
