"use client";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useBrowserPush } from "@/hooks/use-browser-push";
/** Refresh already granted subscriptions; never prompts on page load. */
export function BrowserPushSync() {
  const settings = useQuery(api.pushNotifications.getSettings);
  useBrowserPush(settings);
  return null;
}
