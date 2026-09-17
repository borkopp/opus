import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

let pixel: typeof import("../../../shared/analytics/meta-pixel");
let consent: typeof import("../../../shared/analytics/consent");
let scripts: Map<string, HTMLScriptElement>;
let cookieWrites: string[];

beforeEach(async () => {
  vi.resetModules();
  scripts = new Map();
  cookieWrites = [];
  const jar = new Map<string, string>();
  const documentStub = Object.assign(new EventTarget(), {
    visibilityState: "visible",
    getElementById: (id: string) => scripts.get(id),
    createElement: () => ({
      remove() {
        scripts.delete("opus-meta-pixel");
      },
    }),
    head: {
      appendChild: (script: HTMLScriptElement) =>
        scripts.set(script.id, script),
    },
  });
  Object.defineProperty(documentStub, "cookie", {
    get: () => [...jar].map(([key, value]) => `${key}=${value}`).join("; "),
    set: (cookie: string) => {
      cookieWrites.push(cookie);
      const [key, value] = cookie.split(";")[0].split("=");
      if (cookie.includes("Max-Age=0")) jar.delete(key);
      else jar.set(key, value);
    },
  });
  vi.stubGlobal("document", documentStub);
  vi.stubGlobal(
    "window",
    Object.assign(new EventTarget(), {
      location: new URL("https://opus.mk/"),
      localStorage: { setItem: vi.fn() },
    }),
  );
  consent = await import("../../../shared/analytics/consent");
  pixel = await import("../../../shared/analytics/meta-pixel");
});

afterEach(() => vi.unstubAllGlobals());

const id = "123456789012345";
const events = () =>
  window.fbq?.queue.filter(([command]) => command === "trackSingle") ?? [];

describe("Meta Pixel consent and scope", () => {
  test("never injects a script before advertising consent or with a missing/invalid ID", () => {
    pixel.syncPixelPage(id, "landing");
    consent.saveConsent({ analytics: true, marketing: false });
    pixel.syncPixelPage(id, "landing");
    consent.saveConsent({ analytics: false, marketing: true });
    pixel.syncPixelPage(undefined, "landing");
    pixel.syncPixelPage("not-an-id", "landing");
    expect(scripts.size).toBe(0);
    expect(window.fbq).toBeUndefined();
  });

  test("shares the consent cookie on the parent domain with independent choices", () => {
    consent.saveConsent({ analytics: false, marketing: true });
    expect(consent.getConsent()).toEqual({ analytics: false, marketing: true });
    expect(cookieWrites[0]).toContain("Domain=opus.mk");
    expect(cookieWrites[0]).toContain("Secure");
    expect(consent.parseConsent("v0.1.1")).toEqual(consent.DENIED_CONSENT);
  });

  test("emits one PageView per pathname and disables automatic collection", () => {
    consent.saveConsent({ analytics: false, marketing: true });
    pixel.syncPixelPage(id, "landing");
    pixel.syncPixelPage(id, "landing");
    expect(scripts.size).toBe(1);
    expect(events()).toEqual([["trackSingle", id, "PageView"]]);
    expect(window.fbq?.queue).toContainEqual(["set", "autoConfig", false, id]);
    expect(window.fbq?.disablePushState).toBe(true);
    window.location.href = "https://opus.mk/pricing";
    pixel.syncPixelPage(id, "landing");
    expect(events()).toHaveLength(2);
  });

  test.each([
    ["https://mira.opus.mk/", "studio"],
    ["https://admin.opus.mk/", "studio"],
    ["https://studio.opus.mk/beauty", "studio"],
    ["https://studio.opus.mk/login", "studio"],
    ["https://studio.opus.mk/signup?callbackUrl=%2Fprivate", "studio"],
    ["https://opus.mk/?email=owner%40example.com", "landing"],
    ["https://opus.mk/#secret-token", "landing"],
    ["http://localhost:3000/sites/mira", "studio"],
    ["https://preview.vercel.app/", "landing"],
  ] as const)("excludes %s", (url, surface) => {
    consent.saveConsent({ analytics: true, marketing: true });
    window.location.href = url;
    pixel.syncPixelPage(id, surface);
    expect(scripts.size).toBe(0);
    expect(events()).toHaveLength(0);
  });

  test("permits the ad URL and registration pages", () => {
    expect(
      pixel.isPixelPage(
        new URL(
          "https://opus.mk/?utm_source=instagram&utm_campaign=free_plan&fbclid=Abc-123",
        ),
        "landing",
      ),
    ).toBe(true);
    expect(
      pixel.isPixelPage(new URL("https://studio.opus.mk/signup"), "studio"),
    ).toBe(true);
    expect(
      pixel.isPixelPage(
        new URL("https://studio.opus.mk/onboarding?step=business"),
        "studio",
      ),
    ).toBe(true);
  });

  test("withdrawal immediately drops queued events and clears Meta cookies", () => {
    const unsubscribe = pixel.observePixel(id, "landing");
    consent.saveConsent({ analytics: false, marketing: true });
    document.cookie = "_fbp=browser-id";
    document.cookie = "_fbc=click-id";
    expect(events()).toHaveLength(1);
    consent.saveConsent(consent.DENIED_CONSENT);
    expect(events()).toHaveLength(0);
    expect(window.fbq?.queue.at(-1)).toEqual(["consent", "revoke"]);
    expect(document.cookie).not.toContain("_fbp=");
    expect(document.cookie).not.toContain("_fbc=");
    unsubscribe();
  });

  test("registration is deduplicated locally and sends no studio/account identity", () => {
    window.location.href = "https://studio.opus.mk/onboarding";
    pixel.trackStudioRegistration(id, "internal-org-id");
    expect(events()).toHaveLength(0);
    consent.saveConsent({ analytics: false, marketing: true });
    pixel.trackStudioRegistration(id, "internal-org-id");
    pixel.trackStudioRegistration(id, "internal-org-id");
    expect(events()).toEqual([
      [
        "trackSingle",
        id,
        "CompleteRegistration",
        {
          content_name: "OPUS free studio registration",
          status: true,
        },
      ],
    ]);
    expect(JSON.stringify(events())).not.toContain("internal-org-id");
  });
});
