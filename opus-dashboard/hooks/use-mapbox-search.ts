"use client";

import { useEffect, useState } from "react";
import { searchMapbox, type MapboxFeature } from "@/lib/mapbox";

export function useMapboxSearch(query: string, enabled = true) {
  const [results, setResults] = useState<MapboxFeature[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setResults([]);
      setIsSearching(false);
      setError(null);
      return;
    }

    const normalized = query.trim();
    if (normalized.length < 3) {
      setResults([]);
      setError(null);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsSearching(true);
      setError(null);
      try {
        setResults(await searchMapbox(normalized, controller.signal));
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        setError(caught instanceof Error ? caught.message : "Address search failed.");
      } finally {
        if (!controller.signal.aborted) setIsSearching(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [enabled, query]);

  return { results, isSearching, error, clearResults: () => setResults([]) };
}
