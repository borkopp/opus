"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import {
  normalizePromotionPalette,
  type PromotionPalette,
} from "@/lib/promotion-palette";

const CHANGE_EVENT = "opus-promotion-palette-change";
const memory = new Map<string, string>();

function readPalette(key: string) {
  if (memory.has(key)) return memory.get(key)!;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function subscribe(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key) memory.delete(event.key);
    else memory.clear();
    onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

export function usePromotionPalette(bookingUrl: string) {
  // The tenant origin stays the same across opening links, formats and languages.
  const key = `opus:promotion-palette:v1:${new URL(bookingUrl).origin}`;
  const snapshot = useSyncExternalStore(
    subscribe,
    useCallback(() => readPalette(key), [key]),
    () => null,
  );
  const palette = useMemo(() => {
    try {
      return normalizePromotionPalette(snapshot ? JSON.parse(snapshot) : null);
    } catch {
      return normalizePromotionPalette(null);
    }
  }, [snapshot]);

  const setPalette = (next: PromotionPalette) => {
    const serialized = JSON.stringify(normalizePromotionPalette(next));
    memory.set(key, serialized);
    try {
      localStorage.setItem(key, serialized);
    } catch {
      // The picker still works for this session when storage is unavailable.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };
  return [palette, setPalette] as const;
}
