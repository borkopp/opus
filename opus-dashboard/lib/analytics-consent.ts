import posthog from "posthog-js";
import {
  canCaptureAnalytics as hasAnalyticsConsent,
  createPostHogConsent,
} from "../../shared/analytics/posthog-consent";

// Local development should not load analytics scripts or retry blocked network
// requests. Opt in explicitly when testing analytics; production still requires
// the same consent checks as before.
const analyticsEnabled =
  process.env.NODE_ENV !== "development" ||
  process.env.NEXT_PUBLIC_ANALYTICS_IN_DEV === "true";

export function canCaptureAnalytics() {
  return analyticsEnabled && hasAnalyticsConsent();
}

export const { syncPostHogConsent, initializeAnalyticsConsent } =
  createPostHogConsent(
    posthog,
    analyticsEnabled
      ? process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
      : undefined,
    process.env.NEXT_PUBLIC_POSTHOG_HOST,
    { sessionReplay: true, maskReplayText: true },
  );
