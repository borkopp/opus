"use client";

import { useState, useEffect } from "react";
import { resolveCityFromCoords } from "@/lib/mk-cities";
import { useUserLocation } from "@/hooks/use-user-location";

const DEFAULT_CITY = "Skopje";

export function useResolveCity(): {
  city: string;
  coords: { lat: number; lng: number } | null;
} {
  const { coords, state } = useUserLocation();
  const [city, setCity] = useState(DEFAULT_CITY);

  useEffect(() => {
    if (coords) {
      setCity(resolveCityFromCoords(coords));
    }
  }, [coords]);

  return { city, coords };
}
