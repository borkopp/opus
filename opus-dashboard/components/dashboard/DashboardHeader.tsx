"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Settings2, ChartNoAxesCombined } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Badge } from "@/components/ui/badge";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { getNavLinks } from "@/lib/vertical-nav-config";
import { ACTIVE_INDUSTRY } from "@/lib/product-scope";
import {
  DashboardAccountMenu,
  type DashboardProfile,
} from "./DashboardAccountMenu";
import s from "./clarity.module.css";
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
  const navigationRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const nav = navigationRef.current;
    if (!nav) return;
    const keepActiveVisible = () => {
      const active = nav.querySelector<HTMLElement>('[aria-current="page"]');
      if (!active || nav.scrollWidth <= nav.clientWidth) return;
      const navBounds = nav.getBoundingClientRect();
      const bounds = active.getBoundingClientRect();
      if (bounds.right > navBounds.right)
        nav.scrollLeft += bounds.right - navBounds.right;
      else if (bounds.left < navBounds.left)
        nav.scrollLeft -= navBounds.left - bounds.left;
    };
    keepActiveVisible();
    const observer = new ResizeObserver(keepActiveVisible);
    observer.observe(nav);
    return () => observer.disconnect();
  }, [pathname, language]);
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
          {profile.plan === "paid" && <Badge variant="pro">Pro</Badge>}
        </span>
      </Link>
      <nav
        ref={navigationRef}
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
                  : pathname.startsWith(link.href) ||
                    (link.href === "/beauty/services" &&
                      pathname.startsWith("/beauty/staff/"))
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
