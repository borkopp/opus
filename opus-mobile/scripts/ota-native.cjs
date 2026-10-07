const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const projectId = "634b3403-0012-42f0-9cc1-a5725f12f2cc";
const root = path.resolve(__dirname, "..");
const baselinePath = path.join(__dirname, "ota-runtime-baselines.json");
const digest = (value) => crypto.createHash("sha256").update(value).digest("hex");
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object")
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}
function nativeSnapshot(appRoot = root) {
  const read = (name) => JSON.parse(fs.readFileSync(path.join(appRoot, name), "utf8"));
  const expo = read("app.json").expo;
  if (expo.runtimeVersion?.policy !== "appVersion")
    throw new Error("OTA requires the appVersion runtime policy.");
  if (expo.extra?.eas?.projectId !== projectId || expo.updates?.url !== `https://u.expo.dev/${projectId}`)
    throw new Error("OTA configuration must target the existing OPUS Expo project.");
  const nativeConfig = structuredClone(expo);
  delete nativeConfig.version;
  if (nativeConfig.ios) delete nativeConfig.ios.buildNumber;
  if (nativeConfig.android) delete nativeConfig.android.versionCode;
  // Build counters do not change appVersion runtime compatibility.
  const pkg = read("package.json");
  const lock = read("package-lock.json");
  const productionPackages = Object.fromEntries(Object.entries(lock.packages || {})
    .filter(([name, value]) => name && !value.dev));
  const inputs = {
    "app.json native config": digest(JSON.stringify(stable(nativeConfig))),
    "package.json dependencies": digest(JSON.stringify(stable({ dependencies: pkg.dependencies, overrides: pkg.overrides }))),
    "package-lock.json production graph": digest(JSON.stringify(stable(productionPackages))),
  };
  function addFile(relative) {
    const full = path.join(appRoot, relative);
    if (fs.existsSync(full)) inputs[relative] = digest(fs.readFileSync(full));
  }
  function addDirectory(relative) {
    const full = path.join(appRoot, relative);
    if (!fs.existsSync(full)) return;
    for (const item of fs.readdirSync(full, { withFileTypes: true })) {
      if (item.isSymbolicLink()) throw new Error(`Native input must not be a symlink: ${relative}/${item.name}`);
      const name = `${relative}/${item.name}`;
      if (item.isDirectory()) addDirectory(name);
      else addFile(name);
    }
  }
  addFile("app.config.js");
  addFile("app.config.ts");
  addDirectory("assets");
  addDirectory("plugins");
  for (const plugin of expo.plugins || []) {
    const name = Array.isArray(plugin) ? plugin[0] : plugin;
    if (typeof name === "string" && name.startsWith(".")) addFile(name);
  }
  return {
    appVersion: expo.version,
    nativeSignature: digest(JSON.stringify(stable(inputs))),
    inputs,
  };
}
function assertNativeCompatibility(snapshot, baselines, profile, platform) {
  const saved = baselines.runtimes[snapshot.appVersion];
  if (!saved)
    throw new Error(`Runtime ${snapshot.appVersion} has no baseline. Prepare and complete a new native build first.`);
  if (saved.nativeSignature !== snapshot.nativeSignature) {
    const changed = Object.keys({ ...saved.inputs, ...snapshot.inputs })
      .filter((key) => saved.inputs[key] !== snapshot.inputs[key]);
    throw new Error(`Native inputs changed for runtime ${snapshot.appVersion}: ${changed.join(", ")}. Bump expo.version and make a new native build before OTA.`);
  }
  for (const target of platform === "all" ? ["ios", "android"] : [platform]) {
    const receipt = saved.builds?.[`${profile}:${target}`];
    if (!receipt)
      throw new Error(`Runtime ${snapshot.appVersion} has no verified ${profile} ${target} build. Record a FINISHED matching EAS build first.`);
    if (profile === "preview-simulator" ? receipt.isForIosSimulator !== true : receipt.isForIosSimulator === true)
      throw new Error("The recorded simulator/device kind cannot qualify this OTA profile.");
  }
  return saved;
}
function readBaselines() {
  return JSON.parse(fs.readFileSync(baselinePath, "utf8"));
}
function writeBaselines(value) {
  fs.writeFileSync(baselinePath, JSON.stringify(value, null, 2) + "\n");
}
module.exports = { projectId, root, nativeSnapshot, assertNativeCompatibility, readBaselines, writeBaselines };
