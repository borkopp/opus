"use client";

import React from "react";
import NavbarWithChildren from "@/block/navbar-with-children";
import { MeshGradient } from "@/components/hero";
import Image from "next/image";

export default function HeroSection() {
  return (
    <div className="dark min-h-screen w-full bg-neutral-950 font-sans selection:bg-white/20 pb-20">
      <div className="bg-neutral-950 text-white overflow-hidden pb-10">
        <NavbarWithChildren />

        <div className="mx-auto max-w-[1600px] px-4 md:px-6 relative z-10 pt-38 shrink-0">
          <MeshGradient
            containerClassName="max-w-[1500px] h-[85vh] md:h-[90vh] lg:h-[95vh] min-h-[800px] !py-0 !my-0"
            className="flex flex-col items-center pt-24 sm:pt-24 isolate w-full h-full relative !rounded-3xl border border-white/10"
          >
            <h1 className="mx-auto mb-6 max-w-5xl text-center font-display text-5xl font-bold tracking-tight text-white sm:text-7xl md:text-[5rem] leading-[1] drop-shadow-sm">
              Your business, running itself.
            </h1>
            <p className="mx-auto mb-10 max-w-2xl text-center text-lg font-medium text-white/80 md:text-xl md:leading-relaxed">
              Opus replaces your booking tool, front desk, and payment system — with one platform that gets smarter every day.
            </p>

            <div className="mb-14 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <button className="flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-black shadow-sm transition-colors hover:bg-neutral-100 active:scale-95">
                Get Started
              </button>
              <button className="rounded-xl border border-white/10 bg-black px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-neutral-800 hover:border-white/30 active:scale-95">
                Request a Demo
              </button>
            </div>

            <div className="relative mx-auto w-full max-w-[1100px] flex-1 px-4 sm:px-8 mt-auto h-full min-h-[350px]">
              <div className="absolute inset-x-4 sm:inset-x-8 bottom-0 top-0 overflow-hidden rounded-t-[1.25rem] border border-white/20 bg-neutral-950 shadow-2xl">
                <Image
                  src="/hero.png"
                  alt="AI Code Editor UI"
                  width={1400}
                  height={900}
                  className="h-full w-full object-cover object-top opacity-95"
                  priority
                />
              </div>
            </div>
          </MeshGradient>
        </div>
      </div>
    </div>
  );
}
