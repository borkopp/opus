"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useEntranceMotion } from "@/hooks/use-entrance-motion";
import { cn } from "@/lib/utils";

export function AnimatedNumber({
  value,
  locale,
  maximumFractionDigits = 0,
  signDisplay = "auto",
  suffix = "",
  delay = 0,
  className,
}: {
  value: number;
  locale: string;
  maximumFractionDigits?: number;
  signDisplay?: Intl.NumberFormatOptions["signDisplay"];
  suffix?: string;
  delay?: number;
  className?: string;
}) {
  const { ref, ready, animate } = useEntranceMotion<HTMLSpanElement>();
  const display = useRef<HTMLSpanElement>(null);
  const current = useRef(0);
  const started = useRef(false);
  const formatter = useMemo(
    () => new Intl.NumberFormat(locale, { maximumFractionDigits, signDisplay }),
    [locale, maximumFractionDigits, signDisplay],
  );
  const finalText = `${formatter.format(value)}${suffix}`;

  useLayoutEffect(() => {
    const element = display.current;
    if (!element) return;
    const write = (next: number) => {
      current.current = next;
      element.textContent = `${formatter.format(next)}${suffix}`;
    };
    if (!ready) {
      write(0);
      return;
    }
    if (!animate || current.current === value) {
      write(value);
      return;
    }
    const from = current.current;
    const duration = started.current ? 400 : 750;
    const startAt = performance.now() + (started.current ? 0 : delay);
    started.current = true;
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, Math.max(0, (now - startAt) / duration));
      write(
        progress === 1
          ? value
          : from + (value - from) * (1 - Math.pow(1 - progress, 3)),
      );
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, formatter, suffix, ready, animate, delay]);

  return (
    <span ref={ref} className={cn("inline-grid tabular-nums", className)}>
      {/* Reserve the final width and expose only the exact value to readers. */}
      <span className="invisible col-start-1 row-start-1" aria-hidden>
        {finalText}
      </span>
      <span ref={display} className="col-start-1 row-start-1" aria-hidden>
        {finalText}
      </span>
      <span className="sr-only">{finalText}</span>
    </span>
  );
}
