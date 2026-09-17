"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type BeforeChange = (index: number, keyboard: boolean, reducedMotion: boolean) => void;

export function useAutoRotation(count: number, beforeChange?: BeforeChange) {
  const rootRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const countdown = useRef<Animation | null>(null);
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(preference.matches);
    const updateVisibility = () => setPageVisible(!document.hidden);
    updatePreference();
    updateVisibility();
    preference.addEventListener("change", updatePreference);
    document.addEventListener("visibilitychange", updateVisibility);
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting && entry.intersectionRatio >= 0.15),
      { threshold: 0.15 },
    );
    if (rootRef.current) observer.observe(rootRef.current);
    return () => {
      observer.disconnect();
      preference.removeEventListener("change", updatePreference);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);

  const showItem = useCallback((index: number, keyboard = false) => {
    if (index === active) return;
    beforeChange?.(index, keyboard, reducedMotion);
    setActive(index);
  }, [active, beforeChange, reducedMotion]);

  useEffect(() => {
    if (!progressRef.current || reducedMotion) return;
    // One animation controls both the indicator and the slide timing.
    const animation = progressRef.current.animate(
      [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }],
      { duration: 6000, easing: "linear", fill: "forwards" },
    );
    animation.pause();
    animation.onfinish = () => showItem((active + 1) % count);
    countdown.current = animation;
    return () => {
      animation.onfinish = null;
      animation.cancel();
      if (countdown.current === animation) countdown.current = null;
    };
  }, [active, count, reducedMotion, showItem]);

  useEffect(() => {
    if (hovered || focused || !visible || !pageVisible || reducedMotion) {
      countdown.current?.pause();
    } else {
      countdown.current?.play();
    }
  }, [active, focused, hovered, pageVisible, reducedMotion, showItem, visible]);

  return { rootRef, progressRef, active, reducedMotion, showItem, setHovered, setFocused };
}
