import { afterEach, beforeEach, expect, test, vi } from "vitest";

const state = vi.hoisted(() => ({ allowed: false, status: "pending" }));
const sdk = vi.hoisted(() => ({
  init: vi.fn<
    (
      id: string,
      config: {
        disable_session_recording: boolean;
        session_recording: {
          maskAllInputs: boolean;
          maskTextSelector?: string;
          maskTextFn?: (text: string, element?: HTMLElement) => string;
        };
        before_send: (event: unknown) => unknown;
      },
    ) => void
  >(),
  capture: vi.fn(),
  get_explicit_consent_status: vi.fn(() => state.status),
  opt_in_capturing: vi.fn(() => {
    state.status = "granted";
  }),
  opt_out_capturing: vi.fn(() => {
    state.status = "denied";
  }),
}));
vi.mock("posthog-js", () => ({ default: sdk }));
vi.mock("../../../shared/analytics/consent", () => ({
  getConsent: () => ({ analytics: state.allowed, marketing: false }),
  isPlatformHost: (host: string) => host === "studio.opus.mk",
  subscribeConsent: () => () => {},
}));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  state.allowed = false;
  state.status = "pending";
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN", "test-token");
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "https://analytics.example.com");
  vi.stubEnv("NEXT_PUBLIC_ANALYTICS_IN_DEV", "false");
  vi.stubGlobal("window", {
    location: new URL("https://studio.opus.mk/signup"),
  });
});

test("landing replay is opt-in, masks inputs, and respects consent withdrawal", async () => {
  const { createPostHogConsent } =
    await import("../../../shared/analytics/posthog-consent");
  const { syncPostHogConsent } = createPostHogConsent(
    sdk,
    "test-token",
    "https://analytics.example.com",
    { sessionReplay: true },
  );

  syncPostHogConsent();
  expect(sdk.init).not.toHaveBeenCalled();
  state.allowed = true;
  syncPostHogConsent();
  const config = sdk.init.mock.calls[0][1];
  expect(config.disable_session_recording).toBe(false);
  expect(config.session_recording.maskAllInputs).toBe(true);
  expect(config.session_recording.maskTextSelector).toBeUndefined();
  expect(config.session_recording.maskTextFn).toBeUndefined();
  expect(sdk.opt_in_capturing).toHaveBeenCalledOnce();

  state.allowed = false;
  syncPostHogConsent();
  expect(sdk.opt_out_capturing).toHaveBeenCalledOnce();
  expect(config.before_send({ event: "$snapshot" })).toBeNull();

  state.allowed = true;
  syncPostHogConsent();
  expect(sdk.init).toHaveBeenCalledOnce();
  expect(sdk.opt_in_capturing).toHaveBeenCalledTimes(2);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

test("does not initialise PostHog until analytics consent and opts out on withdrawal", async () => {
  vi.stubEnv("NODE_ENV", "production");
  const { syncPostHogConsent } = await import("../../lib/analytics-consent");
  syncPostHogConsent();
  expect(sdk.init).not.toHaveBeenCalled();
  state.allowed = true;
  syncPostHogConsent();
  expect(sdk.init).toHaveBeenCalledOnce();
  expect(sdk.opt_in_capturing).toHaveBeenCalledOnce();
  const config = sdk.init.mock.calls[0][1];
  expect(config.disable_session_recording).toBe(false);
  expect(config.session_recording.maskAllInputs).toBe(true);
  expect(config.session_recording.maskTextSelector).toBe("*");
  const { maskReplayText } =
    await import("../../../shared/analytics/replay-masking");
  expect(config.session_recording.maskTextFn).toBe(maskReplayText);
  expect(config.session_recording.maskTextFn?.("Private client")).toBe(
    "******* ******",
  );
  state.allowed = false;
  expect(config.before_send({ event: "should-not-send" })).toBeNull();
  syncPostHogConsent();
  expect(sdk.opt_out_capturing).toHaveBeenCalledOnce();
});

test("does not initialise analytics in development even with existing consent", async () => {
  vi.stubEnv("NODE_ENV", "development");
  state.allowed = true;
  const { syncPostHogConsent, canCaptureAnalytics } =
    await import("../../lib/analytics-consent");
  syncPostHogConsent();
  expect(sdk.init).not.toHaveBeenCalled();
  expect(sdk.capture).not.toHaveBeenCalled();
  expect(canCaptureAnalytics()).toBe(false);
});

test("an explicit development opt-in still requires analytics consent", async () => {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("NEXT_PUBLIC_ANALYTICS_IN_DEV", "true");
  const { syncPostHogConsent, canCaptureAnalytics } =
    await import("../../lib/analytics-consent");
  syncPostHogConsent();
  expect(sdk.init).not.toHaveBeenCalled();
  expect(canCaptureAnalytics()).toBe(false);
  state.allowed = true;
  syncPostHogConsent();
  expect(sdk.init).toHaveBeenCalledOnce();
  expect(canCaptureAnalytics()).toBe(true);
});

test("reapplies consent after an identity reset without reinitialising the SDK", async () => {
  const { syncPostHogConsent } = await import("../../lib/analytics-consent");
  state.allowed = true;
  syncPostHogConsent();
  state.status = "pending";
  syncPostHogConsent();
  expect(sdk.opt_in_capturing).toHaveBeenCalledTimes(2);
  expect(sdk.init).toHaveBeenCalledOnce();
});
