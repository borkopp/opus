import {
  IconBrandTabler,
  IconCalendarEvent,
  IconAddressBook,
  IconScissors,
  IconSettings,
  IconChartBar,
  IconSpeakerphone,
} from "@tabler/icons-react";
import {
  ACTIVE_CAPABILITIES,
  ACTIVE_DASHBOARD_PATH,
  ACTIVE_INDUSTRY,
} from "@/lib/product-scope";
import {
  resolveDashboardLanguage,
  getTranslations,
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
  icon: React.ReactNode;
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
        icon: <IconBrandTabler className="h-5 w-5 flex-shrink-0" />,
      },
      {
        label: {
          en: en.nav.calendar,
          mk: mk.nav.calendar,
          sq: al.nav.calendar,
        },
        href: "{base}/bookings",
        icon: <IconCalendarEvent className="h-5 w-5 flex-shrink-0" />,
      },
      {
        label: {
          en: en.nav.clients,
          mk: mk.nav.clients,
          sq: al.nav.clients,
        },
        href: "{base}/clients",
        icon: <IconAddressBook className="h-5 w-5 flex-shrink-0" />,
      },
      {
        label: {
          en: en.nav.management,
          mk: mk.nav.management,
          sq: al.nav.management,
        },
        href: "{base}/services",
        icon: <IconScissors className="h-5 w-5 flex-shrink-0" />,
      },
      {
        label: {
          en: en.nav.promote,
          mk: mk.nav.promote,
          sq: al.nav.promote,
        },
        href: "{base}/promote",
        icon: <IconSpeakerphone className="h-5 w-5 flex-shrink-0" />,
      },
      {
        label: {
          en: en.nav.settings,
          mk: mk.nav.settings,
          sq: al.nav.settings,
        },
        href: "/settings",
        icon: <IconSettings className="h-5 w-5 flex-shrink-0" />,
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
              icon: <IconChartBar className="h-5 w-5 flex-shrink-0" />,
            },
          ]
        : []),
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
  links: Array<{ label: string; href: string; icon: React.ReactNode }>;
} {
  const language = resolveDashboardLanguage(languageOrLocale);
  const dict = getTranslations(language);
  const config =
    verticalNavConfig[industry] ?? verticalNavConfig[ACTIVE_INDUSTRY];
  const base = config.basePath;

  return {
    basePath: base,
    label: dict.nav.industryLabel,
    links: config.primaryLinks.map((item) => ({
      label: (item.label as Record<string, string>)[language] ?? item.label.en,
      href: item.href.replace("{base}", base),
      icon: item.icon,
    })),
  };
}
