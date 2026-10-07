"use client";

import { useEffect, useRef, useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { accountErrorMessage } from "@/lib/account-errors";

/** Consumer synchronization never creates a studio or grants staff membership. */
export function useClientAccount(enabled = true) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { data: session } = authClient.useSession();
  const authUserId = session?.user.id;
  const user = useQuery(
    api.opusUsers.getCurrent,
    enabled && isAuthenticated ? {} : "skip",
  );
  const ensure = useMutation(api.opusUsers.getOrCreate);
  const syncing = useRef<string | null>(null);
  const [failure, setFailure] = useState<{
    userId: string;
    message: string;
  } | null>(null);
  const error =
    failure && failure.userId === authUserId ? failure.message : null;
  useEffect(() => {
    if (!isAuthenticated) {
      syncing.current = null;
      return;
    }
    if (
      !enabled ||
      !authUserId ||
      user !== null ||
      syncing.current === authUserId
    )
      return;
    syncing.current = authUserId;
    void ensure().catch((caught: unknown) => {
      setFailure({
        userId: authUserId,
        message: accountErrorMessage(
          caught,
          "Your account could not be loaded.",
        ),
      });
      if (syncing.current === authUserId) syncing.current = null;
    });
  }, [authUserId, enabled, ensure, isAuthenticated, user]);
  return {
    user,
    isAuthenticated,
    isLoading: isLoading || (enabled && isAuthenticated && !user && !error),
    error,
  };
}
