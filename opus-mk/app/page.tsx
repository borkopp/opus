"use client";

import { Logo } from "@/components/Logo";
import { HeaderAuth } from "@/components/HeaderAuth";
import { MarketplaceChat } from "@/components/MarketplaceChat";
import { IconMapPin, IconLayoutGrid } from "@tabler/icons-react";
import { useResolveCity } from "@/hooks/use-resolve-city";
import Link from "next/link";

export default function HomePage() {
  const { displayCity } = useResolveCity();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40 shrink-0">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Logo className="text-xl" />
          <div className="flex items-center gap-3">
            {displayCity && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <IconMapPin size={13} aria-hidden="true" />
              <span>{displayCity}</span>
            </div>
          )}
            <Link
              href="/discover"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Browse all businesses"
            >
              <IconLayoutGrid size={15} />
              <span className="hidden sm:inline">Browse</span>
            </Link>
            <HeaderAuth />
          </div>
        </div>
      </header>

      {/* ── Chat area — fills remaining viewport height ── */}
      <main className="flex-1 flex flex-col max-w-2xl w-full mx-auto px-0 sm:px-4 min-h-0">
        <MarketplaceChat />
      </main>
    </div>
  );
}
