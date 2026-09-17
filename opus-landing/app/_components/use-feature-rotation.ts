"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { useAutoRotation } from "@/hooks/use-auto-rotation";

export function useFeatureRotation(count: number) {
  const gridRef = useRef<HTMLDivElement>(null);
  const previousRects = useRef(new Map<string, DOMRect>());
  const animations = useRef<Animation[]>([]);
  const focusFeatured = useRef(false);

  const beforeChange = useCallback((_index: number, keyboard: boolean, reducedMotion: boolean) => {
    previousRects.current.clear();
    if (!reducedMotion && !keyboard) {
      gridRef.current?.querySelectorAll<HTMLElement>("[data-feature]").forEach((element) => {
        previousRects.current.set(element.dataset.feature!, element.getBoundingClientRect());
      });
    }
    animations.current.forEach((animation) => animation.cancel());
    animations.current = [];
    focusFeatured.current = keyboard;
  }, []);
  const rotation = useAutoRotation(count, beforeChange);
  const { active } = rotation;

  useEffect(() => () => {
    animations.current.forEach((animation) => animation.cancel());
  }, []);

  useLayoutEffect(() => {
    gridRef.current?.querySelectorAll<HTMLElement>("[data-feature]").forEach((element) => {
      const before = previousRects.current.get(element.dataset.feature!);
      if (!before) return;
      const after = element.getBoundingClientRect();
      if (!after.width || !after.height) return;
      animations.current.push(element.animate([
        {
          transform: `translate(${before.left - after.left}px, ${before.top - after.top}px) scale(${before.width / after.width}, ${before.height / after.height})`,
        },
        { transform: "none" },
      ], { duration: 550, easing: "cubic-bezier(0.76, 0, 0.24, 1)" }));
      element.querySelectorAll<HTMLElement>("[data-feature-content]").forEach((content) => {
        animations.current.push(content.animate(
          [{ opacity: 0 }, { opacity: 0, offset: 0.28 }, { opacity: 1 }],
          { duration: 550, easing: "ease-out" },
        ));
      });
    });
    previousRects.current.clear();
    if (focusFeatured.current) {
      gridRef.current?.querySelector<HTMLElement>("[data-featured='true']")?.focus({ preventScroll: true });
      focusFeatured.current = false;
    }
  }, [active]);


  return { ...rotation, gridRef, showFeature: rotation.showItem };
}
