"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

/** Refresh time-based server projections without using the device clock for status. */
export function useReservationRefresh(enabled = true) {
  const [refreshKey, setRefreshKey] = useState(() => Date.now());
  const [pending, startTransition] = useTransition();
  const refresh = useCallback(() => {
    startTransition(() => setRefreshKey((previous) => previous + 1));
  }, []);
  useEffect(() => {
    if (!enabled) return;
    const refreshVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const timer = window.setInterval(refreshVisible, 30_000);
    window.addEventListener("focus", refreshVisible);
    document.addEventListener("visibilitychange", refreshVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshVisible);
      document.removeEventListener("visibilitychange", refreshVisible);
    };
  }, [enabled, refresh]);
  return { refreshKey, pending, refresh };
}
