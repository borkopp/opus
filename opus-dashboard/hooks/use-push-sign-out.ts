"use client";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import {
  browserPushDeviceId,
  unsubscribeBrowserPush,
} from "@/lib/browser-push";
export function usePushSignOut() {
  const unregister = useMutation(api.pushNotifications.unregisterDevice);
  return async () => {
    const deviceId = browserPushDeviceId(false);
    if (deviceId) {
      const session = await authClient.getSession({
        query: { disableCookieCache: true },
        fetchOptions: { timeout: 15000 },
      });
      if (session.error)
        throw new Error("Could not check notification access. Try again.");
      // An ended session already blocks delivery; do not trap users in recovery.
      if (session.data) await unregister({ deviceId });
    }
    if (typeof navigator !== "undefined") await unsubscribeBrowserPush();
    return authClient.signOut({ fetchOptions: { timeout: 15000 } });
  };
}
