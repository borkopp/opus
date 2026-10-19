import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const consent = vi.hoisted(() => ({
  allowed: false,
  status: "pending",
  listeners: new Set<() => void>(),
}));
const sdk = vi.hoisted(() => ({
  init: vi.fn(),
  capture: vi.fn(),
  get_explicit_consent_status: vi.fn(() => consent.status),
  opt_in_capturing: vi.fn(() => {
    consent.status = "granted";
  }),
  opt_out_capturing: vi.fn(() => {
    consent.status = "denied";
  }),
}));
vi.mock("posthog-js", () => ({ default: sdk }));
vi.mock("../../../shared/analytics/consent", () => ({
  getConsent: () => ({ analytics: consent.allowed, marketing: false }),
  isPlatformHost: (host: string) => host === "studio.opus.mk",
  subscribeConsent: (listener: () => void) => {
    consent.listeners.add(listener);
    return () => consent.listeners.delete(listener);
  },
}));

class DisplayMode extends EventTarget {
  matches = false;

  change(matches: boolean) {
    this.matches = matches;
    this.dispatchEvent(new Event("change"));
  }
}

function browser({ standalone = false, mode = "browser" } = {}) {
  const modes = new Map<string, DisplayMode>();
  for (const name of ["standalone", "minimal-ui", "fullscreen"]) {
    const query = new DisplayMode();
    query.matches = name === mode;
    modes.set(`(display-mode: ${name})`, query);
  }
  const storage = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  };
  const window = Object.assign(new EventTarget(), {
    location: new URL("https://studio.opus.mk/beauty"),
    matchMedia: vi.fn((query: string) => modes.get(query) ?? new DisplayMode()),
    localStorage: storage,
    sessionStorage: storage,
  });
  vi.stubGlobal("window", window);
  vi.stubGlobal("navigator", {
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
    maxTouchPoints: 5,
    standalone,
  });
  return { window, modes, storage };
}

function setConsent(allowed: boolean) {
  consent.allowed = allowed;
  consent.listeners.forEach((listener) => listener());
}

const installEvents = () =>
  sdk.capture.mock.calls.filter(([name]) => name.startsWith("studio_"));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  consent.allowed = false;
  consent.status = "pending";
  consent.listeners.clear();
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN", "test-token");
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "https://analytics.example.com");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("studio app analytics using the existing consent", () => {
  it("does not capture, initialize or persist denied events, or replay them on consent", async () => {
    const { window, storage } = browser();
    const analytics = await import("../../lib/studio-install-analytics");
    const unsubscribe = analytics.subscribeStudioInstallAnalytics();
    analytics.captureStudioInstallInstructionsOpened();
    window.dispatchEvent(new Event("appinstalled"));
    expect(sdk.init).not.toHaveBeenCalled();
    expect(sdk.capture).not.toHaveBeenCalled();
    expect(storage.getItem).not.toHaveBeenCalled();
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.removeItem).not.toHaveBeenCalled();

    setConsent(true);
    expect(installEvents()).toEqual([]);
    analytics.captureStudioInstallInstructionsOpened();
    expect(installEvents()).toEqual([
      [
        "studio_install_instructions_opened",
        { platform: "ios", display_mode: "browser" },
      ],
    ]);
    unsubscribe();
  });

  it.each([
    [{ standalone: true }, "standalone"],
    [{ mode: "standalone" }, "standalone"],
    [{ mode: "minimal-ui" }, "minimal-ui"],
  ])(
    "captures a current app launch after consent: %j",
    async (options, mode) => {
      browser(options);
      const analytics = await import("../../lib/studio-install-analytics");
      const unsubscribe = analytics.subscribeStudioInstallAnalytics();
      expect(installEvents()).toEqual([]);
      setConsent(true);
      expect(installEvents()).toEqual([
        ["studio_app_opened", { platform: "ios", display_mode: mode }],
      ]);
      setConsent(true);
      unsubscribe();
      const unsubscribeRemount = analytics.subscribeStudioInstallAnalytics();
      expect(installEvents()).toHaveLength(1);
      unsubscribeRemount();
    },
  );

  it("stops capture immediately on withdrawal and never replays declined actions", async () => {
    const { window } = browser();
    consent.allowed = true;
    const analytics = await import("../../lib/studio-install-analytics");
    const unsubscribe = analytics.subscribeStudioInstallAnalytics();
    analytics.captureStudioInstallInstructionsOpened();
    expect(installEvents()).toHaveLength(1);

    setConsent(false);
    analytics.captureStudioInstallInstructionsOpened();
    window.dispatchEvent(new Event("appinstalled"));
    setConsent(true);
    expect(installEvents()).toHaveLength(1);
    unsubscribe();
  });

  it("counts installation only from appinstalled and never mistakes a browser tab for an app launch", async () => {
    const { window } = browser();
    consent.allowed = true;
    const analytics = await import("../../lib/studio-install-analytics");
    const store = await import("../../lib/studio-install");
    const unsubscribeStore = store.subscribeToStudioInstall(vi.fn());
    const unsubscribe = analytics.subscribeStudioInstallAnalytics();
    window.dispatchEvent(
      Object.assign(new Event("beforeinstallprompt"), {
        prompt: vi.fn().mockResolvedValue(undefined),
        userChoice: Promise.resolve({ outcome: "accepted" }),
      }),
    );
    await store.promptStudioInstall();
    expect(installEvents()).toEqual([]);
    window.dispatchEvent(new Event("appinstalled"));
    expect(store.getStudioInstallState().installed).toBe(true);
    expect(installEvents()).toEqual([
      ["studio_app_installed", { platform: "ios", display_mode: "browser" }],
    ]);
    unsubscribe();
    const unsubscribeRemount = analytics.subscribeStudioInstallAnalytics();
    window.dispatchEvent(new Event("appinstalled"));
    setConsent(true);
    expect(installEvents()).toHaveLength(1);
    unsubscribeRemount();
    unsubscribeStore();
  });

  it("ignores fullscreen and observes a later actual standalone window once", async () => {
    const { modes } = browser({ mode: "fullscreen" });
    consent.allowed = true;
    const analytics = await import("../../lib/studio-install-analytics");
    const unsubscribe = analytics.subscribeStudioInstallAnalytics();
    expect(installEvents()).toEqual([]);
    modes.get("(display-mode: standalone)")!.change(true);
    modes.get("(display-mode: standalone)")!.change(false);
    modes.get("(display-mode: standalone)")!.change(true);
    expect(installEvents()).toEqual([
      ["studio_app_opened", { platform: "ios", display_mode: "standalone" }],
    ]);
    unsubscribe();
  });

  it("shares listeners between providers and cleans up after the last unmount", async () => {
    const { window, modes } = browser();
    consent.allowed = true;
    const analytics = await import("../../lib/studio-install-analytics");
    const first = analytics.subscribeStudioInstallAnalytics();
    const second = analytics.subscribeStudioInstallAnalytics();
    expect(consent.listeners.size).toBe(1);
    first();
    expect(consent.listeners.size).toBe(1);
    second();
    expect(consent.listeners.size).toBe(0);
    window.dispatchEvent(new Event("appinstalled"));
    modes.get("(display-mode: standalone)")!.change(true);
    expect(installEvents()).toEqual([]);
  });

  it("does not queue events when PostHog is not configured", async () => {
    browser({ standalone: true });
    consent.allowed = true;
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN", "");
    const analytics = await import("../../lib/studio-install-analytics");
    const unsubscribe = analytics.subscribeStudioInstallAnalytics();
    analytics.captureStudioInstallInstructionsOpened();
    expect(sdk.init).not.toHaveBeenCalled();
    expect(sdk.capture).not.toHaveBeenCalled();
    unsubscribe();
  });
});
