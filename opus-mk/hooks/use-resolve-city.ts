"use client";

import { useState, useEffect } from "react";

import { useUserLocation } from "@/hooks/use-user-location";
import { DEFAULT_MARKET_CITY } from "@/lib/product-scope";

async function fetchDisplayCity(
  lat: number,
  lng: number,
  token: string,
): Promise<string | null> {
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=place&limit=1&access_token=${token}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5_000) });
    if (!res.ok) return null;
    const data = await res.json();
    const feature = data.features?.[0];
    const country = feature?.context?.find((item: { id?: string; short_code?: string }) =>
      item.id?.startsWith("country."),
    );
    const countryCode = country?.short_code?.toLowerCase();
    if (countryCode !== "mk") return null;
    return (feature?.text as string) ?? null;
  } catch {
    return null;
  }
}

export function useResolveCity(): {
  /** Actual city name from Mapbox reverse geocoding */
  city: string | null;
  coords: { lat: number; lng: number } | null;
  isFallback: boolean;
  locationState: ReturnType<typeof useUserLocation>["state"];
} {
  const { coords, state } = useUserLocation();
  const [city, setCity] = useState<string | null>(null);
  const [reverseLookupFailed, setReverseLookupFailed] = useState(false);

  useEffect(() => {
    if (!coords) return;

    // Actual city from Mapbox for display
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (token) {
      fetchDisplayCity(coords.lat, coords.lng, token).then((resolvedCity) => {
        setCity(resolvedCity);
        setReverseLookupFailed(!resolvedCity);
      });
    }
  }, [coords]);

  const missingToken = Boolean(coords && !process.env.NEXT_PUBLIC_MAPBOX_TOKEN);
  const isFallback = state === "denied" || missingToken || reverseLookupFailed;

  return {
    city: city ?? (isFallback ? DEFAULT_MARKET_CITY : null),
    coords,
    isFallback,
    locationState: state,
  };
}
