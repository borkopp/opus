import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PublicSite } from "./types";

export function PublicSiteFrame({
  site,
  children,
}: {
  site: PublicSite;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-card">
              {site.logoUrl ? (
                <Image
                  src={site.logoUrl}
                  alt={`${site.name} logo`}
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="40px"
                />
              ) : (
                <Scissors aria-hidden="true" />
              )}
            </span>
            <span className="truncate font-display text-base font-semibold sm:text-lg">
              {site.name}
            </span>
          </Link>

          <nav className="flex items-center gap-2" aria-label="Primary">
            <Button asChild size="sm">
              <Link href="/book">
                <CalendarDays data-icon="inline-start" />
                Резервирај
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      {children}

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>
            © {new Date().getFullYear()} {site.name}
          </p>
          <Link
            href="https://opus.mk"
            className="inline-flex w-fit items-center gap-1.5 rounded-md font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Резервации преку OPUS
            <ArrowUpRight aria-hidden="true" />
          </Link>
        </div>
      </footer>
    </div>
  );
}
