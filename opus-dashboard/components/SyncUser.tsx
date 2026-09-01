"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useEffect, useRef } from "react";
import posthog from "posthog-js";
import { api } from "@/convex/_generated/api";

export function SyncUser() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const ensureUser = useMutation(api.users.ensureUser);
  const profile = useQuery(
    api.users.getMyProfile,
    isAuthenticated ? {} : "skip",
  );
  const hasSyncedRef = useRef(false);
  const identifiedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      hasSyncedRef.current = false;
      if (identifiedUserIdRef.current) {
        posthog.reset();
        identifiedUserIdRef.current = null;
      }
      return;
    }
    if (hasSyncedRef.current) return;

    hasSyncedRef.current = true;
    void ensureUser().catch((error: unknown) => {
      hasSyncedRef.current = false;
      console.error("Failed to synchronize the signed-in user", error);
    });
  }, [ensureUser, isAuthenticated, isLoading]);

  useEffect(() => {
    const user = profile?.user;
    if (!user || identifiedUserIdRef.current === user._id) return;

    if (identifiedUserIdRef.current) {
      posthog.reset();
    }

    posthog.identify(user._id, {
      email: user.email,
      name: user.name,
      role: profile.role,
    });
    identifiedUserIdRef.current = user._id;
  }, [profile]);

  return null;
}
