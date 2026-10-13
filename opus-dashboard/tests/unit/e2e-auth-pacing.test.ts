import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { waitForAuthEmailSend } from "../e2e/support/auth-pacing";

const now = 200_000;
const authMail = (receivedAt: number) => ({
  receivedAt,
  tags: [{ name: "category", value: "auth_otp" }],
});

function mailbox(messages: ReturnType<typeof authMail>[]) {
  const fetchMock = vi.fn(async () => Response.json({ messages }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
  vi.stubEnv("OPUS_E2E_ISOLATED", "1");
  vi.stubEnv("OPUS_E2E_MAILBOX_URL", "http://127.0.0.1:4321");
  vi.stubEnv("OPUS_E2E_MAILBOX_TOKEN", "test-mailbox-token");
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("browser auth pacing", () => {
  it("allows the third UI send without counting guest booking emails", async () => {
    const fetchMock = mailbox([
      authMail(now - 20_000),
      authMail(now - 10_000),
      {
        receivedAt: now - 1_000,
        tags: [{ name: "category", value: "booking_verification" }],
      },
    ]);

    await expect(waitForAuthEmailSend()).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(
      new URL("http://127.0.0.1:4321/messages"),
      expect.objectContaining({
        headers: { Authorization: "Bearer test-mailbox-token" },
      }),
    );
  });

  it("waits from the latest send even when the first counted send is older than a minute", async () => {
    mailbox([
      authMail(now - 90_000),
      authMail(now - 45_000),
      authMail(now - 20_000),
    ]);
    let ready = false;
    const pending = waitForAuthEmailSend().then(() => {
      ready = true;
    });

    await vi.advanceTimersByTimeAsync(40_999);
    expect(ready).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await pending;
    expect(ready).toBe(true);

    // Reading the same persisted history after reset must also allow a fresh
    // worker, without depending on a module-local request counter.
    await expect(waitForAuthEmailSend()).resolves.toBeUndefined();
  });

  it("starts a new counter after an idle gap in the mailbox history", async () => {
    mailbox([
      authMail(now - 120_000),
      authMail(now - 110_000),
      authMail(now - 100_000),
      authMail(now - 30_000),
      authMail(now - 10_000),
    ]);

    await expect(waitForAuthEmailSend()).resolves.toBeUndefined();
  });

  it("fails visibly when the mailbox cannot be read", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 401 })),
    );

    await expect(waitForAuthEmailSend()).rejects.toThrow(
      "Test mailbox failed: HTTP 401",
    );
  });

  it("refuses to send the test mailbox credential to a non-local origin", async () => {
    vi.stubEnv("OPUS_E2E_MAILBOX_URL", "https://example.com");
    const fetchMock = mailbox([]);

    await expect(waitForAuthEmailSend()).rejects.toThrow(
      "Auth pacing requires the localhost test mailbox.",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
