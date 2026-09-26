import { getConsent, isPlatformHost, subscribeConsent } from "./consent";
import { maskReplayText as maskPrivateReplayText } from "./replay-masking";

export function canCaptureAnalytics() {
  return (
    typeof window !== "undefined" &&
    isPlatformHost(window.location.hostname) &&
    !window.location.pathname.startsWith("/sites/") &&
    !window.location.pathname.startsWith("/onboarding/preview") &&
    getConsent().analytics
  );
}

function postHogConfig(
  host: string,
  sessionReplay: boolean,
  maskReplayText: boolean,
) {
  return {
    api_host: host,
    defaults: "2026-01-30" as const,
    opt_out_capturing_by_default: true,
    opt_out_persistence_by_default: true,
    disable_session_recording: !sessionReplay,
    session_recording: {
      maskAllInputs: true,
      ...(maskReplayText
        ? { maskTextSelector: "*", maskTextFn: maskPrivateReplayText }
        : {}),
    },
    capture_exceptions: true,
    cookie_expiration: 180,
    before_send: <T>(event: T) => (canCaptureAnalytics() ? event : null),
    debug: process.env.NODE_ENV === "development",
  };
}

// Each independent app supplies its SDK singleton. Shared code does not need
// to resolve dependencies from either app or initialize a second instance.
type PostHogClient = {
  init: (token: string, config: ReturnType<typeof postHogConfig>) => unknown;
  get_explicit_consent_status: () => string;
  opt_in_capturing: (options: { captureEventName: false }) => unknown;
  opt_out_capturing: () => unknown;
  capture: (event: string) => unknown;
};

export function createPostHogConsent(
  posthog: PostHogClient,
  projectToken: string | undefined,
  host: string | undefined,
  options: { sessionReplay?: boolean; maskReplayText?: boolean } = {},
) {
  let initialized = false;

  function syncPostHogConsent() {
    if (!projectToken || !host) return;
    const allowed = canCaptureAnalytics();
    if (!initialized) {
      if (!allowed) return;
      initialized = true;
      posthog.init(
        projectToken,
        postHogConfig(
          host,
          options.sessionReplay === true,
          options.maskReplayText === true,
        ),
      );
    }
    if (allowed && posthog.get_explicit_consent_status() !== "granted") {
      posthog.opt_in_capturing({ captureEventName: false });
      posthog.capture("$pageview");
    } else if (!allowed && posthog.get_explicit_consent_status() !== "denied") {
      posthog.opt_out_capturing();
    }
  }

  function initializeAnalyticsConsent() {
    syncPostHogConsent();
    return subscribeConsent(syncPostHogConsent);
  }

  return { syncPostHogConsent, initializeAnalyticsConsent };
}
