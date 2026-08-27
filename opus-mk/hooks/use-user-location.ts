"use client";

import { useState, useEffect } from "react";

export type LocationState = "idle" | "loading" | "granted" | "denied";

export interface UserLocation {
  coords: { lat: number; lng: number } | null;
  state: LocationState;
}

/**
 * Requests the browser's geolocation once on mount.
 * Returns coords + a state flag. No retry support — callers
 * should handle the "denied" state gracefully (e.g. skip sort).
 */
export function useUserLocation(): UserLocation {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [state, setState] = useState<LocationState>("loading");

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      const timer = window.setTimeout(() => setState("denied"), 0);
      return () => window.clearTimeout(timer);
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setState("granted");
      },
      () => setState("denied"),
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }, []);

  return { coords, state };
}
