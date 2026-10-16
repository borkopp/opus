"use client";

import { useMemo } from "react";
import { useConvexConnectionState, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useReservationRefresh } from "./use-reservation-refresh";
import { useRetainedQueryResult } from "./use-retained-query-result";

/** Mount under an org-keyed boundary; retain rows only for the selected date. */
export function useLiveReservations(date: string, enabled: boolean) {
  const { isWebSocketConnected } = useConvexConnectionState();
  const { refreshKey, pending } = useReservationRefresh(enabled);
  const result = useQuery(
    api.reservations.listDay,
    enabled ? { date, refreshKey } : "skip",
  );
  const snapshot = useMemo(
    () => (result === undefined ? undefined : { date, rows: result }),
    [date, result],
  );
  const retained = useRetainedQueryResult(snapshot);
  return {
    reservations:
      enabled && retained?.date === date ? retained.rows : undefined,
    refreshing: result === undefined || pending,
    connected: isWebSocketConnected,
  };
}
