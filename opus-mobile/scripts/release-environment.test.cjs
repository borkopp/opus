const { test } = require("node:test");
const assert = require("node:assert/strict");
const { validateReleaseEnvironment, validateSourceMapEnvironment, sentryDsn } = require("./release-environment.cjs");
const production = {
  EXPO_PUBLIC_CONVEX_URL: "https://calm-dachshund-294.convex.cloud",
  EXPO_PUBLIC_DASHBOARD_URL: "https://studio.opus.mk",
  EXPO_PUBLIC_SENTRY_DSN: sentryDsn,
  SENTRY_ORG: "borko-petrevski",
  SENTRY_PROJECT: "opus-mobile",
  SENTRY_AUTH_TOKEN: "test-upload-credential",
};

test("accepts HTTPS production endpoints without a native development override", () => {
  assert.doesNotThrow(() => validateReleaseEnvironment(production));
});

test("release diagnostics cannot silently disappear or use another ingestion project", () => {
  for (const dsn of [undefined, "", "https://public@example.com/123", `${sentryDsn}?token=private`])
    assert.throws(() => validateReleaseEnvironment({ ...production, EXPO_PUBLIC_SENTRY_DSN: dsn }), /EXPO_PUBLIC_SENTRY_DSN/);
});
test("source-map uploads require a private credential and the correct destination without exposing it", () => {
  assert.doesNotThrow(() => validateSourceMapEnvironment(production));
  for (const overrides of [
    { SENTRY_AUTH_TOKEN: undefined },
    { SENTRY_ORG: "unrelated-organization" },
    { SENTRY_PROJECT: "another-project" },
    { SENTRY_URL: "https://untrusted.example" },
  ]) {
    assert.throws(() => validateSourceMapEnvironment({ ...production, ...overrides }), (error) => {
      assert(!error.message.includes(production.SENTRY_AUTH_TOKEN));
      return /source-map configuration/.test(error.message);
    });
  }
});
test("rejects missing, local, credential-bearing and malformed backend endpoints", () => {
  for (const url of [
    undefined,
    "http://localhost:3210",
    "https://localhost",
    "https://example.com",
    "https://another-studio.convex.cloud",
    "https://user:secret@opus-production.convex.cloud",
    "https://opus-production.convex.cloud/api",
    "https://opus-production.convex.cloud?token=secret",
  ])
    assert.throws(() =>
      validateReleaseEnvironment({
        ...production,
        EXPO_PUBLIC_CONVEX_URL: url,
      }),
    );
});
test("rejects local dashboard overrides and unexpected sign-in hosts", () => {
  assert.throws(() =>
    validateReleaseEnvironment({
      ...production,
      EXPO_PUBLIC_NATIVE_DASHBOARD_URL: "http://192.168.0.200:3000",
    }),
  );
  assert.throws(() =>
    validateReleaseEnvironment({
      ...production,
      EXPO_PUBLIC_DASHBOARD_URL: "https://example.com",
    }),
  );
});
test("requires a real project identifier for EAS builds", () => {
  assert.throws(() =>
    validateReleaseEnvironment({ ...production, EAS_BUILD: "true" }),
  );
  assert.doesNotThrow(() =>
    validateReleaseEnvironment({
      ...production,
      EAS_BUILD: "true",
      EAS_PROJECT_ID: "634b3403-0012-42f0-9cc1-a5725f12f2cc",
    }),
  );
});
test("requires Firebase configuration for an Android EAS release with push", () => {
  const build = {
    ...production,
    EAS_BUILD: "true",
    EAS_BUILD_PLATFORM: "android",
    EAS_PROJECT_ID: "634b3403-0012-42f0-9cc1-a5725f12f2cc",
  };
  assert.throws(
    () => validateReleaseEnvironment(build),
    /GOOGLE_SERVICES_JSON/,
  );
  assert.doesNotThrow(() =>
    validateReleaseEnvironment({
      ...build,
      GOOGLE_SERVICES_JSON: "/eas/google-services.json",
    }),
  );
});

test("rejects a different EAS project and accepts the EAS cloud builtin project identity", () => {
  assert.throws(() => validateReleaseEnvironment({
    ...production, EAS_BUILD: "true", EAS_PROJECT_ID: "11111111-1111-4111-8111-111111111111",
  }), /EAS_PROJECT_ID/);
  assert.doesNotThrow(() => validateReleaseEnvironment({
    ...production, EAS_BUILD: "true", EAS_BUILD_PROJECT_ID: "634b3403-0012-42f0-9cc1-a5725f12f2cc",
  }));
});
