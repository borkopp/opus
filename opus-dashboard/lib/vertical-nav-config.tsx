import {
  IconBrandTabler,
  IconCalendarEvent,
  IconUsers,
  IconSettings,
  IconReportMoney,
  IconToolsKitchen2,
  IconMap,
  IconClipboardList,
  IconMessageChatbot,
  IconSparkles,
} from "@tabler/icons-react";

// ─────────────────────────────────────────────────────────────────────────────
// Vertical Navigation Config
//
// Each vertical defines its own nav items. To add a new vertical:
//   1. Add a new entry in `verticalNavConfig`
//   2. Add the industry route in `industryRoutes`
//   3. Done — the sidebar and routing will pick it up.
// ─────────────────────────────────────────────────────────────────────────────

export interface NavItem {
  label: string;
  /** Use "{base}" as placeholder — gets replaced with the industry base path */
  href: string;
  icon: React.ReactNode;
}

export interface VerticalNavConfig {
  /** URL base path, e.g. "/beauty" */
  basePath: string;
  /** Human label for the vertical */
  label: string;
  /** Primary nav items shown in the top bar */
  primaryLinks: NavItem[];
}

// ── Route mapping — industry DB value → URL base ─────────────────────────────
export const industryRoutes: Record<string, string> = {
  beauty_wellness: "/beauty",
  hospitality: "/hospitality",
  professional_services: "/beauty", // fallback until PS vertical is built
};

// ── Per-vertical nav configs ─────────────────────────────────────────────────
export const verticalNavConfig: Record<string, VerticalNavConfig> = {
  beauty_wellness: {
    basePath: "/beauty",
    label: "Beauty & Wellness",
    primaryLinks: [
      { label: "Dashboard", href: "{base}", icon: <IconBrandTabler className="h-5 w-5 flex-shrink-0" /> },
      { label: "Bookings",  href: "{base}/bookings",  icon: <IconCalendarEvent className="h-5 w-5 flex-shrink-0" /> },
      { label: "Staff",     href: "{base}/staff",      icon: <IconUsers className="h-5 w-5 flex-shrink-0" /> },
      { label: "Services",  href: "{base}/services",   icon: <IconSettings className="h-5 w-5 flex-shrink-0" /> },
      { label: "Finances",  href: "{base}/finances",   icon: <IconReportMoney className="h-5 w-5 flex-shrink-0" /> },
      { label: "AI Inbox",  href: "/ai-inbox",         icon: <IconMessageChatbot className="h-5 w-5 flex-shrink-0" /> },
      { label: "Fill Gaps", href: "/gap-optimizer",    icon: <IconSparkles className="h-5 w-5 flex-shrink-0" /> },
      { label: "Settings",  href: "/settings",         icon: <IconSettings className="h-5 w-5 flex-shrink-0" /> },
    ],
  },
  hospitality: {
    basePath: "/hospitality",
    label: "Hospitality",
    primaryLinks: [
      { label: "Dashboard",    href: "{base}",               icon: <IconBrandTabler className="h-5 w-5 flex-shrink-0" /> },
      { label: "Floor Plan",   href: "{base}/floor-plan",    icon: <IconMap className="h-5 w-5 flex-shrink-0" /> },
      { label: "Reservations", href: "{base}/reservations",  icon: <IconClipboardList className="h-5 w-5 flex-shrink-0" /> },
      { label: "Staff",        href: "{base}/staff",         icon: <IconUsers className="h-5 w-5 flex-shrink-0" /> },
      { label: "Menu",         href: "{base}/menu",          icon: <IconToolsKitchen2 className="h-5 w-5 flex-shrink-0" /> },
      { label: "Finances",     href: "{base}/finances",      icon: <IconReportMoney className="h-5 w-5 flex-shrink-0" /> },
      { label: "AI Inbox",     href: "/ai-inbox",            icon: <IconMessageChatbot className="h-5 w-5 flex-shrink-0" /> },
      { label: "Fill Gaps",    href: "/gap-optimizer",       icon: <IconSparkles className="h-5 w-5 flex-shrink-0" /> },
      { label: "Settings",     href: "/settings",            icon: <IconSettings className="h-5 w-5 flex-shrink-0" /> },
    ],
  },
};

/**
 * Resolve nav items for a given industry.
 * Replaces `{base}` placeholder with the actual base path.
 */
export function getNavLinks(industry: string): { basePath: string; links: Array<{ label: string; href: string; icon: React.ReactNode }> } {
  const config = verticalNavConfig[industry] ?? verticalNavConfig.beauty_wellness;
  const base = config.basePath;

  return {
    basePath: base,
    links: config.primaryLinks.map((item) => ({
      ...item,
      href: item.href.replace("{base}", base),
    })),
  };
}
