"use client";

import { useState } from "react";
import { Logo } from "@/components/Logo";
import { HeaderAuth } from "@/components/HeaderAuth";
import { MarketplaceChat } from "@/components/MarketplaceChat";
import { useResolveCity } from "@/hooks/use-resolve-city";

export default function HomePage() {
  const { city, coords, isFallback } = useResolveCity();
  const [hasStarted, setHasStarted] = useState(false);

  return (
    <div className="dark h-[100dvh] bg-black relative overflow-hidden">
      {/* Cinematic background photo — Mobile */}
      <div
        className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 md:hidden ${hasStarted ? 'opacity-20' : 'opacity-90'}`}
        style={{
          backgroundImage: "url('/abstract-vertical.png')",
        }}
      />
      {/* Cinematic background photo — Tablet & Above */}
      <div
        className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 hidden md:block ${hasStarted ? 'opacity-10' : 'opacity-60'}`}
        style={{
          backgroundImage: "url('/abstract-bg.jpg')",
        }}
      />

      {/* Gradient overlay for initial state */}
      <div
        className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${hasStarted ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        style={{
          background: "linear-gradient(180deg, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0) 28%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.72) 72%, rgba(0,0,0,0.97) 100%)",
        }}
      />

      {/* Dark dim overlay for chat state */}
      <div
        className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${hasStarted ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        style={{
          background: "rgba(0,0,0,0.40)"
        }}
      />

      {/* Fixed top bar */}
      <header className="fixed top-0 left-0 right-0 z-50">
        <div className="max-w-2xl mx-auto px-5 py-3 flex items-center justify-between">
          <Logo className="text-xl text-white/90" />
          <div className="flex items-center gap-3">
            {city && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
                <span
                  className="w-1.5 h-1.5 rounded-full bg-[var(--online)] shrink-0"
                  style={{ boxShadow: "0 0 6px var(--online)" }}
                />
                <span className="text-xs text-white/85">
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
          onFirstMessage={() => setHasStarted(true)}
        />
      </main>

    </div>
  );
}
