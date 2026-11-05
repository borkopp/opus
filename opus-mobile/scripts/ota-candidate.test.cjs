const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { candidateOptions, exportEnvironment, fileInventory, inspectExport, releaseEnvironment, verifyCandidate, publishArguments, objectHash, hash } = require("./ota-candidate.cjs");
const { projectId, nativeSnapshot, readBaselines } = require("./ota-native.cjs");
const { sentryDsn } = require("./release-environment.cjs");

const environment = {
  EXPO_PUBLIC_CONVEX_URL: "https://calm-dachshund-294.convex.cloud",
  EXPO_PUBLIC_DASHBOARD_URL: "https://studio.opus.mk",
  EXPO_PUBLIC_SENTRY_DSN: sentryDsn,
  SENTRY_AUTH_TOKEN: "test-private-token-never-bundled",
  SENTRY_ORG: "borko-petrevski", SENTRY_PROJECT: "opus-mobile",
};
function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "opus-ota-candidate-test-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const output = path.join(directory, "export");
  fs.mkdirSync(output);
  const values = releaseEnvironment(environment);
  const metadata = { version: 0, bundler: "metro", fileMetadata: { ios: { bundle: "app.hbc", assets: [] } } };
  fs.writeFileSync(path.join(output, "metadata.json"), JSON.stringify(metadata));
  fs.writeFileSync(path.join(output, "app.hbc"), Buffer.concat([Buffer.from("c61fbc03c103191f", "hex"), Buffer.from(Object.values(values).join("\n"))]));
  fs.writeFileSync(path.join(output, "app.hbc.map"), JSON.stringify({ version: 3, mappings: "AAAA", debugId: "fixed-test-debug-id" }));
  const snapshot = nativeSnapshot();
  const config = { version: snapshot.appVersion };
  fs.writeFileSync(path.join(directory, "public-config.json"), JSON.stringify(config));
  const receipt = { schemaVersion: 1, projectId, profile: "production", platform: "ios", environment: "production", easCliVersion: "27.4.1", runtimeVersion: snapshot.appVersion,
    nativeSignature: snapshot.nativeSignature, nativeBuildId: readBaselines().runtimes[snapshot.appVersion].builds["production:ios"].id,
    publicEnvironmentHash: objectHash(values), publicConfigHash: objectHash(config), files: fileInventory(output) };
  const receiptFile = path.join(directory, "receipt.json");
  fs.writeFileSync(receiptFile, JSON.stringify(receipt));
  return { directory, output, receipt, receiptFile, receiptHash: hash(fs.readFileSync(receiptFile)), metadata, values };
}

test("preserved OTA publication requires explicit identity and never invokes the bundler or changes channels implicitly", () => {
  const options = candidateOptions(["publish", "--candidate", "/tmp/selected-candidate", "--message", "Fix 'trial'; $(ignored)", "--receipt-sha256", "a".repeat(64)]);
  const args = publishArguments(options);
  assert.deepEqual(args.slice(0, 9), ["update", "--channel", "production", "--environment", "production", "--platform", "ios", "--input-dir", "/tmp/selected-candidate/export"]);
  assert.ok(args.includes("--skip-bundler"));
  assert.equal(args[args.indexOf("--message") + 1], "Fix 'trial'; $(ignored)");
  assert.equal(args[args.indexOf("--rollout-percentage") + 1], "10");
  for (const bad of [
    ["publish", "--candidate", "/tmp/test", "--message", "Release"],
    ["prepare", "--candidate", "/tmp/test", "--platform", "all"],
    ["prepare", "--candidate", "/tmp/test", "--force-end-active-rollout"],
    ["prepare", "--candidate", "/tmp/test", "--candidate", "/tmp/other"],
  ]) assert.throws(() => candidateOptions(bad));
});

test("export validates the production environment, rejects unexpected public values and removes upload credentials", () => {
  const values = releaseEnvironment(environment);
  assert.equal(Object.keys(values).length, 3);
  assert.throws(() => releaseEnvironment({ ...environment, EXPO_PUBLIC_API_TOKEN: "secret" }), /Unexpected public/);
  assert.throws(() => releaseEnvironment({ ...environment, EXPO_PUBLIC_CONVEX_URL: "https://other.convex.cloud" }), /release configuration/);
  const exported = exportEnvironment({ ...environment, EXPO_TOKEN: "private-expo-token", EAS_BUILD: "true" });
  assert.equal(exported.SENTRY_AUTH_TOKEN, undefined);
  assert.equal(exported.EXPO_TOKEN, undefined);
  assert.equal(exported.EAS_BUILD, undefined);
  assert.equal(exported.EXPO_NO_DOTENV, "1");
  assert.equal(exported.SENTRY_DISABLE_AUTO_UPLOAD, "true");
  assert.equal(exported.APP_ENV, "production");
});

test("candidate verification rejects changed, added and missing exported bytes before publication", (t) => {
  const f = fixture(t);
  verifyCandidate(f.directory, f.receiptHash);
  const bundlePath = path.join(f.output, "app.hbc");
  const bundle = fs.readFileSync(bundlePath);
  fs.appendFileSync(bundlePath, "tamper");
  assert.throws(() => verifyCandidate(f.directory, f.receiptHash), /export integrity/);
  fs.writeFileSync(bundlePath, bundle);
  fs.writeFileSync(path.join(f.output, "unexpected.js"), "extra");
  assert.throws(() => verifyCandidate(f.directory, f.receiptHash), /export integrity/);
  fs.unlinkSync(path.join(f.output, "unexpected.js"));
  fs.unlinkSync(bundlePath);
  assert.throws(() => verifyCandidate(f.directory, f.receiptHash), /export integrity/);
});

test("receipt, public config, environment and native runtime drift are refused", (t) => {
  const f = fixture(t);
  assert.throws(() => verifyCandidate(f.directory, "b".repeat(64)), /receipt integrity/);
  fs.writeFileSync(path.join(f.directory, "public-config.json"), JSON.stringify({ version: "wrong" }));
  assert.throws(() => verifyCandidate(f.directory, f.receiptHash), /configuration integrity/);
  fs.writeFileSync(path.join(f.directory, "public-config.json"), JSON.stringify({ version: f.receipt.runtimeVersion }));
  f.receipt.publicEnvironmentHash = "different";
  fs.writeFileSync(f.receiptFile, JSON.stringify(f.receipt));
  assert.throws(() => verifyCandidate(f.directory, undefined, environment), /environment\/configuration changed/);
  f.receipt.nativeSignature = "different";
  fs.writeFileSync(f.receiptFile, JSON.stringify(f.receipt));
  assert.throws(() => verifyCandidate(f.directory), /native store binary/);
});

test("export inspection requires iOS metadata, safe asset paths, matching maps and no private credentials", (t) => {
  const f = fixture(t);
  inspectExport(f.output, f.values, [environment.SENTRY_AUTH_TOKEN]);
  f.metadata.fileMetadata.ios.assets.push({ path: "../receipt.json" });
  fs.writeFileSync(path.join(f.output, "metadata.json"), JSON.stringify(f.metadata));
  assert.throws(() => inspectExport(f.output, f.values), /unsafe path/);
  f.metadata.fileMetadata.ios.assets = [];
  f.metadata.fileMetadata.android = f.metadata.fileMetadata.ios;
  fs.writeFileSync(path.join(f.output, "metadata.json"), JSON.stringify(f.metadata));
  assert.throws(() => inspectExport(f.output, f.values), /exactly one production iOS/);
  delete f.metadata.fileMetadata.android;
  fs.writeFileSync(path.join(f.output, "metadata.json"), JSON.stringify(f.metadata));
  fs.appendFileSync(path.join(f.output, "app.hbc"), environment.SENTRY_AUTH_TOKEN);
  assert.throws(() => inspectExport(f.output, f.values, [environment.SENTRY_AUTH_TOKEN]), /Private release credential/);
  fs.writeFileSync(path.join(f.output, "app.hbc.map"), JSON.stringify({ version: 3, mappings: "AAAA" }));
  assert.throws(() => inspectExport(f.output, f.values), /Sentry-enabled source map/);
});

test("candidate symlinks cannot redirect verification or uploads to unrelated files", (t) => {
  const f = fixture(t);
  fs.symlinkSync(f.receiptFile, path.join(f.output, "leaked-file"));
  assert.throws(() => fileInventory(f.output), /symlink/);
  assert.throws(() => verifyCandidate(f.directory), /symlink/);
});
