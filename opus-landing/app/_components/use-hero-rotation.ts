"use client";

import { useRef, useState, useSyncExternalStore, type RefObject } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { HeroSlideId } from "@/lib/hero-slides";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const SLIDE_SECONDS = 8;

function subscribeToVisibility(listener: () => void) {
  document.addEventListener("visibilitychange", listener);
  return () => document.removeEventListener("visibilitychange", listener);
}

export function useHeroRotation({
  container,
  progress,
  activeSlide,
  replayKey,
  reducedMotion,
  imageReady,
  onAdvance,
}: {
  container: RefObject<HTMLElement | null>;
  progress: RefObject<HTMLSpanElement | null>;
  activeSlide: HeroSlideId;
  replayKey: number;
  reducedMotion: boolean | null;
  imageReady: boolean;
  onAdvance: () => void;
}) {
  const timer = useRef<gsap.core.Tween | null>(null);
  const [inView, setInView] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  const [playOverride, setPlayOverride] = useState<boolean | null>(null);
  const documentVisible = useSyncExternalStore(
    subscribeToVisibility,
    () => document.visibilityState === "visible",
    () => false,
  );
  const rotationEnabled = playOverride ?? reducedMotion === false;
  const paused =
    !rotationEnabled ||
    hovered ||
    keyboardFocus ||
    !inView ||
    !documentVisible ||
    !imageReady;

  useGSAP(
    () => {
      const trigger = ScrollTrigger.create({
        trigger: container.current,
        start: "top 70%",
        end: "bottom 30%",
        onToggle: (self) => setInView(self.isActive),
        onRefresh: (self) => setInView(self.isActive),
      });
      setInView(trigger.isActive);
    },
    { scope: container },
  );

  useGSAP(
    () => {
      if (!progress.current) return;
      timer.current = gsap.fromTo(
        progress.current,
        { scaleX: 0 },
        {
          scaleX: 1,
          duration: SLIDE_SECONDS,
          ease: "none",
          paused: true,
          onComplete: onAdvance,
        },
      );
      return () => {
        timer.current = null;
      };
    },
    {
      scope: container,
      dependencies: [activeSlide, replayKey, onAdvance],
      revertOnUpdate: true,
    },
  );

  useGSAP(
    () => {
      timer.current?.paused(paused);
    },
    { dependencies: [paused, activeSlide, replayKey, onAdvance] },
  );

  return {
    running: !paused,
    rotationEnabled,
    setHovered,
    setKeyboardFocus,
    toggleRotation: () => {
      setPlayOverride(!rotationEnabled);
      setKeyboardFocus(false);
    },
  };
}
