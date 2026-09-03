"use client";

import React, { createContext, useContext, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useTheme } from "next-themes";
import {
  IconMenu2,
  IconX,
  IconLayoutSidebarLeftCollapse,
  IconSun,
  IconMoon,
  IconDeviceDesktop,
  IconSettings,
  IconLogout,
  IconChevronRight,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { Logo, LogoMark, LogoWordmark } from "@/components/Logo";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { authClient } from "@/lib/auth-client";
import type { Id } from "@/convex/_generated/dataModel";
import { WebsiteBanner } from "@/components/dashboard/WebsiteBanner";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";

export interface NavLinkItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

export interface UserProfileData {
  orgId?: Id<"orgs">;
  industry?: string;
  user?: {
    name?: string;
    email?: string;
    avatarUrl?: string;
  } | null;
}

interface SidebarContextType {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean | ((prev: boolean) => boolean)) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (value: boolean | ((prev: boolean) => boolean)) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsedState] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("opus_sidebar_collapsed");
        if (saved !== null) {
          return saved === "true";
        }
      } catch {
        // Ignore localStorage errors
      }
    }
    return false;
  });
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const setIsCollapsed = (value: boolean | ((prev: boolean) => boolean)) => {
    setIsCollapsedState((prev) => {
      const next = typeof value === "function" ? value(prev) : value;
      try {
        localStorage.setItem("opus_sidebar_collapsed", String(next));
      } catch {
        // Ignore localStorage errors
      }
      return next;
    });
  };

  return (
    <SidebarContext.Provider
      value={{
        isCollapsed,
        setIsCollapsed,
        isMobileOpen,
        setIsMobileOpen,
      }}
    >
      <TooltipProvider delayDuration={150}>{children}</TooltipProvider>
    </SidebarContext.Provider>
  );
}

interface AppSidebarProps {
  profile?: UserProfileData | null;
  primaryLinks: NavLinkItem[];
  industryBase: string;
}

export function AppSidebar({
  profile,
  primaryLinks,
  industryBase,
}: AppSidebarProps) {
  const { isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen } =
    useSidebar();
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { t } = useDashboardI18n();

  return (
    <>
      {/* ── Desktop Sidebar ───────────────────────────────────── */}
      <motion.aside
        aria-label={t("Main Navigation", "Главна навигација")}
        initial={false}
        animate={{
          width: isCollapsed ? 72 : 256,
        }}
        transition={{
          duration: 0.22,
          ease: [0.23, 1, 0.32, 1],
        }}
        className={cn(
          "hidden md:flex flex-col h-screen shrink-0 border-r border-sidebar-border bg-sidebar relative z-30 select-none overflow-hidden",
        )}
      >
        {/* Sidebar Header: Logo & Toggle */}
        <div
          className={cn(
            "flex h-16 items-center border-b border-sidebar-border/60 shrink-0",
            isCollapsed ? "justify-center px-0" : "justify-between px-3.5",
          )}
        >
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setIsCollapsed(false)}
                  className="flex items-center justify-center outline-none rounded-xl p-2 hover:bg-sidebar-accent/60 transition-colors active:scale-95 cursor-pointer"
                  aria-label={t("Expand sidebar", "Прошири странично мени")}
                >
                  <LogoMark className="h-7 w-auto text-primary" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={12}>
                {t("Expand sidebar", "Прошири странично мени")}
              </TooltipContent>
            </Tooltip>
          ) : (
            <>
              <div className="flex items-center gap-3 overflow-hidden">
                <Link
                  href={industryBase}
                  aria-label={t("OPUS dashboard", "OPUS контролна табла")}
                  className="flex items-center gap-2.5 outline-none rounded-lg p-1 hover:opacity-90 transition-opacity"
                >
                  <LogoMark className="h-7 w-auto text-primary" />
                  <LogoWordmark className="text-xl text-primary" />
                </Link>
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setIsCollapsed(true)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60 transition-colors active:scale-95 shrink-0"
                    aria-label={t("Collapse sidebar", "Склопи странично мени")}
                  >
                    <IconLayoutSidebarLeftCollapse className="h-4.5 w-4.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={10}>
                  {t("Collapse sidebar", "Склопи странично мени")}
                </TooltipContent>
              </Tooltip>
            </>
          )}
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-2.5 space-y-1.5 scrollbar-thin">
          {primaryLinks.map((link) => {
            const isActive =
              pathname === link.href ||
              (link.href !== industryBase &&
                link.href !== "/settings" &&
                pathname.startsWith(link.href));
            const isSettings = link.href === "/settings";

            const linkContent = (
              <Link
                href={link.href}
                className={cn(
                  "group relative flex items-center rounded-lg transition-all duration-200 cursor-pointer active:scale-[0.98]",
                  isCollapsed
                    ? "h-10 w-10 mx-auto justify-center"
                    : "h-10 w-full px-3 justify-start gap-3",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/70",
                )}
              >
                <div
                  className={cn(
                    "shrink-0 flex items-center justify-center transition-colors",
                    isActive
                      ? "text-primary-foreground"
                      : "text-muted-foreground group-hover:text-foreground",
                  )}
                >
                  {link.icon}
                </div>

                <AnimatePresence initial={false}>
                  {!isCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                      className="text-sm font-medium whitespace-nowrap overflow-hidden truncate"
                    >
                      {link.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );

            return (
              <React.Fragment key={link.href}>
                {isSettings && profile?.orgId && (
                  <NotificationBell
                    orgId={profile.orgId}
                    placement="sidebar-nav"
                    collapsed={isCollapsed}
                  />
                )}
                {isCollapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                    <TooltipContent side="right" sideOffset={12}>
                      {link.label}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  linkContent
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Studio Website Compact Banner */}
        {profile?.orgId && (
          <div className="px-2.5 pb-2.5 shrink-0">
            <WebsiteBanner orgId={profile.orgId} collapsed={isCollapsed} />
          </div>
        )}

        {/* Bottom Section: User Account */}
        <div className="p-2.5 border-t border-sidebar-border/60 shrink-0 bg-sidebar">
          {/* User Account / Profile Row */}
          <div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "group flex items-center rounded-lg transition-colors hover:bg-secondary/70 outline-none w-full text-left active:scale-[0.98] cursor-pointer",
                    isCollapsed ? "p-1 justify-center" : "p-2 gap-3",
                  )}
                >
                  <Avatar className="h-9 w-9 shrink-0 border border-border/60 shadow-xs">
                    <AvatarImage
                      src={profile?.user?.avatarUrl}
                      alt={profile?.user?.name ?? t("User", "Корисник")}
                    />
                    <AvatarFallback className="font-semibold text-xs bg-primary/10 text-primary">
                      {(profile?.user?.name ?? "U").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <AnimatePresence initial={false}>
                    {!isCollapsed && (
                      <motion.div
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{
                          duration: 0.18,
                          ease: [0.23, 1, 0.32, 1],
                        }}
                        className="flex-1 min-w-0 overflow-hidden"
                      >
                        <p className="text-xs font-semibold text-foreground truncate leading-tight">
                          {profile?.user?.name ?? t("Account", "Профил")}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate leading-normal">
                          {profile?.user?.email ?? ""}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {!isCollapsed && (
                    <IconChevronRight className="h-4 w-4 text-muted-foreground/60 shrink-0 group-hover:text-foreground transition-colors" />
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-56"
                side={isCollapsed ? "right" : "top"}
                align={isCollapsed ? "end" : "start"}
                sideOffset={10}
              >
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-semibold leading-none">
                      {profile?.user?.name ?? t("Account", "Профил")}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground truncate">
                      {profile?.user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={() => router.push("/settings")}
                    className="cursor-pointer"
                  >
                    <IconSettings className="mr-2 h-4 w-4" />
                    <span>{t("Settings", "Поставки")}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="cursor-pointer">
                      <IconSun className="mr-2 h-4 w-4 dark:hidden" />
                      <IconMoon className="mr-2 h-4 w-4 hidden dark:block" />
                      <span>{t("Theme", "Тема")}</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-36">
                      <DropdownMenuRadioGroup
                        value={theme ?? "system"}
                        onValueChange={setTheme}
                      >
                        <DropdownMenuRadioItem
                          value="light"
                          className="cursor-pointer"
                        >
                          <IconSun className="mr-2 h-4 w-4" />
                          <span>{t("Light", "Светла")}</span>
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem
                          value="dark"
                          className="cursor-pointer"
                        >
                          <IconMoon className="mr-2 h-4 w-4" />
                          <span>{t("Dark", "Темна")}</span>
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem
                          value="system"
                          className="cursor-pointer"
                        >
                          <IconDeviceDesktop className="mr-2 h-4 w-4" />
                          <span>{t("System", "Системска")}</span>
                        </DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    void authClient
                      .signOut()
                      .then(() => router.replace("/login"));
                  }}
                  className="text-destructive focus:bg-destructive/10 cursor-pointer"
                >
                  <IconLogout className="mr-2 h-4 w-4" />
                  <span>{t("Log out", "Одјава")}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </motion.aside>

      {/* ── Mobile Top Header Bar (< md) ──────────────────────── */}
      <header className="flex md:hidden h-16 w-full shrink-0 items-center justify-between px-4 border-b border-sidebar-border bg-sidebar/95 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsMobileOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/80 text-foreground hover:bg-secondary transition-colors border border-border/40 active:scale-95 cursor-pointer"
            aria-label={t("Open menu", "Отвори мени")}
          >
            <IconMenu2 className="h-5 w-5" />
          </button>
          <Link
            href={industryBase}
            aria-label={t("OPUS dashboard", "OPUS контролна табла")}
            className="flex items-center gap-2"
          >
            <Logo className="text-lg" markClassName="h-6" />
          </Link>
        </div>

        <div className="flex items-center gap-2.5">
          {profile?.orgId && (
            <NotificationBell orgId={profile.orgId} placement="header" />
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="outline-none active:scale-95 cursor-pointer">
                <Avatar className="h-9 w-9 border border-border/60 shadow-xs">
                  <AvatarImage
                    src={profile?.user?.avatarUrl}
                    alt={profile?.user?.name ?? t("User", "Корисник")}
                  />
                  <AvatarFallback className="font-semibold text-xs bg-primary/10 text-primary">
                    {(profile?.user?.name ?? "U").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" sideOffset={8}>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-semibold leading-none">
                    {profile?.user?.name ?? t("Account", "Профил")}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground truncate">
                    {profile?.user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={() => router.push("/settings")}
                  className="cursor-pointer"
                >
                  <IconSettings className="mr-2 h-4 w-4" />
                  <span>{t("Settings", "Поставки")}</span>
                </DropdownMenuItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="cursor-pointer">
                    <IconSun className="mr-2 h-4 w-4 dark:hidden" />
                    <IconMoon className="mr-2 h-4 w-4 hidden dark:block" />
                    <span>{t("Theme", "Тема")}</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-36">
                    <DropdownMenuRadioGroup
                      value={theme ?? "system"}
                      onValueChange={setTheme}
                    >
                      <DropdownMenuRadioItem
                        value="light"
                        className="cursor-pointer"
                      >
                        <IconSun className="mr-2 h-4 w-4" />
                        <span>{t("Light", "Светла")}</span>
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem
                        value="dark"
                        className="cursor-pointer"
                      >
                        <IconMoon className="mr-2 h-4 w-4" />
                        <span>{t("Dark", "Темна")}</span>
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem
                        value="system"
                        className="cursor-pointer"
                      >
                        <IconDeviceDesktop className="mr-2 h-4 w-4" />
                        <span>{t("System", "Системска")}</span>
                      </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  void authClient
                    .signOut()
                    .then(() => router.replace("/login"));
                }}
                className="text-destructive focus:bg-destructive/10 cursor-pointer"
              >
                <IconLogout className="mr-2 h-4 w-4" />
                <span>{t("Log out", "Одјава")}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* ── Mobile Slide-out Drawer ───────────────────────────── */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsMobileOpen(false)}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs md:hidden"
            />

            {/* Slide-out Drawer panel */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
              className="fixed inset-y-0 left-0 z-50 flex h-full w-[280px] max-w-[85vw] flex-col justify-between bg-sidebar border-r border-sidebar-border p-4 shadow-2xl md:hidden"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-sidebar-border/60">
                <Link
                  href={industryBase}
                  onClick={() => setIsMobileOpen(false)}
                  aria-label={t("OPUS dashboard", "OPUS контролна табла")}
                  className="flex items-center gap-2.5"
                >
                  <Logo className="text-xl" markClassName="h-7" />
                </Link>
                <button
                  type="button"
                  onClick={() => setIsMobileOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  aria-label={t("Close menu", "Затвори мени")}
                >
                  <IconX className="h-5 w-5" />
                </button>
              </div>

              {/* Drawer Nav links */}
              <div className="flex-1 overflow-y-auto py-4 space-y-1.5">
                {primaryLinks.map((link) => {
                  const isActive =
                    pathname === link.href ||
                    (link.href !== industryBase &&
                      link.href !== "/settings" &&
                      pathname.startsWith(link.href));
                  const isSettings = link.href === "/settings";

                  return (
                    <React.Fragment key={link.href}>
                      {isSettings && profile?.orgId && (
                        <NotificationBell
                          orgId={profile.orgId}
                          placement="drawer-nav"
                        />
                      )}
                      <Link
                        href={link.href}
                        onClick={() => setIsMobileOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all active:scale-[0.98]",
                          isActive
                            ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary/70",
                        )}
                      >
                        <div
                          className={cn(
                            "shrink-0",
                            isActive
                              ? "text-primary-foreground"
                              : "text-muted-foreground",
                          )}
                        >
                          {link.icon}
                        </div>
                        <span>{link.label}</span>
                      </Link>
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Drawer Footer */}
              <div className="pt-4 border-t border-sidebar-border/60 space-y-3">
                {profile?.orgId && <WebsiteBanner orgId={profile.orgId} />}

                <div className="flex items-center gap-3 px-1">
                  <Avatar className="h-10 w-10 border border-border/60">
                    <AvatarImage
                      src={profile?.user?.avatarUrl}
                      alt={profile?.user?.name ?? t("User", "Корисник")}
                    />
                    <AvatarFallback className="font-semibold text-xs bg-primary/10 text-primary">
                      {(profile?.user?.name ?? "U").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {profile?.user?.name ?? t("Account", "Профил")}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {profile?.user?.email}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileOpen(false);
                      router.push("/settings");
                    }}
                    className="flex items-center justify-center gap-1.5 h-9 rounded-lg bg-secondary text-foreground text-xs font-medium hover:bg-secondary/80 transition-colors"
                  >
                    <IconSettings className="h-4 w-4" />
                    <span>{t("Settings", "Поставки")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileOpen(false);
                      void authClient
                        .signOut()
                        .then(() => router.replace("/login"));
                    }}
                    className="flex items-center justify-center gap-1.5 h-9 rounded-lg bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition-colors"
                  >
                    <IconLogout className="h-4 w-4" />
                    <span>{t("Log out", "Одјава")}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
