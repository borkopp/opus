const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { validateReleaseEnvironment, validateSourceMapEnvironment } = require("./release-environment.cjs");
const { projectId, root, nativeSnapshot, assertNativeCompatibility, readBaselines, writeBaselines } = require("./ota-native.cjs");

function runEas(args, env = process.env, capture = false) {
  const result = spawnSync("npx", ["eas-cli@latest", ...args], {
    cwd: root,
    env: { ...env, EXPO_NO_DOTENV: "1" },
    stdio: capture ? ["ignore", "pipe", "inherit"] : "inherit",
    encoding: "utf8",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`EAS command failed (exit ${result.status}).`);
  return result.stdout;
}
function option(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index < 0) return fallback;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value.`);
  return value;
}
const quote = (value) => "'" + value.replace(/'/g, "'\\''") + "'";
function rolloutArguments(value) {
  if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 100)
    throw new Error("Rollout percentage must be an integer from 1 to 100.");
  // Omitting the flag is a full deployment. Explicit 100 currently reaches
  // the partial-rollout API and is rejected (its upper bound is 99).
  return Number(value) === 100 ? [] : ["--rollout-percentage", value];
}
function main() {
  const command = process.argv[2];
  const profile = option("--profile", "production");
  if (!["production", "preview", "preview-simulator"].includes(profile))
    throw new Error("OTA profile must be production, preview or preview-simulator.");
  const channel = profile === "preview-simulator" ? "preview" : profile;
  const platform = option("--platform", "ios");
  if (!["ios", "android", "all"].includes(platform)) throw new Error("OTA platform must be ios, android or all.");
  if (profile === "preview-simulator" && platform !== "ios")
    throw new Error("The preview-simulator baseline targets iOS only.");
  const snapshot = nativeSnapshot();
  const baselines = readBaselines();
  if (command === "prepare-build") {
    const saved = baselines.runtimes[snapshot.appVersion];
    if (saved && saved.nativeSignature !== snapshot.nativeSignature && Object.keys(saved.builds || {}).length)
      throw new Error("Native inputs changed after a recorded build. Bump expo.version before preparing another runtime.");
    baselines.runtimes[snapshot.appVersion] = { ...snapshot, builds: saved?.nativeSignature === snapshot.nativeSignature ? saved.builds : {} };
    writeBaselines(baselines);
    console.log(`Prepared native baseline ${snapshot.appVersion}: ${snapshot.nativeSignature}. Build the ${profile} profile now; do not change native inputs before recording it.`);
    return;
  }
  if (command === "record-build") {
    const id = option("--build-id");
    if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(id || ""))
      throw new Error("--build-id must be the UUID of a FINISHED EAS build.");
    const saved = baselines.runtimes[snapshot.appVersion];
    if (!saved || saved.nativeSignature !== snapshot.nativeSignature)
      throw new Error("Native baseline is missing or changed since build preparation.");
    const build = JSON.parse(runEas(["build:view", id, "--json"], process.env, true));
    const target = build.platform?.toLowerCase();
    const expectedProfile = profile === "preview-simulator" ? "simulator" : profile;
    const expectedSimulator = profile === "preview-simulator";
    if (build.status !== "FINISHED" || build.app?.id !== projectId || build.appVersion !== snapshot.appVersion || build.appIdentifier !== "mk.opus.studio" || build.buildProfile !== expectedProfile || !!build.isForIosSimulator !== expectedSimulator || !["ios", "android"].includes(target) || (expectedSimulator && target !== "ios") || (profile === "production" && build.distribution !== "STORE"))
      throw new Error("EAS build must be FINISHED and match this app version/project/bundle/profile/device kind. Production requires a store binary.");
    if (build.runtimeVersion && build.runtimeVersion !== snapshot.appVersion)
      throw new Error("EAS build runtime does not match the appVersion baseline.");
    const appConfigPath = option("--app-config-path");
    if (!appConfigPath)
      throw new Error("--app-config-path must point to the Expo Constants app.config extracted from this completed build's signed artifact.");
    const client = JSON.parse(fs.readFileSync(path.resolve(appConfigPath), "utf8"));
    if (client.version !== snapshot.appVersion || client.runtimeVersion?.policy !== "appVersion" || client.extra?.nativeRuntimeSignature !== snapshot.nativeSignature || client.extra?.eas?.projectId !== projectId)
      throw new Error("The artifact's embedded app version, runtime policy, project or native source signature does not match this baseline.");
    if (target === "ios") {
      const appPath = path.dirname(path.dirname(path.resolve(appConfigPath)));
      const plist = spawnSync("plutil", ["-convert", "json", "-o", "-", path.join(appPath, "Expo.plist")], { encoding: "utf8" });
      if (plist.status !== 0) throw new Error("Cannot inspect the signed iOS artifact's Expo.plist.");
      const updates = JSON.parse(plist.stdout);
      if (updates.EXUpdatesRuntimeVersion !== snapshot.appVersion || updates.EXUpdatesURL !== `https://u.expo.dev/${projectId}` || updates.EXUpdatesRequestHeaders?.["expo-channel-name"] !== channel)
        throw new Error("The signed iOS artifact's OTA runtime, URL or channel does not match this profile.");
    }
    saved.builds ||= {};
    saved.builds[`${profile}:${target}`] = { id: build.id, completedAt: build.completedAt, appBuildVersion: build.appBuildVersion, isForIosSimulator: expectedSimulator };
    writeBaselines(baselines);
    console.log(`Recorded ${profile} ${target} build ${id} for runtime ${snapshot.appVersion}.`);
    return;
  }
  if (command === "check") {
    assertNativeCompatibility(snapshot, baselines, profile, platform);
    console.log(`OTA native compatibility passed: ${snapshot.appVersion}, ${profile}, ${platform}.`);
    return;
  }
  if (command === "publish") {
    assertNativeCompatibility(snapshot, baselines, profile, platform);
    const message = option("--message");
    if (!message?.trim()) throw new Error("An OTA release --message is required.");
    const percent = option("--rollout-percentage", profile === "production" ? "10" : "100");
    rolloutArguments(percent);
    // Fetch this profile's EAS environment, never local dotenv. The nested command
    // validates the fetched public release values before exporting or uploading.
    runEas(["env:exec", channel,
      `node scripts/ota.cjs publish-env --profile ${profile} --platform ${platform} --message ${quote(message)} --rollout-percentage ${percent}`,
      "--non-interactive"]);
    return;
  }
  if (command === "publish-env") {
    assertNativeCompatibility(snapshot, baselines, profile, platform);
    validateReleaseEnvironment(process.env);
    // Fail before publishing if this release cannot upload its matching maps.
    validateSourceMapEnvironment(process.env);
    const message = option("--message");
    if (!message?.trim()) throw new Error("An OTA release --message is required.");
    const percent = option("--rollout-percentage", profile === "production" ? "10" : "100");
    runEas(["update", "--channel", channel, "--environment", channel, "--platform", platform,
      "--message", message, ...rolloutArguments(percent), "--non-interactive"], { ...process.env, APP_ENV: "production" });
    const maps = spawnSync(path.join(root, "node_modules", ".bin", "sentry-expo-upload-sourcemaps"), ["dist"], {
      cwd: root,
      env: { ...process.env, EXPO_NO_DOTENV: "1" },
      stdio: "inherit",
    });
    if (maps.error) throw maps.error;
    if (maps.status !== 0)
      throw new Error("OTA was published, but Sentry source-map upload failed. Repair the maps for this exact dist before advancing the rollout.");
    return;
  }
  throw new Error("Use prepare-build, record-build, check or publish.");
}
if (require.main === module) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { rolloutArguments };
