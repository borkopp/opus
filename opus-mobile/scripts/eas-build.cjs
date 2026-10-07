const { spawnSync } = require("node:child_process");
const path = require("node:path");

function buildPlan(argv) {
  const values = { profile: "production", platform: "ios" };
  const flags = new Set();
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (["--profile", "--platform", "--message"].includes(arg)) {
      const value = argv[++index];
      if (!value || value.startsWith("--")) throw new Error(`${arg} requires a value.`);
      values[arg.slice(2)] = value;
    } else if (["--wait", "--no-wait", "--non-interactive", "--clear-cache", "--freeze-credentials"].includes(arg)) {
      flags.add(arg);
    } else throw new Error(`Unsupported build option: ${arg}`);
  }
  if (!["production", "preview", "simulator"].includes(values.profile))
    throw new Error("Use production, preview or simulator for a release environment build.");
  if (!["ios", "android", "all"].includes(values.platform))
    throw new Error("Build platform must be ios, android or all.");
  if (values.profile === "simulator" && values.platform !== "ios")
    throw new Error("The simulator profile targets iOS only.");
  if (flags.has("--wait") && flags.has("--no-wait"))
    throw new Error("Choose either --wait or --no-wait.");
  const environment = values.profile === "production" ? "production" : "preview";
  const args = ["build", "--profile", values.profile, "--platform", values.platform];
  if (values.message) args.push("--message", values.message);
  if (!flags.has("--wait")) flags.add("--no-wait");
  args.push(...flags);
  const quote = (value) => "'" + value.replace(/'/g, "'\\''") + "'";
  return {
    environment,
    args,
    // EAS env:exec removes matching first/last quotes around its bash_command.
    // Leave the fixed executable prefix unquoted so it cannot mistake valid
    // per-argument quoting for a quote around the whole command.
    command: ["npx", "eas-cli@latest", ...args]
      .map((value) => /^[A-Za-z0-9@._/-]+$/.test(value) ? value : quote(value))
      .join(" "),
  };
}
function bootstrapEnvironment(inherited) {
  const env = { ...inherited, EXPO_NO_DOTENV: "1", EXPO_NO_KEYCHAIN: "1" };
  // The outer EAS lookup must resolve the app before profile variables are
  // merged. A release profile sets APP_ENV=production and then validates public
  // values, so load its EAS environment before invoking that build command.
  delete env.APP_ENV;
  for (const name of Object.keys(env))
    if (name.startsWith("EXPO_PUBLIC_")) delete env[name];
  return env;
}
if (require.main === module) {
  try {
    const plan = buildPlan(process.argv.slice(2));
    const result = spawnSync("npx", ["eas-cli@latest", "env:exec", plan.environment, plan.command], {
      cwd: path.resolve(__dirname, ".."),
      env: bootstrapEnvironment(process.env),
      stdio: "inherit",
    });
    if (result.error) throw result.error;
    process.exitCode = result.status ?? 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
module.exports = { buildPlan, bootstrapEnvironment };
