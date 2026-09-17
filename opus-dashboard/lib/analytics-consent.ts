import posthog from "posthog-js";
import {
  getConsent,
  isPlatformHost,
  subscribeConsent,
} from "../../shared/analytics/consent";

const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
let initialized = false;

export function canCaptureAnalytics() {
  return (
    typeof window !== "undefined" &&
    isPlatformHost(window.location.hostname) &&
    !window.location.pathname.startsWith("/sites/") &&
    getConsent().analytics
  );
}

export function syncPostHogConsent() {
  if (!projectToken || !host) return;
  const allowed = canCaptureAnalytics();
  if (!initialized) {
    if (!allowed) return;
    initialized = true;
    posthog.init(projectToken, {
      api_host: host,
      defaults: "2026-01-30",
      opt_out_capturing_by_default: true,
      opt_out_persistence_by_default: true,
      disable_session_recording: true,
      capture_exceptions: true,
      cookie_expiration: 180,
      before_send: (event) => (canCaptureAnalytics() ? event : null),
      debug: process.env.NODE_ENV === "development",
    });
  }
  if (allowed && posthog.get_explicit_consent_status() !== "granted") {
    posthog.opt_in_capturing({ captureEventName: false });
    posthog.capture("$pageview");
  } else if (!allowed && posthog.get_explicit_consent_status() !== "denied") {
    posthog.opt_out_capturing();
  }
}

export function initializeAnalyticsConsent() {
  syncPostHogConsent();
  return subscribeConsent(syncPostHogConsent);
}
