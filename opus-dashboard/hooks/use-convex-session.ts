"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";
import {
  createSessionTokenFetcher,
  sessionStatus,
} from "@/lib/session-recovery";

const retryDelays = [1_000, 3_000, 10_000];

/** Keep Better Auth session recovery separate from Convex connection failures. */
export function useConvexSession(initialToken?: string | null) {
  const { data, isPending, error, refetch } = authClient.useSession();
  const sessionId = data?.session?.id;
  const status = sessionStatus({
    hasSession: Boolean(sessionId),
    isPending,
    error,
  });
  const [seed, setSeed] = useState(initialToken ?? null);
  const [revision, setRevision] = useState(0);
  const [tokenFailures, setTokenFailures] = useState(0);
  const automaticRetries = useRef(0);

  // The server token only bootstraps the first session check. In particular, it
  // must never restore authentication after sign-out or an account switch.
  if (seed && status !== "pending") setSeed(null);

  const reconnect = useCallback(() => {
    setTokenFailures(0);
    setRevision((value) => value + 1);
    void refetch();
  }, [refetch]);
  const retry = useCallback(() => {
    automaticRetries.current = 0;
    reconnect();
  }, [reconnect]);

  const tokenFetcher = useMemo(
    () =>
      createSessionTokenFetcher({
        initialToken: seed,
        request: (signal) =>
          authClient.convex.token({
            fetchOptions: { throw: false, signal, timeout: 10_000 },
          }),
        onResult: (result) => {
          if (result === "authenticated") {
            automaticRetries.current = 0;
            setTokenFailures(0);
          } else {
            setTokenFailures((value) => value + 1);
            // Recheck the remembered session before treating a rejected JWT as
            // a sign-out. This also clears expired session cookies normally.
            if (result === "signed-out") void refetch();
          }
        },
      }),
    // Session changes and explicit retries must install a new Convex token
    // fetcher, even when Better Auth returns the same remembered session ID.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [seed, sessionId, revision, refetch],
  );

  useEffect(() => () => tokenFetcher.cancel(), [tokenFetcher]);

  const unavailable = status === "unavailable" || tokenFailures > 0;
  useEffect(() => {
    if (!unavailable || isPending || status === "signed-out") return;
    const delay = retryDelays[automaticRetries.current];
    if (delay === undefined) return;
    const timer = window.setTimeout(() => {
      automaticRetries.current += 1;
      reconnect();
    }, delay);
    return () => window.clearTimeout(timer);
  }, [unavailable, tokenFailures, isPending, status, reconnect]);

  useEffect(() => {
    if (!unavailable || status === "signed-out") return;
    const resume = () => {
      if (document.visibilityState === "visible" && navigator.onLine) retry();
    };
    window.addEventListener("online", resume);
    document.addEventListener("visibilitychange", resume);
    return () => {
      window.removeEventListener("online", resume);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [unavailable, status, retry]);

  const isLoading = (status === "pending" && !seed) || status === "unavailable";
  const isAuthenticated =
    status === "active" || (status === "pending" && !!seed);
  const useAuth = useCallback(
    () => ({
      isLoading,
      isAuthenticated,
      fetchAccessToken: tokenFetcher.fetchAccessToken,
    }),
    [isLoading, isAuthenticated, tokenFetcher],
  );
  const recovery = useMemo(
    () => ({ status, hasTokenError: tokenFailures > 0, retry }),
    [status, tokenFailures, retry],
  );
  return { useAuth, recovery };
}
