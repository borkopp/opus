"use client";

import type { RefObject } from "react";
import { Outfit } from "next/font/google";
import { Tabs } from "radix-ui";
import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";

import { heroSlides, type HeroSlideId } from "@/lib/hero-slides";
import type { Locale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export function HeroChapterRail({
  locale,
  activeSlide,
  progress,
  rotationEnabled,
  onStep,
  onToggle,
  onHover,
  onKeyboard,
}: {
  locale: Locale;
  activeSlide: HeroSlideId;
  progress: RefObject<HTMLSpanElement | null>;
  rotationEnabled: boolean;
  onStep: (direction: number) => void;
  onToggle: () => void;
  onHover: (hovered: boolean) => void;
  onKeyboard: (keyboard: boolean) => void;
}) {
  const slides = heroSlides[locale];
  const labels =
    locale === "mk"
      ? {
          explore: "Разгледајте го OPUS",
          previous: "Претходен слајд",
          next: "Следен слајд",
          pause: "Паузирај ротација",
          play: "Продолжи со ротација",
        }
      : {
          explore: "Explore OPUS",
          previous: "Previous slide",
          next: "Next slide",
          pause: "Pause slideshow",
          play: "Play slideshow",
        };

  const controlClass =
    "inline-flex size-11 shrink-0 cursor-pointer items-center justify-center text-white/75 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

  return (
    <div
      className="pointer-events-auto relative flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-7"
      style={{
        fontFamily: `${outfit.style.fontFamily}, var(--font-manrope-family), sans-serif`,
      }}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") onHover(true);
      }}
      onPointerLeave={() => onHover(false)}
      onPointerDownCapture={() => onKeyboard(false)}
    >
      <Tabs.List
        aria-label={labels.explore}
        onKeyDownCapture={() => onKeyboard(true)}
        className="grid min-w-0 flex-1 grid-flow-dense grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4 sm:gap-x-5"
      >
        {slides.map((slide) => {
          const active = slide.id === activeSlide;
          return (
            <Tabs.Trigger
              key={slide.id}
              value={slide.id}
              className="group relative flex min-h-16 cursor-pointer items-center gap-2 py-4 text-left outline-offset-4 focus-visible:outline-2 focus-visible:outline-white sm:min-h-20"
            >
              <span
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-px overflow-hidden bg-white/25"
              >
                <span
                  ref={active ? progress : undefined}
                  className="absolute inset-0 origin-left bg-white"
                  style={{ transform: "scaleX(0)" }}
                />
              </span>
              <span
                className={cn(
                  "text-base leading-tight transition-[color,transform] duration-300 group-hover:text-white sm:text-lg",
                  active ? "translate-x-2 text-white" : "text-white/65",
                )}
              >
                {slide.label}
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "ml-auto text-white transition-[opacity,transform] duration-300",
                  active
                    ? "translate-x-0 opacity-100"
                    : "-translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100",
                )}
              >
                <ArrowRight className="size-4" />
              </span>
            </Tabs.Trigger>
          );
        })}
      </Tabs.List>

      <div className="flex items-center justify-end gap-0.5 sm:border-l sm:border-white/20 sm:pl-4">
        <button
          type="button"
          className={controlClass}
          aria-label={labels.previous}
          onClick={() => onStep(-1)}
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          data-rotation-toggle
          className={controlClass}
          aria-label={rotationEnabled ? labels.pause : labels.play}
          onClick={onToggle}
        >
          {rotationEnabled ? (
            <Pause className="size-4" aria-hidden="true" />
          ) : (
            <Play className="size-4" aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          className={controlClass}
          aria-label={labels.next}
          onClick={() => onStep(1)}
        >
          <ArrowRight className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
