import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getInitialAuthToken } from "../../lib/auth-server";

const mocks = vi.hoisted(() => ({ token: vi.fn(), cookie: "" }));
vi.mock("next/headers", () => ({
  headers: async () =>
    new Headers(mocks.cookie ? { cookie: mocks.cookie } : {}),
}));
vi.mock("@convex-dev/better-auth/nextjs", () => ({
  convexBetterAuthNextJs: () => ({ getToken: mocks.token }),
}));

beforeEach(() => {
  mocks.cookie = "better-auth.session_token=remembered-session";
  mocks.token.mockReset();
});
afterEach(() => vi.useRealTimers());

describe("server session bootstrap", () => {
  it("makes no auth request for anonymous public visitors", async () => {
    mocks.cookie = "";
    expect(await getInitialAuthToken()).toBeUndefined();
    expect(mocks.token).not.toHaveBeenCalled();
  });
  it("passes a refreshed token for a remembered secure session", async () => {
    mocks.cookie = "__Secure-better-auth.session_token=remembered-session";
    mocks.token.mockResolvedValue("fresh-token");
    expect(await getInitialAuthToken()).toBe("fresh-token");
  });
  it("falls back to browser recovery if the server lookup fails", async () => {
    mocks.token.mockRejectedValue(new TypeError("Network unavailable"));
    expect(await getInitialAuthToken()).toBeUndefined();
  });
  it("does not hold the page indefinitely during an auth outage", async () => {
    vi.useFakeTimers();
    mocks.token.mockImplementation(() => new Promise(() => {}));
    const result = getInitialAuthToken();
    await vi.advanceTimersByTimeAsync(2_000);
    expect(await result).toBeUndefined();
  });
});
