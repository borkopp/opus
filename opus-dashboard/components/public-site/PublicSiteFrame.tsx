"use client";

import { usePublicBookingI18n } from "./PublicBookingI18n";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, CalendarDays } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { initials } from "@/lib/dashboard-overview";
import { cn } from "@/lib/utils";
import { websiteLabels } from "@/lib/website-i18n";
import type { PublicSite } from "./types";

export function PublicSiteFrame({
  site,
  children,
  mode = "site",
  studioHref = "/",
}: {
  site: PublicSite;
  children: React.ReactNode;
  mode?: "site" | "booking";
  studioHref?: string;
}) {
  const { text, locale } = usePublicBookingI18n();
  const footerCopy = websiteLabels(locale).powered;
  return (
    <div
      className={cn(
        "public-site flex min-h-dvh flex-col bg-background text-foreground",
        mode === "site" &&
          "pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0",
      )}
    >
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur-xl">
        <div
          className={cn(
            "mx-auto flex h-16 w-full items-center justify-between gap-4 px-4 sm:px-6",
            mode === "booking" ? "max-w-5xl" : "max-w-6xl",
          )}
        >
          <Link
            href={studioHref}
            className="flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-card">
              {site.logoUrl ? (
                <Image
                  src={site.logoUrl}
                  alt={`${site.name} logo`}
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="36px"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="text-xs font-semibold text-primary"
                >
                  {initials(site.name)}
                </span>
              )}
            </span>
            <span className="truncate font-display text-base font-semibold sm:text-lg">
              {site.name}
            </span>
          </Link>

          {mode === "site" ? (
            <nav
              className="flex shrink-0 items-center gap-2 sm:gap-4"
              aria-label={text("Главна навигација")}
            >
              <div className="hidden items-center gap-5 text-sm text-muted-foreground md:flex">
                <Link
                  href="/#services"
                  className="rounded-md transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {text("Услуги")}
                </Link>
                {site.bio && (
                  <Link
                    href="/#about"
                    className="rounded-md transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {text("За студиото")}
                  </Link>
                )}
                <Link
                  href="/#info"
                  className="rounded-md transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {text("Информации")}
                </Link>
              </div>
              <ThemeToggle locale={locale} />
              <Button asChild size="sm" className="hidden md:inline-flex">
                <Link href="/book">
                  <CalendarDays data-icon="inline-start" />
                  {text("Резервирај")}
                </Link>
              </Button>
            </nav>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="micro-label hidden text-muted-foreground sm:inline">
                {text("Онлајн резервација")}
              </span>
              <ThemeToggle locale={locale} />
            </div>
          )}
        </div>
      </header>

      {mode === "site" && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-lg md:hidden">
          <Button asChild size="lg" className="min-h-12 w-full">
            <Link href="/book">
              <CalendarDays data-icon="inline-start" />
              {text("Резервирај термин")}
            </Link>
          </Button>
        </div>
      )}

      <div className="min-w-0 flex-1">{children}</div>

      <footer className="border-t border-border">
        <div
          className={cn(
            "mx-auto flex w-full flex-col gap-3 px-4 py-7 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6",
            mode === "booking" ? "max-w-5xl" : "max-w-6xl",
          )}
        >
          <p className="min-w-0 [overflow-wrap:anywhere]">
            © {new Date().getFullYear()} {site.name}
          </p>
          <Link
            href="https://opus.mk"
            aria-label={`${footerCopy} OPUS`}
            className="block w-fit min-w-0 max-w-full rounded-md py-2.5 leading-6 text-pretty text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {footerCopy}{" "}
            <span className="inline-flex items-center gap-1.5 align-middle whitespace-nowrap">
              <Logo className="text-xs" markClassName="h-3.5" />
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </span>
          </Link>
        </div>
      </footer>
    </div>
  );
}
