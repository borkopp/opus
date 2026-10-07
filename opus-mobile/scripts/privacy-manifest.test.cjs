const { test } = require("node:test");
const assert = require("node:assert/strict");
const { expo } = require("../app.json");
const resolveConfig = require("../app.config.js");

const prefix = "NSPrivacyCollectedDataType";
const functionality = `${prefix}PurposeAppFunctionality`;
const operationalTypes = [
  "Name", "EmailAddress", "PhoneNumber", "OtherFinancialInfo", "CoarseLocation",
  "OtherUserContent", "PurchaseHistory", "CrashData", "PerformanceData",
  "OtherDiagnosticData", "OtherDataTypes", "UserID", "DeviceID", "ProductInteraction",
];

test("native disclosures cover retained operational data without advertising or unsupported data types", () => {
  const manifest = expo.ios.privacyManifests;
  const rows = manifest.NSPrivacyCollectedDataTypes;
  const names = rows.map((row) => row.NSPrivacyCollectedDataType);
  assert.equal(new Set(names).size, names.length, "duplicate privacy type");
  assert.deepEqual(names.slice().sort(), operationalTypes.map((name) => `${prefix}${name}`).sort());
  assert.equal(manifest.NSPrivacyTracking, false);
  assert.deepEqual(manifest.NSPrivacyTrackingDomains, []);
  for (const row of rows) {
    assert.equal(row.NSPrivacyCollectedDataTypeLinked, true);
    assert.equal(row.NSPrivacyCollectedDataTypeTracking, false);
    assert.deepEqual(row.NSPrivacyCollectedDataTypePurposes, [functionality]);
  }
});

test("dynamic release configuration preserves the audited native privacy declarations", (t) => {
  const previous = { ...process.env };
  t.after(() => {
    for (const key of Object.keys(process.env)) if (!(key in previous)) delete process.env[key];
    Object.assign(process.env, previous);
  });
  for (const key of Object.keys(process.env))
    if (key.startsWith("EXPO_PUBLIC_") || key.startsWith("EAS_")) delete process.env[key];
  Object.assign(process.env, {
    APP_ENV: "production",
    EXPO_PUBLIC_CONVEX_URL: "https://calm-dachshund-294.convex.cloud",
    EXPO_PUBLIC_DASHBOARD_URL: "https://studio.opus.mk",
    EXPO_PUBLIC_SENTRY_DSN: require("./release-environment.cjs").sentryDsn,
  });
  const config = resolveConfig({ config: expo });
  assert.deepEqual(config.ios.privacyManifests, expo.ios.privacyManifests);
  assert.equal(config.ios.infoPlist?.NSLocalNetworkUsageDescription, undefined);
  assert.match(config.extra.nativeRuntimeSignature, /^[a-f0-9]{64}$/);
});
