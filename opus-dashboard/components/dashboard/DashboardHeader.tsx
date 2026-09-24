"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings2, ChartNoAxesCombined } from "lucide-react";
import { Logo } from "@/components/Logo";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { getNavLinks } from "@/lib/vertical-nav-config";
import { ACTIVE_INDUSTRY } from "@/lib/product-scope";
import {
  DashboardAccountMenu,
  type DashboardProfile,
} from "./DashboardAccountMenu";
import s from "./clarity.module.css";
import { useDashboardAppearance } from "./DashboardAppearanceProvider";
import { dashboardThemeDetails } from "@/lib/dashboard-theme";
export function DashboardHeader({
  profile,
  activePath,
}: {
  profile: DashboardProfile;
  activePath?: string;
}) {
  const currentPath = usePathname();
  const pathname = activePath ?? currentPath;
  const { language, t } = useDashboardI18n();
  const theme = useDashboardAppearance();
  const links = getNavLinks(ACTIVE_INDUSTRY, language).links.filter(
    (link) => link.href !== "/settings" && link.href !== "/beauty/assistant",
  );
  return (
    <header className={s.topbar}>
      <Link
        href="/beauty"
        aria-label={t("OPUS dashboard", "OPUS контролна табла")}
      >
        <span className={s.brandLockup}>
          <Logo className={s.brand} markClassName={s.brandMark} />
          <span className={s.themeName}>
            {dashboardThemeDetails[theme].name}
          </span>
        </span>
      </Link>
      <nav
        className={s.navigation}
        aria-label={t("Main navigation", "Главна навигација")}
      >
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={
              (
                link.href === "/beauty"
                  ? pathname === link.href
                  : pathname.startsWith(link.href)
              )
                ? "page"
                : undefined
            }
          >
            {link.icon}
            <span>
              {link.href === "/beauty" ? t("Overview", "Преглед") : link.label}
            </span>
          </Link>
        ))}
      </nav>
      <div className={s.headerActions}>
        {profile.role !== "staff" && (
          <Link
            href="/beauty/assistant"
            className={`${s.iconButton} dashboard-assistant-link`}
            aria-label={t("Business assistant", "Деловен асистент")}
            aria-current={
              pathname.startsWith("/beauty/assistant") ? "page" : undefined
            }
          >
            <ChartNoAxesCombined size={19} />
          </Link>
        )}
        <Link
          href="/settings"
          className={s.iconButton}
          aria-label={t("Settings", "Поставки")}
          aria-current={pathname === "/settings" ? "page" : undefined}
        >
          <Settings2 size={19} />
        </Link>
        {profile.orgId && (
          <NotificationBell orgId={profile.orgId} placement="header" />
        )}
        <span className={s.headerDivider} />
        <DashboardAccountMenu profile={profile} />
      </div>
    </header>
  );
}
