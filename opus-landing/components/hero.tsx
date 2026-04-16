"use client";

import React from "react";
import { Button } from "@/components/button";
import Image from "next/image";
import { LinesGradientShader } from "./lines-gradient-shader";
import { Badge } from "./badge";

export default function Hero() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-white dark:bg-neutral-950">
      <LinesGradientShader
        className="absolute inset-0 bg-transparent dark:bg-transparent"
        bandSpacing={40}
        bandThickness={100}
        waveAmplitude={0.2}
        speed={1}
      />
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-12 md:px-8 md:py-32">
        <div>
          <Badge href="/register">Запознајте го вашиот нов дигитален асистент</Badge>
        </div>

        <h1 className="mt-4 max-w-3xl text-4xl font-normal tracking-tight text-neutral-700 md:text-6xl dark:text-neutral-300">
          Вашиот бизнис работи.
          <br />
          Вие <span className="text-brand-primary font-playfair italic md:text-7xl font-medium" > владеете</span> со него.
        </h1>

        <p className="mt-4 max-w-2xl text-base text-neutral-700 md:text-xl dark:text-neutral-300">
          OPUS го автоматизира закажувањето, плаќањата и комуникацијата со клиенти. Од салони за убавина до ресторани. Сè на едно место.
        </p>

        <div className="mt-8 flex items-center gap-4">
          <Button>
            <span className="flex items-center gap-2">
              Започнете бесплатно <Arrow className="size-4" />
            </span>
          </Button>
          <Button variant="outline">Дознајте повеќе</Button>
        </div>

        {/* MacBook Window */}
        <div className="mt-16 md:mt-24">
          <div className="relative mx-auto max-w-full">
            {/* Window Frame */}
            <div className="overflow-hidden rounded-xl border border-neutral-300/50 bg-white/70 backdrop-blur-sm dark:border-neutral-700/50 dark:bg-neutral-900/70">
              {/* Title Bar */}
              <div className="flex items-center gap-2 border-b border-neutral-200/50 px-4 py-3 dark:border-neutral-700/50">
                <div className="flex items-center gap-1.5">
                  <div className="size-3 rounded-full bg-red-500" />
                  <div className="size-3 rounded-full bg-yellow-500" />
                  <div className="size-3 rounded-full bg-green-500" />
                </div>
                <div className="flex-1 text-center">
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    app.opus.mk
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
