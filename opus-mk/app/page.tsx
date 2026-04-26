"use client";

import { useState } from "react";
import { Logo } from "@/components/Logo";
import { HeaderAuth } from "@/components/HeaderAuth";
import { MarketplaceChat } from "@/components/MarketplaceChat";
import { useResolveCity } from "@/hooks/use-resolve-city";

export default function HomePage() {
  const { displayCity } = useResolveCity();
  const [hasStarted, setHasStarted] = useState(false);

  return (
    <div className="dark h-[100dvh] bg-black relative overflow-hidden">
      {/* Cinematic background photo — Mobile */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-opacity duration-700 md:hidden"
        style={{
          backgroundImage: "url('/abstract-vertical.png')",
          opacity: hasStarted ? 0.12 : 0.9,
        }}
      />
      {/* Cinematic background photo — Tablet & Above */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-opacity duration-700 hidden md:block"
        style={{
          backgroundImage: "url('/abstract-bg.jpg')",
          opacity: hasStarted ? 0.12 : 0.9,
        }}
      />
      {/* Gradient overlay */}
      <div
        className="absolute inset-0 transition-opacity duration-700"
        style={{
          background: hasStarted
            ? "rgba(0,0,0,0.88)"
            : "linear-gradient(180deg, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0) 28%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.72) 72%, rgba(0,0,0,0.97) 100%)",
        }}
      />

      {/* Fixed top bar */}
      <header className="fixed top-0 left-0 right-0 z-50">
        <div className="max-w-2xl mx-auto px-5 py-3 flex items-center justify-between">
          <Logo className="text-xl text-white/90" />
          <div className="flex items-center gap-3">
            {displayCity && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
                <span
                  className="w-1.5 h-1.5 rounded-full bg-[var(--online)] shrink-0"
                  style={{ boxShadow: "0 0 6px var(--online)" }}
                />
                <span className="text-xs text-white/85">{displayCity}</span>
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
        <MarketplaceChat onFirstMessage={() => setHasStarted(true)} />
      </main>

    </div>
  );
}
