"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "./button";

/** Deliberate activation, usable with a primary pointer or a held Space/Enter key. */
export function HoldButton({
  duration,
  disabled,
  busy,
  onConfirm,
}: {
  duration: number;
  disabled: boolean;
  busy: boolean;
  onConfirm: () => void;
}) {
  const [progress, setProgress] = useState(0);
  const active = useRef<{
    started: number;
    kind: "pointer" | "keyboard";
    key?: string;
  } | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const fired = useRef(false);
  const stop = useCallback(() => {
    active.current = null;
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setProgress(0);
  }, []);
  useEffect(() => {
    const hidden = () => {
      if (document.hidden) stop();
    };
    const release = () => stop();
    window.addEventListener("blur", stop);
    window.addEventListener("pointerup", release);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      if (timer.current) clearInterval(timer.current);
      window.removeEventListener("blur", stop);
      window.removeEventListener("pointerup", release);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [stop]);
  const start = (kind: "pointer" | "keyboard", key?: string) => {
    if (disabled || busy || active.current || fired.current) return;
    active.current = { started: performance.now(), kind, key };
    timer.current = setInterval(() => {
      if (!active.current || document.hidden || !document.hasFocus())
        return stop();
      const fraction = Math.min(
        1,
        (performance.now() - active.current.started) / duration,
      );
      setProgress(fraction);
      if (fraction >= 1) {
        fired.current = true;
        stop();
        onConfirm();
      }
    }, 40);
  };
  return (
    <Button
      type="button"
      variant="destructive"
      disabled={disabled || busy}
      className="relative h-11 w-full touch-none select-none [-webkit-touch-callout:none] overflow-hidden transition-transform active:scale-[0.98] motion-reduce:transform-none"
      aria-label={
        busy
          ? "Deleting organization"
          : `Hold for ${duration / 1000} seconds to delete organization`
      }
      onPointerDown={(event) => {
        if (!event.isPrimary || event.button !== 0) return;
        event.preventDefault();
        event.currentTarget.focus();
        start("pointer");
      }}
      onPointerLeave={stop}
      onPointerUp={stop}
      onPointerCancel={stop}
      onBlur={stop}
      onPointerMove={(event) => {
        if (active.current?.kind !== "pointer") return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          stop();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" || event.key === "Tab") stop();
        if (![" ", "Enter"].includes(event.key)) return;
        event.preventDefault();
        if (!event.repeat) start("keyboard", event.key);
      }}
      onKeyUp={(event) => {
        if (
          active.current?.kind === "keyboard" &&
          event.key === active.current.key
        ) {
          event.preventDefault();
          stop();
        }
      }}
      onClick={(event) => event.preventDefault()}
      onContextMenu={(event) => {
        event.preventDefault();
        stop();
      }}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 origin-left bg-black/20"
        style={{ transform: `scaleX(${progress})` }}
      />
      <span className="relative">
        {busy
          ? "Deleting…"
          : progress > 0
            ? `Keep holding… ${Math.ceil(((1 - progress) * duration) / 1000)}s`
            : `Hold ${duration / 1000} seconds to delete`}
      </span>
    </Button>
  );
}
