import {
  ACTIVE_CAPABILITIES,
  ACTIVE_DASHBOARD_PATH,
  ACTIVE_INDUSTRY,
} from "@/lib/product-scope";
import {
  resolveDashboardLanguage,
  type DashboardLanguage,
} from "@/lib/i18n/types";
import en from "@/lib/i18n/en";
import mk from "@/lib/i18n/mk";
import al from "@/lib/i18n/al";

// ─────────────────────────────────────────────────────────────────────────────
// Vertical Navigation Config
//
// Each vertical defines its own nav items. To add a new vertical:
//   1. Add a new entry in `verticalNavConfig`
//   2. Add the industry route in `industryRoutes`
//   3. Done — the sidebar and routing will pick it up.
// ─────────────────────────────────────────────────────────────────────────────

export interface NavItem {
  label: {
    en: string;
    mk: string;
    sq: string;
  };
  href: string;
  icon:
    | "overview"
    | "calendar"
    | "clients"
    | "services"
    | "settings"
    | "assistant"
    | "promote"
    | "tables";
}

export interface VerticalNavConfig {
  /** URL base path, e.g. "/beauty" */
  basePath: string;
  /** Human label for the vertical */
  label: { en: string; mk: string; sq: string };
  /** Primary nav items shown in the top bar */
  primaryLinks: NavItem[];
}

// ── Route mapping — industry DB value → URL base ─────────────────────────────
export const industryRoutes: Record<string, string> = {
  [ACTIVE_INDUSTRY]: ACTIVE_DASHBOARD_PATH,
  hospitality: "/hospitality",
};

export const verticalNavConfig: Record<string, VerticalNavConfig> = {
  [ACTIVE_INDUSTRY]: {
    basePath: ACTIVE_DASHBOARD_PATH,
    label: {
      en: en.nav.industryLabel,
      mk: mk.nav.industryLabel,
      sq: al.nav.industryLabel,
    },
    primaryLinks: [
      {
        label: {
          en: en.nav.dashboard,
          mk: mk.nav.dashboard,
          sq: al.nav.dashboard,
        },
        href: "{base}",
        icon: "overview",
      },
      {
        label: {
          en: en.nav.calendar,
          mk: mk.nav.calendar,
          sq: al.nav.calendar,
        },
        href: "{base}/bookings",
        icon: "calendar",
      },
      {
        label: {
          en: en.nav.clients,
          mk: mk.nav.clients,
          sq: al.nav.clients,
        },
        href: "{base}/clients",
        icon: "clients",
      },
      {
        label: {
          en: en.nav.management,
          mk: mk.nav.management,
          sq: al.nav.management,
        },
        href: "{base}/services",
        icon: "services",
      },
      {
        label: {
          en: en.nav.promote,
          mk: mk.nav.promote,
          sq: al.nav.promote,
        },
        href: "{base}/promote",
        icon: "promote",
      },
      {
        label: {
          en: en.nav.settings,
          mk: mk.nav.settings,
          sq: al.nav.settings,
        },
        href: "/settings",
        icon: "settings",
      },
      ...(ACTIVE_CAPABILITIES.businessAnalyst
        ? [
            {
              label: {
                en: en.nav.assistant,
                mk: mk.nav.assistant,
                sq: al.nav.assistant,
              },
              href: "{base}/assistant",
              icon: "assistant" as const,
            },
          ]
        : []),
    ],
  },
  hospitality: {
    basePath: "/hospitality",
    label: {
      en: "Restaurants and cafés",
      mk: "Ресторани и кафулиња",
      sq: "Restorante dhe kafene",
    },
    primaryLinks: [
      {
        label: { en: "Reservations", mk: "Резервации", sq: "Rezervimet" },
        href: "{base}",
        icon: "calendar",
      },
      {
        label: { en: "Tables", mk: "Маси", sq: "Tavolinat" },
        href: "{base}/tables",
        icon: "tables",
      },
      {
        label: { en: "Venue setup", mk: "Локал", sq: "Lokali" },
        href: "{base}/setup",
        icon: "settings",
      },
    ],
  },
};

/**
 * Resolve nav items for a given industry and language/locale.
 * Replaces `{base}` placeholder with the actual base path.
 */
export function getNavLinks(
  industry: string,
  languageOrLocale: DashboardLanguage | string = "en",
): {
  basePath: string;
  label: string;
  links: Array<{ label: string; href: string; icon: NavItem["icon"] }>;
} {
  const language = resolveDashboardLanguage(languageOrLocale);
  const config =
    verticalNavConfig[industry] ?? verticalNavConfig[ACTIVE_INDUSTRY];
  const base = config.basePath;

  return {
    basePath: base,
    label: config.label[language],
    links: config.primaryLinks.map((item) => ({
      label: (item.label as Record<string, string>)[language] ?? item.label.en,
      href: item.href.replace("{base}", base),
      icon: item.icon,
    })),
  };
}

export function getDashboardNavLinks(
  profile: { industry?: string; role?: string; bookingAccess?: string },
  language: DashboardLanguage,
) {
  const hospitality = profile.industry === "hospitality";
  return getNavLinks(
    hospitality ? "hospitality" : ACTIVE_INDUSTRY,
    language,
  ).links.filter((link) =>
    hospitality
      ? link.href !== "/hospitality/setup" ||
        profile.role === "owner" ||
        profile.role === "manager"
      : profile.bookingAccess === "own"
        ? link.href === "/beauty/bookings"
        : link.href !== "/settings" && link.href !== "/beauty/assistant",
  );
}

export function isDashboardNavActive(href: string, pathname: string) {
  if (href === "/beauty" || href === "/hospitality") return pathname === href;
  return (
    pathname === href ||
    pathname.startsWith(`${href}/`) ||
    (href === "/beauty/services" && pathname.startsWith("/beauty/staff/"))
  );
}
