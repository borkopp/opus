"use client";

import { useState, useEffect } from "react";
import { resolveCityFromCoords } from "@/lib/mk-cities";
import { useUserLocation } from "@/hooks/use-user-location";

async function fetchDisplayCity(
  lat: number,
  lng: number,
  token: string,
): Promise<string | null> {
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=place&limit=1&access_token=${token}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return (data.features?.[0]?.text as string) ?? null;
  } catch {
    return null;
  }
}

export function useResolveCity(): {
  /** Actual city name from Mapbox reverse geocoding — for display in navbar */
  displayCity: string | null;
  /** Nearest Macedonian city — sent to retrieve action for ranking; null if outside service area */
  city: string | null;
  coords: { lat: number; lng: number } | null;
} {
  const { coords } = useUserLocation();
  const [displayCity, setDisplayCity] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);

  useEffect(() => {
    if (!coords) return;

    // MK city for retrieve ranking (synchronous)
    setCity(resolveCityFromCoords(coords));

    // Actual city from Mapbox for display
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (token) {
      fetchDisplayCity(coords.lat, coords.lng, token).then(setDisplayCity);
    }
  }, [coords]);

  return { displayCity, city, coords };
}
