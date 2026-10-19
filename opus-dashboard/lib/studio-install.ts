export type InstallPlatform = "ios" | "android" | "safari" | "browser";

export function detectInstallPlatform(
  userAgent: string,
  maxTouchPoints = 0,
): InstallPlatform {
  if (
    /iPhone|iPad|iPod/i.test(userAgent) ||
    (/Macintosh/i.test(userAgent) && maxTouchPoints > 1)
  )
    return "ios";
  if (/Android/i.test(userAgent)) return "android";
  if (/Safari/i.test(userAgent) && !/Chrome|Chromium|Edg|OPR/i.test(userAgent))
    return "safari";
  return "browser";
}

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export interface StudioInstallState {
  ready: boolean;
  secure: boolean;
  installed: boolean;
  canPrompt: boolean;
  installing: boolean;
  platform: InstallPlatform;
}

const initialState: StudioInstallState = {
  ready: false,
  secure: false,
  installed: false,
  canPrompt: false,
  installing: false,
  platform: "browser",
};
let state = initialState;
let pendingPrompt: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
let cleanup: (() => void) | undefined;

function publish(update: Partial<StudioInstallState>) {
  state = { ...state, ...update };
  listeners.forEach((listener) => listener());
}

function listen() {
  const displayMode = window.matchMedia(
    "(display-mode: standalone), (display-mode: minimal-ui)",
  );
  const standalone = () =>
    displayMode.matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const onDisplayChange = () => publish({ installed: standalone() });
  const onPrompt = (event: Event) => {
    const prompt = event as InstallPromptEvent;
    if (typeof prompt.prompt !== "function") return;
    event.preventDefault();
    pendingPrompt = prompt;
    publish({ canPrompt: true });
  };
  const onInstalled = () => {
    pendingPrompt = null;
    publish({ installed: true, canPrompt: false, installing: false });
  };
  window.addEventListener("beforeinstallprompt", onPrompt);
  window.addEventListener("appinstalled", onInstalled);
  displayMode.addEventListener("change", onDisplayChange);
  publish({
    ready: true,
    secure: window.isSecureContext,
    installed: state.installed || standalone(),
    platform: detectInstallPlatform(
      navigator.userAgent,
      navigator.maxTouchPoints,
    ),
  });
  return () => {
    window.removeEventListener("beforeinstallprompt", onPrompt);
    window.removeEventListener("appinstalled", onInstalled);
    displayMode.removeEventListener("change", onDisplayChange);
  };
}

export function subscribeToStudioInstall(listener: () => void) {
  listeners.add(listener);
  if (!cleanup) cleanup = listen();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      cleanup?.();
      cleanup = undefined;
    }
  };
}

export const getStudioInstallState = () => state;
export const getServerStudioInstallState = () => initialState;

/** Call only from an explicit button press; a browser prompt can be used once. */
export async function promptStudioInstall() {
  const prompt = pendingPrompt;
  if (!prompt || state.installing || state.installed) return null;
  pendingPrompt = null;
  publish({ canPrompt: false, installing: true });
  try {
    await prompt.prompt();
    return (await prompt.userChoice).outcome;
  } finally {
    publish({ installing: false });
  }
}
