import { describe, expect, it, vi } from "vitest";
import {
  createSessionTokenFetcher,
  sessionStatus,
} from "../../lib/session-recovery";

describe("remembered sessions", () => {
  it("does not confuse a pending or failed check with a sign-out", () => {
    expect(
      sessionStatus({ hasSession: false, isPending: true, error: null }),
    ).toBe("pending");
    for (const error of [
      new TypeError("Failed to fetch"),
      { status: 500 },
      { status: 429 },
    ]) {
      expect(
        sessionStatus({ hasSession: false, isPending: false, error }),
      ).toBe("unavailable");
      expect(sessionStatus({ hasSession: true, isPending: false, error })).toBe(
        "active",
      );
    }
  });

  it("accepts an explicit missing or expired session as signed out", () => {
    expect(
      sessionStatus({ hasSession: false, isPending: false, error: null }),
    ).toBe("signed-out");
    expect(
      sessionStatus({
        hasSession: true,
        isPending: false,
        error: { status: 401 },
      }),
    ).toBe("signed-out");
  });
});

describe("Convex token recovery", () => {
  it("uses the server token once and always fetches a fresh token when forced", async () => {
    const request = vi
      .fn()
      .mockResolvedValue({ data: { token: "fresh" }, error: null });
    const onResult = vi.fn();
    const fetcher = createSessionTokenFetcher({
      initialToken: "server",
      request,
      onResult,
    });
    expect(await fetcher.fetchAccessToken({ forceRefreshToken: false })).toBe(
      "server",
    );
    expect(request).not.toHaveBeenCalled();
    expect(await fetcher.fetchAccessToken({ forceRefreshToken: true })).toBe(
      "fresh",
    );
    expect(request).toHaveBeenCalledTimes(1);
    const forced = createSessionTokenFetcher({
      initialToken: "server",
      request,
      onResult,
    });
    expect(await forced.fetchAccessToken({ forceRefreshToken: true })).toBe(
      "fresh",
    );
  });

  it("shares an in-flight refresh instead of issuing competing token requests", async () => {
    const request = vi
      .fn()
      .mockResolvedValue({ data: { token: "fresh" }, error: null });
    const fetcher = createSessionTokenFetcher({ request, onResult: vi.fn() });
    const first = fetcher.fetchAccessToken({ forceRefreshToken: false });
    const second = fetcher.fetchAccessToken({ forceRefreshToken: true });
    expect(first).toBe(second);
    await expect(first).resolves.toBe("fresh");
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("recovers after a transient failure without reporting a sign-out", async () => {
    const request = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Offline"))
      .mockResolvedValueOnce({ data: null, error: { status: 503 } })
      .mockResolvedValueOnce({ data: { token: "recovered" }, error: null });
    const onResult = vi.fn();
    const fetcher = createSessionTokenFetcher({ request, onResult });
    expect(
      await fetcher.fetchAccessToken({ forceRefreshToken: true }),
    ).toBeNull();
    expect(
      await fetcher.fetchAccessToken({ forceRefreshToken: true }),
    ).toBeNull();
    expect(await fetcher.fetchAccessToken({ forceRefreshToken: true })).toBe(
      "recovered",
    );
    expect(onResult.mock.calls.flat()).toEqual([
      "unavailable",
      "unavailable",
      "authenticated",
    ]);
  });

  it("requests a session recheck for a rejected token", async () => {
    const onResult = vi.fn();
    const fetcher = createSessionTokenFetcher({
      request: async () => ({ data: null, error: { status: 401 } }),
      onResult,
    });
    expect(
      await fetcher.fetchAccessToken({ forceRefreshToken: true }),
    ).toBeNull();
    expect(onResult).toHaveBeenCalledWith("signed-out");
  });

  it("does not restore an old account when a refresh completes after sign-out or switching sessions", async () => {
    let finish!: (result: { data: { token: string }; error: null }) => void;
    const onResult = vi.fn();
    const fetcher = createSessionTokenFetcher({
      request: () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
      onResult,
    });
    const pending = fetcher.fetchAccessToken({ forceRefreshToken: true });
    fetcher.cancel();
    finish({ data: { token: "old-account" }, error: null });
    expect(await pending).toBeNull();
    expect(onResult).not.toHaveBeenCalled();
  });
});
