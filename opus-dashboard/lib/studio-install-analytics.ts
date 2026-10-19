import posthog from "posthog-js";
import { subscribeConsent } from "../../shared/analytics/consent";
import { canCaptureAnalytics, syncPostHogConsent } from "./analytics-consent";
import { detectInstallPlatform } from "./studio-install";

// Document-lifetime deduplication survives route changes and provider remounts.
// Nothing is persisted, and actions taken without consent are never queued.
let appOpenCaptured = false;
let installationCaptured = false;
let subscribers = 0;
let cleanup: (() => void) | undefined;

function displayMode() {
  if (
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches
  )
    return "standalone";
  if (window.matchMedia("(display-mode: minimal-ui)").matches)
    return "minimal-ui";
  return "browser";
}

function capture(
  event:
    | "studio_app_opened"
    | "studio_app_installed"
    | "studio_install_instructions_opened",
) {
  if (!canCaptureAnalytics()) return false;
  syncPostHogConsent();
  if (posthog.get_explicit_consent_status() !== "granted") return false;
  posthog.capture(event, {
    platform: detectInstallPlatform(
      navigator.userAgent,
      navigator.maxTouchPoints,
    ),
    display_mode: displayMode(),
  });
  return true;
}

export function captureStudioInstallInstructionsOpened() {
  capture("studio_install_instructions_opened");
}

/** Observe the current app window, never the install UI's remembered state. */
export function subscribeStudioInstallAnalytics() {
  if (typeof window === "undefined") return () => {};
  subscribers += 1;
  if (!cleanup) {
    const captureCurrentLaunch = () => {
      if (!appOpenCaptured && displayMode() !== "browser") {
        appOpenCaptured = capture("studio_app_opened");
      }
    };
    const onInstalled = () => {
      if (!installationCaptured) {
        installationCaptured = capture("studio_app_installed");
      }
    };
    const media = [
      window.matchMedia("(display-mode: standalone)"),
      window.matchMedia("(display-mode: minimal-ui)"),
    ];
    for (const query of media)
      query.addEventListener("change", captureCurrentLaunch);
    window.addEventListener("appinstalled", onInstalled);
    // A user accepting the existing analytics choice while in the app makes
    // this current launch eligible; earlier clicks/installation are not replayed.
    const unsubscribeConsent = subscribeConsent(captureCurrentLaunch);
    captureCurrentLaunch();
    cleanup = () => {
      for (const query of media)
        query.removeEventListener("change", captureCurrentLaunch);
      window.removeEventListener("appinstalled", onInstalled);
      unsubscribeConsent();
    };
  }
  return () => {
    subscribers -= 1;
    if (subscribers === 0) {
      cleanup?.();
      cleanup = undefined;
    }
  };
}
