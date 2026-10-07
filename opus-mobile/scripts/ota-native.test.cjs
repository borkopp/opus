const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { projectId, nativeSnapshot, assertNativeCompatibility } = require("./ota-native.cjs");

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "opus-ota-test-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (name, value) => fs.writeFileSync(path.join(root, name), typeof value === "string" ? value : JSON.stringify(value));
  const expo = {
    version: "1.0.0", runtimeVersion: { policy: "appVersion" },
    updates: { url: `https://u.expo.dev/${projectId}` },
    extra: { eas: { projectId } }, ios: { buildNumber: "1" }, android: { versionCode: 1 },
    plugins: [["expo-notifications", { color: "#2588c8" }]],
  };
  write("app.json", { expo });
  write("app.config.js", "module.exports = ({config}) => config;");
  write("package.json", { dependencies: { expo: "~57.0.26" } });
  write("package-lock.json", { packages: { "node_modules/expo": { version: "57.0.26", integrity: "original" } } });
  fs.mkdirSync(path.join(root, "assets"));
  write("assets/icon.png", "native-branding");
  return { root, expo, write };
}
function baseline(snapshot) {
  return { runtimes: { [snapshot.appVersion]: { ...snapshot, builds: { "production:ios": { id: "completed-build" } } } } };
}
test("JS route changes and build counter increments keep the native runtime compatible", (t) => {
  const f = fixture(t);
  const before = nativeSnapshot(f.root);
  f.write("screen.tsx", "export const NewScreen = 'JS-only fix';");
  f.expo.ios.buildNumber = "2";
  f.expo.android.versionCode = 2;
  f.write("app.json", { expo: f.expo });
  const after = nativeSnapshot(f.root);
  assert.equal(before.nativeSignature, after.nativeSignature);
  assert.doesNotThrow(() => assertNativeCompatibility(after, baseline(before), "production", "ios"));
});
test("plugin options, branding, native config and resolved dependencies block same-version OTA", (t) => {
  for (const change of [
    (f) => { f.expo.plugins[0][1].color = "#000000"; f.write("app.json", { expo: f.expo }); },
    (f) => { f.expo.ios.privacyManifests = { NSPrivacyCollectedDataTypes: [{ NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypeCrashData" }] }; f.write("app.json", { expo: f.expo }); },
    (f) => f.write("assets/icon.png", "changed-branding"),
    (f) => f.write("app.config.js", "module.exports = ({config}) => ({...config, scheme: 'changed'});"),
    (f) => f.write("package-lock.json", { packages: { "node_modules/expo": { version: "57.0.27", integrity: "new" } } }),
  ]) {
    const f = fixture(t);
    const before = nativeSnapshot(f.root);
    change(f);
    assert.throws(() => assertNativeCompatibility(nativeSnapshot(f.root), baseline(before), "production", "ios"), /Bump expo.version/);
  }
});
test("a new app version or unrecorded platform cannot receive OTA before a completed matching build", (t) => {
  const f = fixture(t);
  const before = nativeSnapshot(f.root);
  const saved = baseline(before);
  assert.throws(() => assertNativeCompatibility(before, saved, "preview", "ios"), /no verified/);
  assert.throws(() => assertNativeCompatibility(before, saved, "production", "all"), /android/);
  f.expo.version = "1.1.0";
  f.write("app.json", { expo: f.expo });
  const after = nativeSnapshot(f.root);
  assert.equal(before.nativeSignature, after.nativeSignature);
  assert.throws(() => assertNativeCompatibility(after, saved, "production", "ios"), /no baseline/);
});
test("changing the Expo project or runtime policy blocks publishing", (t) => {
  const f = fixture(t);
  f.expo.runtimeVersion.policy = "fingerprint";
  f.write("app.json", { expo: f.expo });
  assert.throws(() => nativeSnapshot(f.root), /appVersion/);
  f.expo.runtimeVersion.policy = "appVersion";
  f.expo.extra.eas.projectId = "another-project";
  f.write("app.json", { expo: f.expo });
  assert.throws(() => nativeSnapshot(f.root), /existing OPUS/);
});
test("a preview simulator baseline cannot qualify a production or preview device update", (t) => {
  const f = fixture(t);
  const snapshot = nativeSnapshot(f.root);
  const saved = { runtimes: { [snapshot.appVersion]: { ...snapshot, builds: {
    "preview-simulator:ios": { id: "completed-simulator-build", isForIosSimulator: true },
  } } } };
  assert.doesNotThrow(() => assertNativeCompatibility(snapshot, saved, "preview-simulator", "ios"));
  for (const profile of ["production", "preview"])
    assert.throws(() => assertNativeCompatibility(snapshot, saved, profile, "ios"), /no verified/);
  saved.runtimes[snapshot.appVersion].builds["production:ios"] =
    saved.runtimes[snapshot.appVersion].builds["preview-simulator:ios"];
  assert.throws(() => assertNativeCompatibility(snapshot, saved, "production", "ios"), /simulator\/device kind/);
});
