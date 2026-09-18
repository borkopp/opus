import posthog from "posthog-js";
import { createPostHogConsent } from "../../shared/analytics/posthog-consent";

export const { syncPostHogConsent, initializeAnalyticsConsent } =
  createPostHogConsent(
    posthog,
    process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN,
    process.env.NEXT_PUBLIC_POSTHOG_HOST,
  );
