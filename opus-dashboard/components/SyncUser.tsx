"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import posthog from "posthog-js";
import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import {
  canCaptureAnalytics,
  syncPostHogConsent,
} from "@/lib/analytics-consent";
import { subscribeConsent } from "../../shared/analytics/consent";

export function SyncUser() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { data: session } = authClient.useSession();
  const authUserId = session?.user.id;
  const pathname = usePathname();
  const isClientArea =
    pathname.startsWith("/account") ||
    pathname.startsWith("/book/") ||
    pathname.startsWith("/sites/");
  const ensureUser = useMutation(api.users.ensureUser);
  const profile = useQuery(
    api.users.getMyProfile,
    isAuthenticated && !isClientArea ? {} : "skip",
  );
  const syncedUserIdRef = useRef<string | null>(null);
  const identifiedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      syncedUserIdRef.current = null;
      if (identifiedUserIdRef.current) {
        posthog.reset();
        syncPostHogConsent();
        identifiedUserIdRef.current = null;
      }
      return;
    }
    if (isClientArea || !authUserId || syncedUserIdRef.current === authUserId)
      return;

    syncedUserIdRef.current = authUserId;
    void ensureUser().catch((error: unknown) => {
      if (syncedUserIdRef.current === authUserId)
        syncedUserIdRef.current = null;
      console.error("Failed to synchronize the signed-in user", error);
    });
  }, [authUserId, ensureUser, isAuthenticated, isLoading, isClientArea]);

  useEffect(() => {
    const identify = () => {
      if (!canCaptureAnalytics()) {
        identifiedUserIdRef.current = null;
        return;
      }
      const user = profile?.user;
      if (!user || identifiedUserIdRef.current === user._id) return;
      if (identifiedUserIdRef.current) {
        posthog.reset();
        syncPostHogConsent();
      }
      posthog.identify(user._id, {
        email: user.email,
        name: user.name,
        role: profile.role,
      });
      identifiedUserIdRef.current = user._id;
    };
    identify();
    return subscribeConsent(identify);
  }, [profile]);

  return null;
}
