"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

/** Apply a notification destination once, allowing the same alert to be reopened. */
export function useNotificationDestination(
  parameter: "booking" | "conversation",
  scope = "",
) {
  const searchParams = useSearchParams();
  const requestedId = searchParams.get(parameter);
  const requestedDate =
    parameter === "booking" ? searchParams.get("date") : null;
  const signature = JSON.stringify([scope, requestedId, requestedDate]);
  const [snapshot, setSnapshot] = useState({
    scope,
    signature,
    id: requestedId,
    date: requestedDate,
    revision: 0,
  });
  let destination = snapshot;
  if (snapshot.signature !== signature) {
    destination = {
      ...snapshot,
      scope,
      signature,
      ...(requestedId || snapshot.scope !== scope
        ? {
            id: requestedId,
            date: requestedDate,
            revision: snapshot.revision + 1,
          }
        : {}),
    };
    setSnapshot(destination);
  }

  useEffect(() => {
    if (!requestedId) return;
    // Let the parent AppRouter install its native History API integration
    // before consuming a destination supplied on the initial page load.
    const timeout = window.setTimeout(() => {
      const url = new URL(window.location.href);
      if (url.searchParams.get(parameter) !== requestedId) return;
      url.searchParams.delete(parameter);
      if (parameter === "booking") url.searchParams.delete("date");
      // Retain the captured destination while clearing the one-shot command.
      window.history.replaceState(
        null,
        "",
        `${url.pathname}${url.search}${url.hash}`,
      );
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [parameter, requestedId, requestedDate]);

  return destination;
}
