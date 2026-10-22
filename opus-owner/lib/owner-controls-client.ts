export async function ownerControl<T>(
  body: Record<string, unknown>,
  onExpired: () => void,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch("/api/controls", {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (response.status === 401 || response.status === 403) {
    onExpired();
    throw new Error("Your session has ended. Please sign in again.");
  }
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(
      data?.message || "Couldn’t complete the action. Please try again.",
    );
  }
  return response.json() as Promise<T>;
}
