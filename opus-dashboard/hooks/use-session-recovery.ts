"use client";

import { createContext, useContext } from "react";
import { useConvexAuth } from "convex/react";
import type { SessionStatus } from "@/lib/session-recovery";

export const SessionRecoveryContext = createContext<{
  status: SessionStatus;
  hasTokenError: boolean;
  retry: () => void;
} | null>(null);

export function useSessionRecovery() {
  const session = useContext(SessionRecoveryContext);
  const auth = useConvexAuth();
  if (!session)
    throw new Error("Session recovery requires ConvexClientProvider");

  const isSignedOut = session.status === "signed-out";
  const isAuthenticated = auth.isAuthenticated && !isSignedOut;
  return {
    isAuthenticated,
    isSignedOut,
    isLoading: !isSignedOut && (!isAuthenticated || auth.isLoading),
    isRecovering:
      !isSignedOut &&
      (session.status === "unavailable" ||
        session.hasTokenError ||
        (!auth.isLoading && !isAuthenticated && session.status === "active")),
    retry: session.retry,
  };
}
