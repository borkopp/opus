"use client";

import { useConvexAuth, useMutation } from "convex/react";
import { useEffect, useRef } from "react";
import { api } from "@/convex/_generated/api";

export function SyncUser() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const ensureUser = useMutation(api.users.ensureUser);
  const hasSyncedRef = useRef(false);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      hasSyncedRef.current = false;
      return;
    }
    if (hasSyncedRef.current) return;

    hasSyncedRef.current = true;
    void ensureUser().catch((error: unknown) => {
      hasSyncedRef.current = false;
      console.error("Failed to synchronize the signed-in user", error);
    });
  }, [ensureUser, isAuthenticated, isLoading]);

  return null;
}
