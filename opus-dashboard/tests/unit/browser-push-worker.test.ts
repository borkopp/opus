import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

function worker(language = "en-US") {
  const handlers: Record<
    string,
    (event: {
      data?: { json: () => unknown };
      notification?: { close: () => void; data: unknown };
      request?: { url: string; method: string; mode: string };
      respondWith?: (response: Promise<Response>) => void;
      waitUntil: (task: Promise<unknown>) => void;
    }) => void
  > = {};
  const showNotification = vi.fn().mockResolvedValue(undefined);
  const openWindow = vi.fn().mockResolvedValue(undefined);
  const navigate = vi.fn().mockResolvedValue(undefined);
  const focus = vi.fn().mockResolvedValue(undefined);
  const client = { url: "https://studio.opus.mk/beauty", navigate, focus };
  const matchAll = vi.fn().mockResolvedValue([client]);
  const fetch = vi.fn().mockResolvedValue(new Response("live dashboard"));
  const openCache = vi.fn();
  const skipWaiting = vi.fn().mockResolvedValue(undefined);
  const claim = vi.fn().mockResolvedValue(undefined);
  runInNewContext(readFileSync("public/opus-push-sw.js", "utf8"), {
    URL,
    Response,
    fetch,
    caches: { open: openCache },
    self: {
      addEventListener: (name: string, handler: (typeof handlers)[string]) => {
        handlers[name] = handler;
      },
      skipWaiting,
      location: { origin: "https://studio.opus.mk" },
      navigator: { language },
      registration: { showNotification },
      clients: { matchAll, openWindow, claim },
    },
  });
  return {
    handlers,
    showNotification,
    openWindow,
    navigate,
    focus,
    matchAll,
    fetch,
    openCache,
    skipWaiting,
    claim,
  };
}
const id = "a".repeat(32);

describe("studio browser worker", () => {
  it("shows bounded content with a private opaque destination", async () => {
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

  it("activates updates without replacing the existing worker registration", async () => {
    const { handlers, skipWaiting, claim } = worker();
    const waitUntil = vi.fn();
    handlers.install({ waitUntil });
    handlers.activate({ waitUntil });
    await Promise.all(waitUntil.mock.calls.map(([task]) => task));
    expect(skipWaiting).toHaveBeenCalledOnce();
    expect(claim).toHaveBeenCalledOnce();
  });

  it.each([200, 302, 401, 403, 404, 500])(
    "passes through HTTP %s navigation responses without caching or masking them",
    async (status) => {
      const { handlers, fetch, openCache } = worker();
      const response = new Response("network response", { status });
      fetch.mockResolvedValueOnce(response);
      const request = {
        url: "https://studio.opus.mk/beauty/bookings?date=2026-10-19",
        method: "GET",
        mode: "navigate",
      };
      const respondWith = vi.fn();
      handlers.fetch({ request, respondWith, waitUntil: vi.fn() });
      expect(fetch).toHaveBeenCalledWith(request, { cache: "no-store" });
      expect(await respondWith.mock.calls[0][0]).toBe(response);
      expect(openCache).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["en-US", "Can't connect to OPUS", "Try again"],
    ["mk-MK", "Нема врска со OPUS", "Обиди се повторно"],
    ["sq-AL", "Nuk mund të lidhemi me OPUS", "Provoni përsëri"],
  ])(
    "returns a self-contained offline screen in %s when navigation cannot reach the network",
    async (language, title, retry) => {
      const { handlers, fetch, openCache } = worker(language);
      fetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));
      const respondWith = vi.fn();
      handlers.fetch({
        request: {
          url: `https://studio.opus.mk/notifications/open?id=${id}`,
          method: "GET",
          mode: "navigate",
        },
        respondWith,
        waitUntil: vi.fn(),
      });
      const response: Response = await respondWith.mock.calls[0][0];
      const html = await response.text();
      expect(response.status).toBe(503);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(response.headers.get("Content-Security-Policy")).toContain(
        "default-src 'none'",
      );
      expect(html).toContain(title);
      expect(html).toContain(`<a href="">${retry}</a>`);
      expect(html).not.toContain(id);
      expect(html).not.toMatch(/<script|<link|<img/);
      expect(openCache).not.toHaveBeenCalled();
    },
  );

  it.each(["/", "/login", "/onboarding", "/settings", "/beauty/bookings"])(
    "provides offline navigation recovery for studio route %s",
    async (pathname) => {
      const { handlers, fetch } = worker();
      fetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));
      const respondWith = vi.fn();
      handlers.fetch({
        request: {
          url: `https://studio.opus.mk${pathname}`,
          method: "GET",
          mode: "navigate",
        },
        respondWith,
        waitUntil: vi.fn(),
      });
      expect((await respondWith.mock.calls[0][0]).status).toBe(503);
    },
  );

  it.each([
    ["https://studio.opus.mk/api/auth/session", "GET", "navigate"],
    ["https://studio.opus.mk/sites/test/book", "GET", "navigate"],
    ["https://studio.opus.mk/book/test", "GET", "navigate"],
    ["https://studio.opus.mk/account/sign-in", "GET", "navigate"],
    ["https://studio.opus.mk/beauty-other", "GET", "navigate"],
    ["https://studio.opus.mk/beauty/bookings", "GET", "cors"],
    ["https://studio.opus.mk/beauty/bookings", "POST", "navigate"],
    ["https://studio.opus.mk/_next/static/chunk.js", "GET", "no-cors"],
    ["https://studio-luna.opus.mk/", "GET", "navigate"],
  ])(
    "does not intercept public, API, data or cross-origin requests: %s (%s/%s)",
    (url, method, mode) => {
      const { handlers, fetch, openCache } = worker();
      const respondWith = vi.fn();
      handlers.fetch({
        request: { url, method, mode },
        respondWith,
        waitUntil: vi.fn(),
      });
      expect(respondWith).not.toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
      expect(openCache).not.toHaveBeenCalled();
    },
  );

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
