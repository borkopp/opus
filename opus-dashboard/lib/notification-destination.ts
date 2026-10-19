export type NotificationDestinationRequest = {
  scope: string;
  id: string | null;
  date: string | null;
};

export type NotificationDestination = NotificationDestinationRequest & {
  signature: string;
  revision: number;
};

/** Capture URL commands without resetting calendar interactions when they clear. */
export function updateNotificationDestination(
  previous: NotificationDestination | undefined,
  request: NotificationDestinationRequest,
): NotificationDestination {
  const signature = JSON.stringify([request.scope, request.id, request.date]);
  if (!previous) return { ...request, signature, revision: 0 };
  if (signature === previous.signature) return previous;
  const hasDestination = Boolean(request.id || request.date);
  return {
    ...previous,
    signature,
    ...(hasDestination || previous.scope !== request.scope
      ? { ...request, revision: previous.revision + 1 }
      : {}),
  };
}

/** Do not erase a newer destination that arrived before an earlier effect ran. */
export function consumeNotificationDestination(
  currentUrl: string,
  parameter: "booking" | "conversation",
  request: Pick<NotificationDestinationRequest, "id" | "date">,
): string | null {
  if (!request.id && !request.date) return null;
  const url = new URL(currentUrl);
  const currentDate =
    parameter === "booking" ? url.searchParams.get("date") : null;
  if (
    url.searchParams.get(parameter) !== request.id ||
    currentDate !== request.date
  )
    return null;
  url.searchParams.delete(parameter);
  if (parameter === "booking") url.searchParams.delete("date");
  return `${url.pathname}${url.search}${url.hash}`;
}
