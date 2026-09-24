"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { useRetainedQueryResult } from "./use-retained-query-result";
import { api } from "@/convex/_generated/api";

const MINUTE_MS = 60_000;
const currentMinute = () => Math.floor(Date.now() / MINUTE_MS) * MINUTE_MS;

export function useFreePlanAnalytics() {
  // Both cards share the same cached query. Moving the window each minute also
  // refreshes a quiet studio's analytics when no booking writes occur.
  const [endMs, setEndMs] = useState(currentMinute);

  useEffect(() => {
    const refresh = () => setEndMs(currentMinute());
    const timer = window.setInterval(refresh, MINUTE_MS);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  return useRetainedQueryResult(
    useQuery(api.dashboard.getFreePlanAnalytics, { endMs }),
  );
}
