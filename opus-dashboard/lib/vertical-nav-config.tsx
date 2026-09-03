import {
  IconBrandTabler,
  IconCalendarEvent,
  IconUsers,
  IconScissors,
  IconSettings,
} from "@tabler/icons-react";
import { ACTIVE_DASHBOARD_PATH, ACTIVE_INDUSTRY } from "@/lib/product-scope";
import {
  resolveDashboardLanguage,
  type DashboardLanguage,
} from "@/lib/i18n/types";

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
  };
  href: string;
  icon: React.ReactNode;
}

export interface VerticalNavConfig {
  /** URL base path, e.g. "/beauty" */
  basePath: string;
  /** Human label for the vertical */
  label: { en: string; mk: string };
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
      en: "Beauty & Wellness",
      mk: "Убавина и велнес",
    },
    primaryLinks: [
      {
        label: { en: "Dashboard", mk: "Контролна табла" },
        href: "{base}",
        icon: <IconBrandTabler className="h-5 w-5 flex-shrink-0" />,
      },
      {
        label: { en: "Bookings", mk: "Термини" },
        href: "{base}/bookings",
        icon: <IconCalendarEvent className="h-5 w-5 flex-shrink-0" />,
      },
      {
        label: { en: "Staff", mk: "Тим" },
        href: "{base}/staff",
        icon: <IconUsers className="h-5 w-5 flex-shrink-0" />,
      },
      {
        label: { en: "Services", mk: "Услуги" },
        href: "{base}/services",
        icon: <IconScissors className="h-5 w-5 flex-shrink-0" />,
      },
      {
        label: { en: "Settings", mk: "Поставки" },
        href: "/settings",
        icon: <IconSettings className="h-5 w-5 flex-shrink-0" />,
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
  links: Array<{ label: string; href: string; icon: React.ReactNode }>;
} {
  const language = resolveDashboardLanguage(languageOrLocale);
  const config =
    verticalNavConfig[industry] ?? verticalNavConfig[ACTIVE_INDUSTRY];
  const base = config.basePath;

  return {
    basePath: base,
    label: config.label[language],
    links: config.primaryLinks.map((item) => ({
      label: item.label[language],
      href: item.href.replace("{base}", base),
      icon: item.icon,
    })),
  };
}
