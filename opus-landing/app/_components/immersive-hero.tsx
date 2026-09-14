"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Tabs } from "radix-ui";
import { motion, useReducedMotion } from "motion/react";

import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { heroSlides, type HeroSlideId } from "@/lib/hero-slides";
import { landingCopy } from "@/lib/landing-copy";

import { HeroChapterRail } from "./hero-chapter-rail";
import { useHeroRotation } from "./use-hero-rotation";

export function ImmersiveHero() {
  const { locale } = useI18n();
  const slides = heroSlides[locale];
  const copy = landingCopy[locale];
  const [activeSlide, setActiveSlide] = useState<HeroSlideId>("website");
  const [keyboardNavigation, setKeyboardNavigation] = useState(false);
  const reduceMotion = useReducedMotion();
  const container = useRef<HTMLElement>(null);
  const progress = useRef<HTMLSpanElement>(null);
  const [replayKey, setReplayKey] = useState(0);
  const [readyImages, setReadyImages] = useState<HeroSlideId[]>([]);
  const advanceSlide = useCallback(() => {
    setKeyboardNavigation(false);
    setActiveSlide(
      (current) =>
        slides[
          (slides.findIndex((slide) => slide.id === current) + 1) %
            slides.length
        ].id,
    );
  }, [slides]);
  const rotation = useHeroRotation({
    container,
    progress,
    activeSlide,
    replayKey,
    reducedMotion: reduceMotion,
    imageReady: readyImages.includes(activeSlide),
    onAdvance: advanceSlide,
  });
  const selectSlide = (value: string) => {
    if (!slides.some((slide) => slide.id === value)) return;
    setActiveSlide(value as HeroSlideId);
    setReplayKey((key) => key + 1);
  };
  const stepSlide = (direction: number) => {
    const index = slides.findIndex((slide) => slide.id === activeSlide);
    selectSlide(slides[(index + direction + slides.length) % slides.length].id);
  };
  const instant = Boolean(reduceMotion || keyboardNavigation);
  const transition = {
    duration: instant ? 0 : 0.45,
    ease: [0.22, 1, 0.36, 1] as const,
  };

  return (
    <Tabs.Root value={activeSlide} onValueChange={selectSlide} asChild>
      <section
        id="studio-hero"
        ref={container}
        data-rotation-state={rotation.running ? "playing" : "paused"}
        onFocusCapture={(event) => {
          if (event.target.closest("[data-rotation-toggle]")) return;
          if (event.target.matches(":focus-visible"))
            rotation.setKeyboardFocus(true);
        }}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget))
            rotation.setKeyboardFocus(false);
        }}
        aria-label={
          locale === "mk" ? "OPUS за вашето студио" : "OPUS for your studio"
        }
        className="relative isolate flex min-h-[max(48rem,100svh)] flex-col overflow-hidden rounded-b-2xl bg-neutral-950 text-white lg:min-h-[max(44rem,100svh)]"
      >
        {slides.map((slide, index) => {
          const active = activeSlide === slide.id;
          return (
            <Tabs.Content
              key={slide.id}
              value={slide.id}
              forceMount
              aria-hidden={!active}
              inert={!active}
              tabIndex={-1}
              className="absolute inset-0 outline-none data-[state=inactive]:pointer-events-none"
            >
              <motion.div
                initial={false}
                animate={{ opacity: active ? 1 : 0 }}
                transition={transition}
                className="absolute inset-0"
              >
                <Image
                  src={slide.image}
                  alt={slide.alt}
                  fill
                  priority={index === 0}
                  quality={90}
                  onLoad={() =>
                    setReadyImages((ready) =>
                      ready.includes(slide.id) ? ready : [...ready, slide.id],
                    )
                  }
                  sizes="(min-width: 1024px) max(100vw, 200svh), 200svh"
                  className="object-cover object-[64%_center] lg:object-center"
                />
                <div className="absolute inset-0 bg-black/20" />
                <div className="absolute inset-0 bg-linear-to-r from-black/65 via-black/20 to-transparent lg:from-black/40 lg:via-transparent" />
                <div className="absolute inset-0 bg-linear-to-b from-black/30 via-transparent to-black/30" />
                <div className="absolute inset-0 bg-black/25 lg:hidden" />
              </motion.div>

              <div className="relative mx-auto w-full max-w-7xl px-6 pt-32 md:px-8 lg:pt-[clamp(9rem,18svh,12rem)]">
                <motion.div
                  initial={false}
                  animate={{
                    opacity: active ? 1 : 0,
                    transform:
                      instant || active
                        ? "translateY(0px)"
                        : "translateY(12px)",
                  }}
                  transition={{ ...transition, duration: instant ? 0 : 0.28 }}
                  className="max-w-5xl"
                >
                  <p className="mb-5 max-w-md text-xs leading-relaxed font-medium tracking-[0.08em] text-white/75 sm:text-sm">
                    {copy.audience}
                  </p>
                  <h1 className="text-[clamp(1.9rem,3.8vw,3.7rem)] leading-[1.1] font-medium tracking-[-0.035em] text-white">
                    {slide.title[0]}
                    <br />
                    {slide.title[1]}
                  </h1>
                  <p className="mt-6 max-w-[29rem] text-base leading-relaxed text-pretty text-white/90 md:text-lg">
                    {slide.description}
                  </p>
                  <div
                    className="mt-8 flex w-fit flex-wrap items-center gap-3 lg:mt-9"
                    onPointerEnter={(event) => {
                      if (event.pointerType === "mouse")
                        rotation.setHovered(true);
                    }}
                    onPointerLeave={() => rotation.setHovered(false)}
                  >
                    <Button asChild variant="hero" size="hero">
                      <Link href={slide.primary.href}>
                        {slide.primary.label}
                      </Link>
                    </Button>
                    <Button asChild variant="heroGlass" size="hero">
                      <Link href={slide.secondary.href}>
                        {slide.secondary.label}
                      </Link>
                    </Button>
                  </div>
                  <p className="mt-4 text-xs text-white/65">
                    {copy.reassurance}
                  </p>
                </motion.div>
              </div>
            </Tabs.Content>
          );
        })}

        <div className="pointer-events-none relative mx-auto mt-auto w-full max-w-7xl px-6 pt-[32rem] pb-5 md:px-8 lg:pb-9">
          <HeroChapterRail
            locale={locale}
            activeSlide={activeSlide}
            progress={progress}
            rotationEnabled={rotation.rotationEnabled}
            onStep={stepSlide}
            onToggle={rotation.toggleRotation}
            onHover={rotation.setHovered}
            onKeyboard={(keyboard) => {
              setKeyboardNavigation(keyboard);
              rotation.setKeyboardFocus(keyboard);
            }}
          />
        </div>
      </section>
    </Tabs.Root>
  );
}
