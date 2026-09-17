import {
  clearMetaCookies,
  getConsent,
  isPlatformHost,
  subscribeConsent,
} from "./consent";

type PixelCommand = unknown[];
type PixelFunction = {
  (...args: PixelCommand): void;
  callMethod?: (...args: PixelCommand) => void;
  queue: PixelCommand[];
  push: PixelFunction;
  loaded: boolean;
  version: string;
  disablePushState: boolean;
};

declare global {
  interface Window {
    fbq?: PixelFunction;
    _fbq?: PixelFunction;
  }
}

export type PixelSurface = "landing" | "studio";
let initializedId: string | null = null;
let lastPage: string | null = null;
const sentRegistrations = new Set<string>();

export function validPixelId(value: string | undefined) {
  return value && /^\d{5,25}$/.test(value) ? value : null;
}

export function isPixelPage(url: URL, surface: PixelSurface) {
  if (!isPlatformHost(url.hostname)) return false;
  if (surface === "landing" && url.hostname === "studio.opus.mk") return false;
  if (surface === "studio" && ["opus.mk", "www.opus.mk"].includes(url.hostname))
    return false;
  const path = url.pathname.replace(/\/$/, "") || "/";
  const allowed =
    surface === "landing"
      ? ["/", "/pricing", "/contact", "/privacy", "/terms"]
      : ["/signup", "/onboarding"];
  if (!allowed.includes(path)) return false;
  if (
    url.hash &&
    ![
      "#product",
      "#how-it-works",
      "#pricing",
      "#cookies",
      "#features",
      "#faq",
    ].includes(url.hash)
  )
    return false;
  // Pixel sees the current URL. Never load it on links containing auth tokens,
  // callbacks, customer IDs or other unknown query parameters.
  return [...url.searchParams].every(
    ([key, value]) =>
      [
        "fbclid",
        "utm_source",
        "utm_medium",
        "utm_campaign",
        "utm_content",
        "utm_term",
        "lang",
        "step",
      ].includes(key) && /^[a-zA-Z0-9_.~-]{1,500}$/.test(value),
  );
}

function eligible(id: string | undefined, surface: PixelSurface) {
  return (
    typeof window !== "undefined" &&
    validPixelId(id) &&
    getConsent().marketing &&
    isPixelPage(new URL(window.location.href), surface)
  );
}

export function revokePixel() {
  if (typeof window === "undefined") return;
  // If consent changes before the SDK arrives, discard queued events entirely.
  if (window.fbq && !window.fbq.callMethod) {
    window.fbq.queue = window.fbq.queue.filter(
      ([command]) => command !== "trackSingle",
    );
  }
  window.fbq?.("consent", "revoke");
  lastPage = null;
  if (!getConsent().marketing) clearMetaCookies();
}

function initializePixel(id: string, surface: PixelSurface) {
  if (!eligible(id, surface)) return false;
  if (!window.fbq) {
    const fbq = function (...args: PixelCommand) {
      if (fbq.callMethod) fbq.callMethod(...args);
      else fbq.queue.push(args);
    } as PixelFunction;
    fbq.queue = [];
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = "2.0";
    // Next.js navigation is tracked explicitly below, once per pathname.
    fbq.disablePushState = true;
    window.fbq = fbq;
    window._fbq = fbq;
  }

  if (initializedId && initializedId !== id) return false;
  window.fbq("consent", "grant");
  if (!initializedId) {
    // No automatic form/click tracking or advanced matching of account details.
    window.fbq("set", "autoConfig", false, id);
    window.fbq("init", id);
    initializedId = id;
  }
  if (!document.getElementById("opus-meta-pixel")) {
    const script = document.createElement("script");
    script.id = "opus-meta-pixel";
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    script.onload = () => {
      if (!eligible(id, surface)) revokePixel();
    };
    script.onerror = () => {
      script.remove();
    };
    document.head.appendChild(script);
  }
  return true;
}

export function syncPixelPage(id: string | undefined, surface: PixelSurface) {
  try {
    if (!eligible(id, surface) || !id) {
      revokePixel();
      return;
    }
    if (!initializePixel(id, surface)) return;
    const page = window.location.origin + window.location.pathname;
    if (lastPage === page) return;
    lastPage = page;
    window.fbq?.("trackSingle", id, "PageView");
  } catch {
    // Advertising must never interrupt rendering, sign-in or onboarding.
  }
}

export function observePixel(id: string | undefined, surface: PixelSurface) {
  const sync = () => syncPixelPage(id, surface);
  sync();
  return subscribeConsent(sync);
}

export function trackStudioRegistration(id: string | undefined, orgId: string) {
  try {
    if (!id || !eligible(id, "studio") || sentRegistrations.has(orgId)) return;
    if (!initializePixel(id, "studio")) return;
    sentRegistrations.add(orgId);
    // orgId is used only for local deduplication; no identity or studio data is sent.
    window.fbq?.("trackSingle", id, "CompleteRegistration", {
      content_name: "OPUS free studio registration",
      status: true,
    });
  } catch {
    // A blocked Pixel cannot turn a successful studio registration into an error.
  }
}
