import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, Scissors } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import type { PublicSite } from "./types";

export function PublicSiteFrame({
  site,
  children,
  mode = "site",
}: {
  site: PublicSite;
  children: React.ReactNode;
  mode?: "site" | "booking";
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            href="/"
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
                <Scissors aria-hidden="true" className="size-4" />
              )}
            </span>
            <span className="truncate font-display text-base font-semibold sm:text-lg">
              {site.name}
            </span>
          </Link>

          {mode === "site" ? (
            <nav
              className="flex items-center gap-2 sm:gap-5"
              aria-label="Главна навигација"
            >
              <div className="hidden items-center gap-5 text-sm text-muted-foreground md:flex">
                <Link
                  href="/#services"
                  className="rounded-md transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Услуги
                </Link>
                {site.bio && (
                  <Link
                    href="/#about"
                    className="rounded-md transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    За студиото
                  </Link>
                )}
                <Link
                  href="/#info"
                  className="rounded-md transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Информации
                </Link>
              </div>
              <Button asChild size="sm">
                <Link href="/book">
                  <CalendarDays data-icon="inline-start" />
                  Резервирај
                </Link>
              </Button>
            </nav>
          ) : (
            <span className="micro-label hidden text-muted-foreground sm:inline">
              Онлајн резервација
            </span>
          )}
        </div>
      </header>

      <div className="flex-1">{children}</div>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-7 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            © {new Date().getFullYear()} {site.name}
          </p>
          <Link
            href="https://opus.mk"
            aria-label="Резервации преку OPUS"
            className="inline-flex w-fit items-center gap-2 rounded-md text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span>Резервации преку</span>
            <Logo className="text-xs" markClassName="h-3.5" />
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      </footer>
    </div>
  );
}
