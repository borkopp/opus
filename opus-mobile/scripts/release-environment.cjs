const sentryOrganization = "borko-petrevski";
const sentryProject = "opus-mobile";
const sentryDsn = "https://fdeb62b761730878f976885e35d25e0d@o4508979194298368.ingest.de.sentry.io/4512212669628496";

function validateSourceMapEnvironment(env) {
  const errors = [];
  if (!env.SENTRY_AUTH_TOKEN?.trim())
    errors.push("SENTRY_AUTH_TOKEN is required privately for release source-map uploads.");
  if (env.SENTRY_ORG !== sentryOrganization || env.SENTRY_PROJECT !== sentryProject)
    errors.push("SENTRY_ORG and SENTRY_PROJECT must target the OPUS mobile diagnostics project.");
  if (env.SENTRY_URL && env.SENTRY_URL.replace(/\/$/, "") !== "https://sentry.io")
    errors.push("SENTRY_URL must use the official Sentry service.");
  if (errors.length)
    throw new Error(`OPUS Studio source-map configuration:\n${errors.join("\n")}`);
}

function validateReleaseEnvironment(env) {
  const errors = [];
  try {
    const url = new URL(env.EXPO_PUBLIC_CONVEX_URL || "");
    if (
      url.protocol !== "https:" ||
      url.hostname !== "calm-dachshund-294.convex.cloud" ||
      url.username ||
      url.password ||
      url.port ||
      url.search ||
      url.hash ||
      (url.pathname !== "/" && url.pathname !== "")
    )
      throw new Error();
  } catch {
    errors.push(
      "EXPO_PUBLIC_CONVEX_URL must be https://calm-dachshund-294.convex.cloud.",
    );
  }
  if (
    env.EXPO_PUBLIC_DASHBOARD_URL?.replace(/\/$/, "") !==
    "https://studio.opus.mk"
  )
    errors.push("EXPO_PUBLIC_DASHBOARD_URL must be https://studio.opus.mk.");
  if (env.EXPO_PUBLIC_NATIVE_DASHBOARD_URL?.trim())
    errors.push(
      "Remove the local EXPO_PUBLIC_NATIVE_DASHBOARD_URL override for a release.",
    );
  if (env.EXPO_PUBLIC_SENTRY_DSN !== sentryDsn)
    errors.push("EXPO_PUBLIC_SENTRY_DSN must target the OPUS mobile EU diagnostics project.");
  if (
    env.EAS_BUILD === "true" &&
    (env.EAS_BUILD_PROJECT_ID || env.EAS_PROJECT_ID) !==
      "634b3403-0012-42f0-9cc1-a5725f12f2cc"
  )
    errors.push(
      "EAS_PROJECT_ID must identify the existing OPUS Studio Expo project.",
    );
  if (
    env.EAS_BUILD === "true" &&
    env.EAS_BUILD_PLATFORM === "android" &&
    !env.GOOGLE_SERVICES_JSON?.trim()
  )
    errors.push(
      "GOOGLE_SERVICES_JSON must point to the Android Firebase configuration provided by an EAS file environment variable.",
    );
  if (errors.length)
    throw new Error(`OPUS Studio release configuration:\n${errors.join("\n")}`);
  if (env.EAS_BUILD === "true") validateSourceMapEnvironment(env);
}

module.exports = { validateReleaseEnvironment, validateSourceMapEnvironment, sentryDsn };
