"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  consumeNotificationDestination,
  updateNotificationDestination,
} from "@/lib/notification-destination";

/** Apply a notification destination once, allowing the same alert to be reopened. */
export function useNotificationDestination(
  parameter: "booking" | "conversation",
  scope = "",
) {
  const searchParams = useSearchParams();
  const requestedId = searchParams.get(parameter);
  const requestedDate =
    parameter === "booking" ? searchParams.get("date") : null;
  const request = { scope, id: requestedId, date: requestedDate };
  const [snapshot, setSnapshot] = useState(() =>
    updateNotificationDestination(undefined, request),
  );
  const destination = updateNotificationDestination(snapshot, request);
  if (destination !== snapshot) setSnapshot(destination);

  useEffect(() => {
    if (!requestedId && !requestedDate) return;
    // Let the parent AppRouter install its native History API integration
    // before consuming a destination supplied on the initial page load.
    const timeout = window.setTimeout(() => {
      const url = consumeNotificationDestination(
        window.location.href,
        parameter,
        {
          id: requestedId,
          date: requestedDate,
        },
      );
      if (url === null) return;
      // Retain the captured destination while clearing the one-shot command.
      window.history.replaceState(null, "", url);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [parameter, requestedId, requestedDate]);

  return destination;
}
