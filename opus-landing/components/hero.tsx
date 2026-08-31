"use client";

import React from "react";
import { Button } from "@/components/button";
import Image from "next/image";
import Link from "next/link";
import { LinesGradientShader } from "./lines-gradient-shader";
import { Badge } from "./badge";

export default function Hero() {
  return (
    <div className="bg-background relative min-h-screen w-full overflow-hidden">
      <LinesGradientShader
        className="absolute inset-0 bg-transparent dark:bg-transparent"
        bandSpacing={40}
        bandThickness={100}
        waveAmplitude={0.2}
        speed={1}
      />
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-12 md:px-8 md:py-32">
        <div>
          <Badge href="https://studio.opus.mk">
            За мали студија за убавина во Македонија
          </Badge>
        </div>

        <h1 className="font-display mt-4 max-w-3xl text-4xl font-bold tracking-tight text-white md:text-6xl">
          Помалку празни термини.
          <br />
          Повеќе резервирани клиенти.
        </h1>

        <p className="mt-4 max-w-2xl text-base text-white/90 md:text-xl">
          OPUS им помага на малите студија за убавина да управуваат со термини и
          да ги претворат откажувањата и празните места во календарот во
          резервирани термини.
        </p>

        <div className="mt-8 flex items-center gap-4">
          <Link href="https://studio.opus.mk">
            <Button>
              <span className="flex items-center gap-2">
                Отворете OPUS <Arrow className="size-4" />
              </span>
            </Button>
          </Link>
          <Link href="/#product">
            <Button className="hidden md:block" variant="outline">
              Дознајте повеќе
            </Button>
          </Link>
        </div>

        {/* MacBook Window */}
        <div className="mt-16 md:mt-24">
          <div className="relative mx-auto max-w-full">
            {/* Window Frame */}
            <div className="border-border/70 bg-card/80 overflow-hidden rounded-xl border backdrop-blur-sm">
              {/* Title Bar */}
              <div className="border-border/70 flex items-center gap-2 border-b px-4 py-2">
                <div className="flex items-center gap-1.5">
                  <div className="bg-danger size-3 rounded-full" />
                  <div className="bg-highlight size-3 rounded-full" />
                  <div className="bg-success size-3 rounded-full" />
                </div>
                <div className="flex-1 text-center">
                  <span className="text-muted-foreground text-xs">
                    studio.opus.mk
                  </span>
                </div>
                <div className="w-12" />
              </div>
              {/* Window Content */}
              <div className="relative aspect-16/10 w-full">
                <Image
                  src="/hero.png"
                  width={1920}
                  height={1080}
                  priority
                  quality={100}
                  alt="Dashboard Preview"
                  className="block h-full w-full object-fill object-top dark:hidden"
                />
                <Image
                  src="/hero-dark.png"
                  width={1920}
                  height={1080}
                  priority
                  quality={100}
                  alt="Dashboard Preview Dark"
                  className="hidden h-full w-full object-fill object-top dark:block"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const Arrow = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M5 12l14 0" />
      <path d="M15 16l4 -4" />
      <path d="M15 8l4 4" />
    </svg>
  );
};
