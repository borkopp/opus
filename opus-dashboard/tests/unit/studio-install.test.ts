import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const chrome =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/145.0.0.0 Safari/537.36";
const macSafari =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/26.0 Safari/605.1.15";

class DisplayMode extends EventTarget {
  matches = false;

  change(matches: boolean) {
    this.matches = matches;
    this.dispatchEvent(new Event("change"));
  }
}

function browser({
  userAgent = chrome,
  maxTouchPoints = 0,
  standalone = false,
  secure = true,
} = {}) {
  const media = new DisplayMode();
  const storage = {
    getItem: vi.fn().mockReturnValue("true"),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  };
  const window = Object.assign(new EventTarget(), {
    matchMedia: vi.fn().mockReturnValue(media),
    isSecureContext: secure,
    localStorage: storage,
    sessionStorage: storage,
  });
  const navigator = { userAgent, maxTouchPoints, standalone };
  vi.stubGlobal("window", window);
  vi.stubGlobal("navigator", navigator);
  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("sessionStorage", storage);
  return { window, media, navigator, storage };
}

function installEvent(
  outcome: "accepted" | "dismissed" = "accepted",
  prompt = vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
) {
  return Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
    prompt,
    userChoice: Promise.resolve({ outcome }),
  });
}

beforeEach(() => vi.resetModules());
afterEach(() => vi.unstubAllGlobals());

describe("install platform guidance", () => {
  it.each([
    ["Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)", 1, "ios"],
    ["Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)", 5, "ios"],
    [macSafari, 5, "ios"],
    [macSafari, 0, "safari"],
    [
      "Mozilla/5.0 (Linux; Android 15) Chrome/145.0.0.0 Mobile Safari/537.36",
      5,
      "android",
    ],
    [chrome, 0, "browser"],
    [`${chrome} Edg/145.0.0.0`, 0, "browser"],
    ["Mozilla/5.0 (Macintosh; Intel Mac OS X) Firefox/145.0", 0, "browser"],
  ])(
    "detects %s with %i touch points as %s",
    async (userAgent, touchPoints, expected) => {
      const { detectInstallPlatform } =
        await import("../../lib/studio-install");
      expect(detectInstallPlatform(userAgent, touchPoints)).toBe(expected);
    },
  );
});

describe("studio installation lifecycle", () => {
  it("has a stable browser-free server snapshot and detects insecure contexts", async () => {
    const store = await import("../../lib/studio-install");
    const server = store.getServerStudioInstallState();
    expect(server).toMatchObject({
      ready: false,
      installed: false,
      canPrompt: false,
    });
    expect(store.getServerStudioInstallState()).toBe(server);
    browser({ secure: false });
    const unsubscribe = store.subscribeToStudioInstall(vi.fn());
    expect(store.getStudioInstallState()).toMatchObject({
      ready: true,
      secure: false,
    });
    expect(store.getServerStudioInstallState()).toBe(server);
    expect(server.ready).toBe(false);
    unsubscribe();
  });

  it("defers the browser prompt and consumes it once, even with repeated clicks", async () => {
    const { window } = browser();
    const store = await import("../../lib/studio-install");
    const unsubscribe = store.subscribeToStudioInstall(vi.fn());
    let finishPrompt!: () => void;
    const prompt = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishPrompt = resolve;
        }),
    );
    const event = installEvent("accepted", prompt);
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(prompt).not.toHaveBeenCalled();
    expect(store.getStudioInstallState()).toMatchObject({
      canPrompt: true,
      installing: false,
    });

    const result = store.promptStudioInstall();
    expect(store.getStudioInstallState()).toMatchObject({
      canPrompt: false,
      installing: true,
    });
    expect(await store.promptStudioInstall()).toBeNull();
    expect(prompt).toHaveBeenCalledTimes(1);
    finishPrompt();
    expect(await result).toBe("accepted");
    expect(await store.promptStudioInstall()).toBeNull();
    expect(prompt).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("does not claim installation from acceptance until the browser confirms it", async () => {
    const { window } = browser();
    const store = await import("../../lib/studio-install");
    const unsubscribe = store.subscribeToStudioInstall(vi.fn());
    window.dispatchEvent(installEvent());
    expect(await store.promptStudioInstall()).toBe("accepted");
    expect(store.getStudioInstallState()).toMatchObject({
      installed: false,
      installing: false,
    });
    window.dispatchEvent(new Event("appinstalled"));
    expect(store.getStudioInstallState()).toMatchObject({
      installed: true,
      canPrompt: false,
      installing: false,
    });
    expect(await store.promptStudioInstall()).toBeNull();
    unsubscribe();
  });

  it("lets a dismissed installation be retried only with a fresh browser event", async () => {
    const { window } = browser();
    const store = await import("../../lib/studio-install");
    const unsubscribe = store.subscribeToStudioInstall(vi.fn());
    const dismissed = installEvent("dismissed");
    window.dispatchEvent(dismissed);
    expect(await store.promptStudioInstall()).toBe("dismissed");
    expect(store.getStudioInstallState()).toMatchObject({
      installed: false,
      canPrompt: false,
      installing: false,
    });
    expect(await store.promptStudioInstall()).toBeNull();
    const retry = installEvent();
    window.dispatchEvent(retry);
    expect(store.getStudioInstallState().canPrompt).toBe(true);
    expect(await store.promptStudioInstall()).toBe("accepted");
    expect(dismissed.prompt).toHaveBeenCalledTimes(1);
    expect(retry.prompt).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("recovers after a rejected prompt and accepts a later install event", async () => {
    const { window } = browser();
    const store = await import("../../lib/studio-install");
    const unsubscribe = store.subscribeToStudioInstall(vi.fn());
    const error = new Error("Browser could not open its install prompt");
    window.dispatchEvent(
      installEvent("accepted", vi.fn().mockRejectedValue(error)),
    );
    await expect(store.promptStudioInstall()).rejects.toBe(error);
    expect(store.getStudioInstallState()).toMatchObject({
      installed: false,
      canPrompt: false,
      installing: false,
    });
    expect(await store.promptStudioInstall()).toBeNull();
    window.dispatchEvent(installEvent());
    expect(store.getStudioInstallState().canPrompt).toBe(true);
    expect(await store.promptStudioInstall()).toBe("accepted");
    unsubscribe();
  });

  it("ignores events that cannot display a native install prompt", async () => {
    const { window } = browser();
    const store = await import("../../lib/studio-install");
    const unsubscribe = store.subscribeToStudioInstall(vi.fn());
    const event = new Event("beforeinstallprompt", { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(store.getStudioInstallState().canPrompt).toBe(false);
    expect(await store.promptStudioInstall()).toBeNull();
    unsubscribe();
  });

  it("tracks standalone display changes and the iOS standalone flag", async () => {
    const { window, media, navigator } = browser({
      userAgent: macSafari,
      maxTouchPoints: 5,
      standalone: true,
    });
    const store = await import("../../lib/studio-install");
    const unsubscribe = store.subscribeToStudioInstall(vi.fn());
    expect(store.getStudioInstallState()).toMatchObject({
      installed: true,
      platform: "ios",
    });
    expect(window.matchMedia).toHaveBeenCalledWith(
      expect.stringContaining("(display-mode: standalone)"),
    );
    navigator.standalone = false;
    media.change(false);
    expect(store.getStudioInstallState().installed).toBe(false);
    media.change(true);
    expect(store.getStudioInstallState().installed).toBe(true);
    media.change(false);
    expect(store.getStudioInstallState().installed).toBe(false);
    unsubscribe();
  });

  it("shares one set of browser listeners and removes it when the last subscriber leaves", async () => {
    const { window, media } = browser();
    const addWindow = vi.spyOn(window, "addEventListener");
    const removeWindow = vi.spyOn(window, "removeEventListener");
    const addMedia = vi.spyOn(media, "addEventListener");
    const removeMedia = vi.spyOn(media, "removeEventListener");
    const store = await import("../../lib/studio-install");
    const first = vi.fn();
    const second = vi.fn();
    const unsubscribeFirst = store.subscribeToStudioInstall(first);
    const unsubscribeSecond = store.subscribeToStudioInstall(second);
    expect(addWindow).toHaveBeenCalledTimes(2);
    expect(addMedia).toHaveBeenCalledTimes(1);
    first.mockClear();
    unsubscribeFirst();
    expect(removeWindow).not.toHaveBeenCalled();
    media.change(true);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
    unsubscribeSecond();
    expect(removeWindow).toHaveBeenCalledTimes(2);
    expect(removeMedia).toHaveBeenCalledTimes(1);
    const state = store.getStudioInstallState();
    media.change(false);
    window.dispatchEvent(installEvent());
    expect(store.getStudioInstallState()).toBe(state);
    expect(second).toHaveBeenCalledOnce();

    const unsubscribeAgain = store.subscribeToStudioInstall(first);
    expect(addWindow).toHaveBeenCalledTimes(4);
    expect(addMedia).toHaveBeenCalledTimes(2);
    unsubscribeAgain();
  });

  it("never persists an installed flag or treats storage as proof of installation", async () => {
    const { window, storage } = browser();
    const store = await import("../../lib/studio-install");
    const unsubscribe = store.subscribeToStudioInstall(vi.fn());
    expect(store.getStudioInstallState().installed).toBe(false);
    window.dispatchEvent(new Event("appinstalled"));
    expect(store.getStudioInstallState().installed).toBe(true);
    unsubscribe();
    vi.resetModules();
    const newPage = await import("../../lib/studio-install");
    const unsubscribeNewPage = newPage.subscribeToStudioInstall(vi.fn());
    expect(newPage.getStudioInstallState().installed).toBe(false);
    expect(storage.getItem).not.toHaveBeenCalled();
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.removeItem).not.toHaveBeenCalled();
    unsubscribeNewPage();
  });
});
