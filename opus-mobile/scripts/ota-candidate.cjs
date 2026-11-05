const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");
const { bootstrapEnvironment } = require("./eas-build.cjs");
const { rolloutArguments } = require("./ota.cjs");
const { validateReleaseEnvironment, validateSourceMapEnvironment } = require("./release-environment.cjs");
const { projectId, root, nativeSnapshot, assertNativeCompatibility, readBaselines } = require("./ota-native.cjs");

const easVersion = "27.4.1";
const publicKeys = ["EXPO_PUBLIC_CONVEX_URL", "EXPO_PUBLIC_DASHBOARD_URL", "EXPO_PUBLIC_SENTRY_DSN"];
const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
const quote = (value) => "'" + value.replace(/'/g, "'\\''") + "'";
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  return value && typeof value === "object"
    ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]))
    : value;
}
const objectHash = (value) => hash(JSON.stringify(stable(value)));
function run(executable, args, env, capture = false) {
  const result = spawnSync(executable, args, { cwd: root, env, encoding: "utf8", maxBuffer: 16 * 1024 * 1024,
    stdio: capture ? ["ignore", "pipe", "inherit"] : "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${path.basename(executable)} failed (exit ${result.status}).`);
  return result.stdout;
}
function candidateOptions(argv) {
  const command = argv[0];
  if (!["prepare", "prepare-env", "verify", "publish", "publish-env"].includes(command))
    throw new Error("Use prepare, verify or publish with --candidate <new-directory>.");
  const options = { command, percent: "10" };
  const names = { "--candidate": "directory", "--message": "message", "--receipt-sha256": "receiptHash", "--rollout-percentage": "percent" };
  const seen = new Set();
  for (let index = 1; index < argv.length; index++) {
    const name = argv[index];
    if (!names[name] || seen.has(name)) throw new Error(`Unsupported or repeated option: ${name}`);
    seen.add(name);
    const value = argv[++index];
    if (!value || value.startsWith("--")) throw new Error(`${name} requires a value.`);
    options[names[name]] = value;
  }
  if (!options.directory) throw new Error("--candidate is required.");
  options.directory = path.resolve(options.directory);
  if (command.startsWith("publish")) {
    if (!options.message?.trim()) throw new Error("Publication requires an explicit --message.");
    if (!/^[a-f0-9]{64}$/.test(options.receiptHash || ""))
      throw new Error("Publication requires the prepared --receipt-sha256.");
  }
  rolloutArguments(options.percent);
  return options;
}
function releaseEnvironment(env) {
  validateReleaseEnvironment(env);
  validateSourceMapEnvironment(env);
  for (const name of Object.keys(env))
    if (name.startsWith("EXPO_PUBLIC_") && !publicKeys.includes(name))
      throw new Error(`Unexpected public release variable: ${name}. Review it before exporting.`);
  return Object.fromEntries(publicKeys.map((name) => [name, env[name]]));
}
function exportEnvironment(env) {
  const result = { ...env, APP_ENV: "production", NODE_ENV: "production", EXPO_NO_DOTENV: "1", SENTRY_DISABLE_AUTO_UPLOAD: "true" };
  // Local bundling never needs a provider credential or permission to upload.
  delete result.SENTRY_AUTH_TOKEN;
  delete result.EXPO_TOKEN;
  delete result.EAS_BUILD;
  return result;
}
function fileInventory(directory, prefix = "") {
  if (fs.lstatSync(directory).isSymbolicLink()) throw new Error("Candidate directories cannot be symlinks.");
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const relative = prefix + entry.name;
    const full = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Candidate contains a symlink: ${relative}`);
    if (entry.isDirectory()) files.push(...fileInventory(full, relative + "/"));
    else if (entry.isFile()) {
      const content = fs.readFileSync(full);
      files.push({ path: relative, bytes: content.length, sha256: hash(content) });
    } else throw new Error(`Unsupported candidate file: ${relative}`);
  }
  return files;
}
function sourceInventory() {
  return [
    ...fileInventory(path.join(root, "src"), "opus-mobile/src/"),
    ...fileInventory(path.join(root, "../shared"), "shared/"),
    ...["metro.config.js", "babel.config.js", "tsconfig.json", "package.json", "package-lock.json", "app.json", "app.config.js", "eas.json"].filter((name) => fs.existsSync(path.join(root, name))).map((name) => {
      const content = fs.readFileSync(path.join(root, name));
      return { path: "opus-mobile/" + name, bytes: content.length, sha256: hash(content) };
    }),
  ].sort((a, b) => a.path.localeCompare(b.path));
}
function insideFile(directory, relative) {
  if (typeof relative !== "string" || relative.includes("\\") || path.posix.isAbsolute(relative) || relative.split("/").some((part) => !part || part === "." || part === ".."))
    throw new Error("Export metadata contains an unsafe path.");
  const full = path.join(directory, relative);
  if (!fs.statSync(full).isFile()) throw new Error("Export metadata must reference a file.");
  return full;
}
function inspectExport(directory, environment, secrets = []) {
  const files = fileInventory(directory);
  const metadata = JSON.parse(fs.readFileSync(path.join(directory, "metadata.json"), "utf8"));
  if (metadata.version !== 0 || metadata.bundler !== "metro" || Object.keys(metadata.fileMetadata || {}).join(",") !== "ios")
    throw new Error("Candidate must contain exactly one production iOS export.");
  const ios = metadata.fileMetadata.ios;
  const bundle = fs.readFileSync(insideFile(directory, ios.bundle));
  const map = JSON.parse(fs.readFileSync(insideFile(directory, ios.bundle + ".map"), "utf8"));
  if (bundle.subarray(0, 8).toString("hex") !== "c61fbc03c103191f" || !map.mappings || !(map.debugId || map.debug_id))
    throw new Error("Candidate requires a Hermes bundle and its Sentry-enabled source map.");
  for (const value of Object.values(environment))
    if (!bundle.includes(Buffer.from(value))) throw new Error("Export does not contain its validated production configuration.");
  for (const asset of ios.assets) insideFile(directory, asset.path);
  for (const file of files) {
    const content = fs.readFileSync(path.join(directory, file.path));
    if (secrets.filter(Boolean).some((secret) => content.includes(Buffer.from(secret))))
      throw new Error("Private release credential found in export; candidate cannot be used.");
  }
  return { files, bundle: ios.bundle, sourceMap: ios.bundle + ".map", debugId: map.debugId || map.debug_id };
}
function publicConfig(env) {
  const config = JSON.parse(run(path.join(root, "node_modules/.bin/expo"), ["config", "--type", "public", "--json"], exportEnvironment(env), true));
  delete config._internal;
  const snapshot = nativeSnapshot();
  if (config.version !== snapshot.appVersion || config.runtimeVersion?.policy !== "appVersion" || config.extra?.nativeRuntimeSignature !== snapshot.nativeSignature || config.extra?.eas?.projectId !== projectId || config.extra?.environment !== "production" || config.updates?.url !== `https://u.expo.dev/${projectId}`)
    throw new Error("Resolved Expo configuration differs from the verified production native runtime.");
  return config;
}
function verifyCandidate(directory, expectedHash, env) {
  const bytes = fs.readFileSync(path.join(directory, "receipt.json"));
  if (expectedHash && hash(bytes) !== expectedHash) throw new Error("Candidate receipt integrity check failed.");
  const receipt = JSON.parse(bytes);
  if (receipt.schemaVersion !== 1 || receipt.projectId !== projectId || receipt.profile !== "production" || receipt.platform !== "ios" || receipt.environment !== "production" || receipt.easCliVersion !== easVersion)
    throw new Error("Candidate target does not match production iOS.");
  const snapshot = nativeSnapshot();
  const baseline = assertNativeCompatibility(snapshot, readBaselines(), "production", "ios");
  if (receipt.runtimeVersion !== snapshot.appVersion || receipt.nativeSignature !== snapshot.nativeSignature || receipt.nativeBuildId !== baseline.builds["production:ios"].id)
    throw new Error("Candidate no longer matches the verified native store binary.");
  const files = fileInventory(path.join(directory, "export"));
  if (objectHash(files) !== objectHash(receipt.files)) throw new Error("Candidate export integrity check failed.");
  const config = JSON.parse(fs.readFileSync(path.join(directory, "public-config.json"), "utf8"));
  if (objectHash(config) !== receipt.publicConfigHash) throw new Error("Candidate configuration integrity check failed.");
  if (env) {
    const publicValues = releaseEnvironment(env);
    if (objectHash(publicValues) !== receipt.publicEnvironmentHash || objectHash(publicConfig(env)) !== receipt.publicConfigHash)
      throw new Error("Production environment/configuration changed after preparation. Prepare and review a new candidate.");
    inspectExport(path.join(directory, "export"), publicValues, [env.SENTRY_AUTH_TOKEN, env.EXPO_TOKEN]);
  }
  return { receipt, receiptHash: hash(bytes) };
}
function publishArguments(options) {
  return ["update", "--channel", "production", "--environment", "production", "--platform", "ios", "--input-dir", path.join(options.directory, "export"), "--skip-bundler", "--message", options.message, ...rolloutArguments(options.percent), "--non-interactive", "--json"];
}
function main(argv = process.argv.slice(2)) {
  const options = candidateOptions(argv);
  const { command, directory } = options;
  const snapshot = nativeSnapshot();
  const baseline = assertNativeCompatibility(snapshot, readBaselines(), "production", "ios");
  if (command === "verify") {
    const result = verifyCandidate(directory, options.receiptHash);
    console.log(`Verified production iOS ${result.receipt.runtimeVersion}: ${result.receiptHash}`);
    return;
  }
  if (command === "prepare" || command === "publish") {
    if (command === "prepare" && fs.existsSync(directory)) throw new Error("Choose a new candidate directory; existing candidates are never overwritten.");
    if (command === "publish") verifyCandidate(directory, options.receiptHash);
    const args = ["node", "scripts/ota-candidate.cjs", command + "-env", "--candidate", directory];
    if (command === "publish") args.push("--message", options.message, "--receipt-sha256", options.receiptHash, "--rollout-percentage", options.percent);
    const env = bootstrapEnvironment(process.env);
    for (const key of ["SENTRY_AUTH_TOKEN", "SENTRY_ORG", "SENTRY_PROJECT", "SENTRY_URL", "EAS_PROJECT_ID", "EAS_BUILD"]) delete env[key];
    const nested = args.map((value) => /^[A-Za-z0-9@._/-]+$/.test(value) ? value : quote(value)).join(" ");
    run("npx", [`eas-cli@${easVersion}`, "env:exec", "production", nested, "--non-interactive"], env);
    return;
  }
  const publicValues = releaseEnvironment(process.env);
  if (command === "prepare-env") {
    if (fs.existsSync(directory)) throw new Error("Choose a new candidate directory; existing candidates are never overwritten.");
    const sources = sourceInventory();
    const config = publicConfig(process.env);
    fs.mkdirSync(directory, { recursive: true });
    run(path.join(root, "node_modules/.bin/expo"), ["export", "--platform", "ios", "--output-dir", path.join(directory, "export"), "--source-maps", "--dump-assetmap", "--clear"], exportEnvironment(process.env));
    const exported = inspectExport(path.join(directory, "export"), publicValues, [process.env.SENTRY_AUTH_TOKEN, process.env.EXPO_TOKEN]);
    if (objectHash(sources) !== objectHash(sourceInventory())) throw new Error("Source changed during export. Prepare a new candidate after edits finish.");
    const receipt = { schemaVersion: 1, preparedAt: new Date().toISOString(), projectId, profile: "production", platform: "ios", environment: "production", runtimeVersion: snapshot.appVersion, nativeSignature: snapshot.nativeSignature,
      nativeBuildId: baseline.builds["production:ios"].id, easCliVersion: easVersion,
      gitCommit: run("git", ["rev-parse", "HEAD"], process.env, true).trim(),
      sourceWorkingTreeStatus: run("git", ["status", "--porcelain", "--", "src", "../shared", "package.json", "package-lock.json", "app.json", "app.config.js", "metro.config.js", "babel.config.js", "tsconfig.json", "eas.json"], process.env, true).trim(),
      sourceHash: objectHash(sources), sources, publicEnvironmentHash: objectHash(publicValues), publicConfigHash: objectHash(config), ...exported,
      published: false, sourceMapsUploaded: false };
    fs.writeFileSync(path.join(directory, "public-config.json"), JSON.stringify(config, null, 2) + "\n");
    fs.writeFileSync(path.join(directory, "receipt.json"), JSON.stringify(receipt, null, 2) + "\n");
    const verified = verifyCandidate(directory);
    console.log(`Prepared only; no update or source maps uploaded. Candidate: ${directory}\nReceipt SHA-256: ${verified.receiptHash}`);
    return;
  }
  verifyCandidate(directory, options.receiptHash, process.env);
  const attempt = path.join(directory, "publication-attempt.json");
  fs.writeFileSync(attempt, JSON.stringify({ attemptedAt: new Date().toISOString(), receiptHash: options.receiptHash, rolloutPercentage: Number(options.percent) }, null, 2) + "\n", { flag: "wx" });
  // Preserve this marker on failure: inspect EAS before any retry to avoid
  // publishing twice after a successful remote request with a lost response.
  const output = run("npx", [`eas-cli@${easVersion}`, ...publishArguments(options)], { ...process.env, APP_ENV: "production", EXPO_NO_DOTENV: "1" }, true);
  fs.writeFileSync(path.join(directory, "publication-result.json"), output);
  const mapsDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "opus-ota-maps-"));
  try {
    // Sentry normalizes source-map JSON in place; leave the reviewed export intact.
    fs.cpSync(path.join(directory, "export"), mapsDirectory, { recursive: true });
    run(path.join(root, "node_modules/.bin/sentry-expo-upload-sourcemaps"), [mapsDirectory], { ...process.env, APP_ENV: "production", EXPO_NO_DOTENV: "1" });
    fs.writeFileSync(path.join(directory, "source-maps-uploaded.json"), JSON.stringify({ receiptHash: options.receiptHash, uploadedAt: new Date().toISOString() }) + "\n");
  } catch (error) {
    throw new Error(`OTA publication returned successfully, but source-map upload needs repair for this exact candidate: ${error.message}`);
  } finally { fs.rmSync(mapsDirectory, { recursive: true, force: true }); }
  verifyCandidate(directory, options.receiptHash);
  console.log(`Published the preserved candidate. Inspect ${path.join(directory, "publication-result.json")} and verify adoption before advancing rollout.`);
}
if (require.main === module) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { candidateOptions, exportEnvironment, fileInventory, insideFile, inspectExport, releaseEnvironment, verifyCandidate, publishArguments, objectHash, hash };
