"use client";

import { Logo } from "@/components/Logo";
import { HeaderAuth } from "@/components/HeaderAuth";
import { MarketplaceChat } from "@/components/MarketplaceChat";
import { useResolveCity } from "@/hooks/use-resolve-city";

export default function HomePage() {
  const { city, coords, isFallback } = useResolveCity();

  return (
    <div className="dark relative h-[100dvh] overflow-hidden bg-background">
      {/* Fixed top bar */}
      <header className="fixed top-0 left-0 right-0 z-50">
        <div className="max-w-2xl mx-auto px-5 py-3 flex items-center justify-between">
          <Logo className="text-xl text-background/90" />
          <div className="flex items-center gap-3">
            {city && (
              <div className="flex items-center gap-1.5 rounded-full border border-background/10 bg-ink-surface/40 px-3 py-1.5 backdrop-blur-md">
                <span
                  className="w-1.5 h-1.5 rounded-full bg-[var(--online)] shrink-0"
                  style={{ boxShadow: "0 0 6px var(--online)" }}
                />
                <span className="text-xs text-background/85">
                  {isFallback ? "Showing" : "You are in"} <b>{city}</b>
                </span>
              </div>
            )}

            <HeaderAuth />
          </div>
        </div>
      </header>

      {/* Main — fills full viewport, padding clears the fixed header */}
      <main
        className="absolute inset-0 z-10 flex flex-col"
        style={{ paddingTop: 56 }}
      >
        <MarketplaceChat
          city={city}
          coords={coords}
        />
      </main>

    </div>
  );
}
