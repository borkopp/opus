import * as Sentry from "@sentry/react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Updates from "expo-updates";
import { Platform } from "react-native";
import { sanitizeDiagnosticEvent, sanitizeDiagnosticSpan } from "./monitoring-privacy";

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
export const monitoringEnabled = !!dsn && !__DEV__ && Platform.OS !== "web" &&
  Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

export const navigationMonitoring = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: true,
  useDispatchedActionData: false,
  useFullPathsForNavigationRoutes: false,
});

if (monitoringEnabled) {
  Sentry.init({
    dsn,
    environment: Updates.channel ?? Constants.expoConfig?.extra?.environment ?? "production",
    debug: false,
    sendDefaultPii: false,
    sampleRate: 1,
    tracesSampleRate: Updates.channel === "production" ? 0.2 : 1,
    profilesSampleRate: 0,
    enableAutoSessionTracking: true,
    enableNativeCrashHandling: true,
    enableAppHangTracking: true,
    appHangTimeoutInterval: 2,
    enableWatchdogTerminationTracking: true,
    enableAppStartTracking: true,
    enableNativeFramesTracking: true,
    enableStallTracking: true,
    enableUserInteractionTracing: false,
    enableCaptureFailedRequests: false,
    enableNativeNagger: false,
    enableLogs: false,
    enableMemoryIntrospection: false,
    enableMetricKit: false,
    enableMetricKitRawPayload: false,
    attachScreenshot: false,
    attachViewHierarchy: false,
    maxBreadcrumbs: 0,
    maxCacheItems: 20,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    enableAutoBreadcrumbTracking: false,
    enableNetworkBreadcrumbs: false,
    enableNetworkEventBreadcrumbs: false,
    enableActivityLifecycleBreadcrumbs: false,
    enableAppLifecycleBreadcrumbs: false,
    enableSystemEventBreadcrumbs: false,
    enableAppComponentBreadcrumbs: false,
    // These additional Cocoa options are forwarded to its native SDK.
    ...{
      enableNetworkTracking: false,
      enableFileIOTracing: false,
    },
    tracePropagationTargets: [],
    beforeBreadcrumb: () => null,
    beforeSend: sanitizeDiagnosticEvent,
    beforeSendTransaction: sanitizeDiagnosticEvent,
    beforeSendSpan: sanitizeDiagnosticSpan,
    integrations: (defaults) => [
      ...defaults.filter((integration) => ![
        "Breadcrumbs", "HttpContext", "ExpoContext", "MobileReplay", "Replay",
        "UserInteraction", "ConsoleLogs", "CaptureConsole",
      ].includes(integration.name)),
      Sentry.reactNativeTracingIntegration({
        traceFetch: false,
        traceXHR: false,
        enableHTTPTimings: false,
      }),
      navigationMonitoring,
    ],
  });
  const scope = Sentry.getGlobalScope();
  scope.setTag("expo-update-id", Updates.updateId ?? "embedded");
  scope.setTag("expo-is-embedded-update", Updates.isEmbeddedLaunch);
  scope.setTag("expo-update-channel", Updates.channel ?? "local-release");
  scope.setTag("expo-runtime-version", Updates.runtimeVersion ?? "unknown");
  scope.setTag("native-runtime-signature", Constants.expoConfig?.extra?.nativeRuntimeSignature);
}

type MonitoringArea = "render" | "account-sync" | "push-registration";

export function captureAppError(error: unknown, area: MonitoringArea) {
  if (!monitoringEnabled) return;
  Sentry.captureException(error, { tags: { "monitoring-area": area } });
}
