import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

function worker() {
  const handlers: Record<
    string,
    (event: {
      data?: { json: () => unknown };
      notification?: { close: () => void; data: unknown };
      waitUntil: (task: Promise<unknown>) => void;
    }) => void
  > = {};
  const showNotification = vi.fn().mockResolvedValue(undefined);
  const openWindow = vi.fn().mockResolvedValue(undefined);
  const navigate = vi.fn().mockResolvedValue(undefined);
  const focus = vi.fn().mockResolvedValue(undefined);
  const client = { url: "https://studio.opus.mk/beauty", navigate, focus };
  const matchAll = vi.fn().mockResolvedValue([client]);
  runInNewContext(readFileSync("public/opus-push-sw.js", "utf8"), {
    URL,
    self: {
      addEventListener: (name: string, handler: (typeof handlers)[string]) => {
        handlers[name] = handler;
      },
      skipWaiting: vi.fn(),
      location: { origin: "https://studio.opus.mk" },
      registration: { showNotification },
      clients: { matchAll, openWindow, claim: vi.fn() },
    },
  });
  return { handlers, showNotification, openWindow, navigate, focus, matchAll };
}
const id = "a".repeat(32);

describe("push-only browser worker", () => {
  it("shows bounded content with a private opaque destination and does not cache pages", async () => {
    const { handlers, showNotification } = worker();
    const waitUntil = vi.fn();
    handlers.push({
      data: {
        json: () => ({
          notificationId: id,
          title: "A".repeat(200),
          body: "B".repeat(800),
          silent: true,
          url: "https://attacker.example",
        }),
      },
      waitUntil,
    });
    await waitUntil.mock.calls[0][0];
    expect(showNotification.mock.calls[0]).toMatchObject([
      "A".repeat(120),
      { body: "B".repeat(450), silent: true, data: { notificationId: id } },
    ]);
    expect(handlers.fetch).toBeUndefined();
    handlers.push({
      data: { json: () => ({ notificationId: "https://attacker.example" }) },
      waitUntil,
    });
    handlers.push({
      data: {
        json: () => {
          throw new Error("invalid JSON");
        },
      },
      waitUntil,
    });
    expect(showNotification).toHaveBeenCalledTimes(1);
  });

  it("focuses a studio window or opens one using only the current origin", async () => {
    const { handlers, navigate, focus, openWindow, matchAll } = worker();
    const waitUntil = vi.fn();
    const close = vi.fn();
    const event = {
      notification: {
        close,
        data: { notificationId: id, url: "https://attacker.example" },
      },
      waitUntil,
    };
    handlers.notificationclick(event);
    await waitUntil.mock.calls[0][0];
    expect(navigate).toHaveBeenCalledWith(
      `https://studio.opus.mk/notifications/open?id=${id}`,
    );
    expect(focus).toHaveBeenCalledTimes(1);
    matchAll.mockResolvedValueOnce([]);
    handlers.notificationclick(event);
    await waitUntil.mock.calls[1][0];
    expect(openWindow).toHaveBeenCalledWith(
      `https://studio.opus.mk/notifications/open?id=${id}`,
    );
    handlers.notificationclick({
      notification: { close, data: { notificationId: "../private" } },
      waitUntil,
    });
    expect(waitUntil).toHaveBeenCalledTimes(2);
  });
});
