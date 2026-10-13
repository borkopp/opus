"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Settings2, ChartNoAxesCombined } from "lucide-react";
import {
  IconBrandTabler,
  IconCalendarEvent,
  IconAddressBook,
  IconScissors,
  IconSettings,
  IconChartBar,
  IconSpeakerphone,
  IconTable,
} from "@tabler/icons-react";
import { Logo } from "@/components/Logo";
import { Badge } from "@/components/ui/badge";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import {
  getDashboardNavLinks,
  isDashboardNavActive,
} from "@/lib/vertical-nav-config";
import {
  DashboardAccountMenu,
  type DashboardProfile,
} from "./DashboardAccountMenu";
import { PersonalStaffMenu } from "@/components/staff/PersonalStaffMenu";
import { StudioSwitcher } from "@/components/staff/StudioSwitcher";
import s from "./clarity.module.css";
const navigationIcons = {
  overview: IconBrandTabler,
  calendar: IconCalendarEvent,
  clients: IconAddressBook,
  services: IconScissors,
  settings: IconSettings,
  assistant: IconChartBar,
  promote: IconSpeakerphone,
  tables: IconTable,
};
export function DashboardHeader({
  profile,
  activePath,
}: {
  profile: DashboardProfile;
  activePath?: string;
}) {
  const currentPath = usePathname();
  const pathname = activePath ?? currentPath;
  const hospitality = profile.industry === "hospitality";
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
  const links = getDashboardNavLinks(profile, language);
  return (
    <header className={s.topbar}>
      <Link
        href={
          hospitality
            ? "/hospitality"
            : profile.bookingAccess === "own"
              ? "/beauty/bookings"
              : "/beauty"
        }
        aria-label={t(
          "OPUS dashboard",
          "OPUS контролна табла",
          "Paneli i OPUS",
        )}
      >
        <span className={s.brandLockup}>
          <Logo className={s.brand} markClassName={s.brandMark} />
          {!hospitality && profile.plan === "paid" && (
            <Badge data-replay-public variant="pro">
              Pro
            </Badge>
          )}
        </span>
      </Link>
      <nav
        ref={navigationRef}
        className={s.navigation}
        aria-label={t(
          "Main navigation",
          "Главна навигација",
          "Navigimi kryesor",
        )}
      >
        {links.map((link) => {
          const Icon = navigationIcons[link.icon];
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={
                isDashboardNavActive(link.href, pathname) ? "page" : undefined
              }
            >
              <Icon className="size-5 shrink-0" aria-hidden="true" />
              <span data-replay-public>
                {link.href === "/beauty"
                  ? t("Overview", "Преглед", "Përmbledhje")
                  : link.label}
              </span>
            </Link>
          );
        })}
      </nav>
      <div className={s.headerActions}>
        <StudioSwitcher orgId={profile.orgId} />
        {!hospitality && profile.role !== "staff" && (
          <Link
            href="/beauty/assistant"
            className={`${s.iconButton} dashboard-assistant-link`}
            aria-label={t(
              "Business assistant",
              "Деловен асистент",
              "Asistenti i biznesit",
            )}
            aria-current={
              pathname.startsWith("/beauty/assistant") ? "page" : undefined
            }
          >
            <ChartNoAxesCombined size={19} />
          </Link>
        )}
        {!hospitality && profile.bookingAccess !== "own" && (
          <>
            <Link
              href={
                profile.role === "owner"
                  ? "/settings"
                  : "/notifications/preferences"
              }
              className={s.iconButton}
              aria-label={
                profile.role === "owner"
                  ? t("Settings", "Поставки", "Cilësimet")
                  : t("My preferences", "Мои поставки", "Preferencat e mia")
              }
              aria-current={
                pathname ===
                (profile.role === "owner"
                  ? "/settings"
                  : "/notifications/preferences")
                  ? "page"
                  : undefined
              }
            >
              <Settings2 size={19} />
            </Link>
            {profile.orgId && (
              <NotificationBell orgId={profile.orgId} placement="header" />
            )}
          </>
        )}
        <span className={s.headerDivider} />
        {!hospitality && profile.bookingAccess === "own" ? (
          <PersonalStaffMenu />
        ) : (
          <DashboardAccountMenu profile={profile} />
        )}
      </div>
    </header>
  );
}
