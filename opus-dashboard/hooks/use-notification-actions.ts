"use client";

import { useCallback, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

type NotificationAction =
  | { type: "read" | "dismiss"; notificationId: Id<"dashboard_notifications"> }
  | { type: "all" };

function actionKey(action: NotificationAction) {
  return action.type === "all"
    ? "all"
    : `${action.type}:${action.notificationId}`;
}

/** Shared mutation feedback for the inbox, bell and incoming notification toast. */
export function useNotificationActions(orgId: Id<"orgs"> | undefined) {
  const markReadMutation = useMutation(api.dashboardNotifications.markRead);
  const markAllReadMutation = useMutation(
    api.dashboardNotifications.markAllRead,
  );
  const dismissMutation = useMutation(api.dashboardNotifications.dismiss);
  const inFlight = useRef(new Set<string>());
  const [pending, setPending] = useState<string[]>([]);
  const [failure, setFailure] = useState<{
    orgId: Id<"orgs">;
    action: NotificationAction;
  } | null>(null);

  const run = useCallback(
    async (action: NotificationAction): Promise<boolean> => {
      if (!orgId) return false;
      const key = `${orgId}:${actionKey(action)}`;
      if (inFlight.current.has(key)) return false;
      inFlight.current.add(key);
      setPending([...inFlight.current]);
      setFailure(null);
      try {
        if (action.type === "all") await markAllReadMutation({ orgId });
        else if (action.type === "read")
          await markReadMutation({
            orgId,
            notificationId: action.notificationId,
          });
        else
          await dismissMutation({
            orgId,
            notificationId: action.notificationId,
          });
        return true;
      } catch {
        setFailure({ orgId, action });
        return false;
      } finally {
        inFlight.current.delete(key);
        setPending([...inFlight.current]);
      }
    },
    [orgId, markReadMutation, markAllReadMutation, dismissMutation],
  );

  const read = useCallback(
    (notification: { _id: Id<"dashboard_notifications">; isRead: boolean }) =>
      notification.isRead
        ? Promise.resolve(true)
        : run({ type: "read", notificationId: notification._id }),
    [run],
  );

  return {
    read,
    dismiss: (notificationId: Id<"dashboard_notifications">) =>
      run({ type: "dismiss", notificationId }),
    markAllRead: () => run({ type: "all" }),
    isPending: (notificationId: Id<"dashboard_notifications">) =>
      pending.includes(`${orgId}:read:${notificationId}`) ||
      pending.includes(`${orgId}:dismiss:${notificationId}`),
    markingAll: pending.includes(`${orgId}:all`),
    failed: Boolean(failure && failure.orgId === orgId),
    retry: () =>
      failure && failure.orgId === orgId
        ? run(failure.action)
        : Promise.resolve(false),
  };
}
