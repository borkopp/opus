"use client";

import { useLayoutEffect, useRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import styles from "./appear.module.css";

type AppearProps = HTMLAttributes<HTMLElement> & {
  as?: "div" | "section" | "article";
  delay?: number;
};

/** Reveal once per mount; data-appear children have their own entrance timing. */
export function Appear({
  as: Element = "div",
  delay = 0,
  className,
  style,
  ...props
}: AppearProps) {
  const ref = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (preference.matches || !("IntersectionObserver" in window)) {
      element.dataset.appearState = "complete";
      return;
    }
    element.dataset.appearState = "pending";
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          element.dataset.appearState = "visible";
          observer.disconnect();
        }
      },
      { threshold: 0, rootMargin: "0px 0px -24px 0px" },
    );
    const skipOnFocus = () => {
      element.dataset.appearState = "complete";
      observer.disconnect();
    };
    const skip = () => {
      if (preference.matches) skipOnFocus();
    };
    observer.observe(element);
    // Keyboard navigation must never wait for decorative motion.
    element.addEventListener("focusin", skipOnFocus);
    preference.addEventListener("change", skip);
    return () => {
      observer.disconnect();
      element.removeEventListener("focusin", skipOnFocus);
      preference.removeEventListener("change", skip);
    };
  }, []);

  return (
    <Element
      {...props}
      ref={ref as React.Ref<HTMLDivElement>}
      className={cn(styles.root, className)}
      style={
        { ...style, "--appear-delay": `${delay}ms` } as React.CSSProperties
      }
    />
  );
}
