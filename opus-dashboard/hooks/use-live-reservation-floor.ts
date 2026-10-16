"use client";

import { useConvexConnectionState, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRetainedQueryResult } from "./use-retained-query-result";
import { useReservationRefresh } from "./use-reservation-refresh";

/** Mount under an org-keyed boundary so retained visits cannot cross businesses. */
export function useLiveReservationFloor() {
  const { isWebSocketConnected } = useConvexConnectionState();
  const { refreshKey, pending, refresh } = useReservationRefresh();
  const result = useQuery(api.hospitality.getLiveTables, { refreshKey });
  const live = useRetainedQueryResult(result);
  return {
    live,
    refreshed: result !== undefined && !pending && isWebSocketConnected,
    connected: isWebSocketConnected,
    refresh,
    refreshKey,
  };
}
