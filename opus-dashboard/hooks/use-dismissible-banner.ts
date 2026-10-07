"use client";

import { useCallback, useState, useSyncExternalStore } from "react";

function subscribeToDismissal(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

export function useDismissibleBanner(storageKey: string) {
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const getDismissal = useCallback(() => {
    try {
      return window.localStorage.getItem(storageKey) === "true";
    } catch {
      return false;
    }
  }, [storageKey]);
  const savedDismissal = useSyncExternalStore(
    subscribeToDismissal,
    getDismissal,
    () => true,
  );

  function dismiss() {
    setDismissedKey(storageKey);
    try {
      window.localStorage.setItem(storageKey, "true");
    } catch {
      // Dismiss for this visit when browser storage is unavailable.
    }
  }

  return { dismissed: dismissedKey === storageKey || savedDismissal, dismiss };
}
