export type SessionStatus = "pending" | "active" | "signed-out" | "unavailable";

/** A failed session request is not evidence that the user signed out. */
export function sessionStatus({
  hasSession,
  isPending,
  error,
}: {
  hasSession: boolean;
  isPending: boolean;
  error: unknown;
}): SessionStatus {
  if (isPending) return "pending";
  const unauthorized =
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    error.status === 401;
  if (unauthorized) return "signed-out";
  if (hasSession) return "active";
  return error ? "unavailable" : "signed-out";
}

type TokenResult = {
  data: { token: string } | null;
  error: { status?: number } | null;
};

/** Deduplicate refreshes and discard responses from an old session or retry. */
export function createSessionTokenFetcher({
  initialToken,
  request,
  onResult,
}: {
  initialToken?: string | null;
  request: (signal: AbortSignal) => Promise<TokenResult>;
  onResult: (result: "authenticated" | "signed-out" | "unavailable") => void;
}) {
  let seed = initialToken;
  let pending: Promise<string | null> | undefined;
  let controller: AbortController | undefined;

  return {
    fetchAccessToken({ forceRefreshToken }: { forceRefreshToken: boolean }) {
      if (seed && !forceRefreshToken) {
        const token = seed;
        seed = null;
        return Promise.resolve(token);
      }
      seed = null;
      if (pending) return pending;
      const current = new AbortController();
      controller = current;
      pending = request(current.signal)
        .then(({ data, error }) => {
          if (current.signal.aborted) return null;
          if (data?.token && !error) {
            onResult("authenticated");
            return data.token;
          }
          onResult(error?.status === 401 ? "signed-out" : "unavailable");
          return null;
        })
        .catch(() => {
          if (!current.signal.aborted) onResult("unavailable");
          return null;
        })
        .finally(() => {
          if (controller === current) pending = undefined;
        });
      return pending;
    },
    cancel() {
      controller?.abort();
      controller = undefined;
      pending = undefined;
      seed = null;
    },
  };
}
