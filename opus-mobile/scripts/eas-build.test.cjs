const { test } = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { buildPlan, bootstrapEnvironment } = require("./eas-build.cjs");

test("loads the matching EAS environment before the release build resolves its profile", () => {
  const production = buildPlan([]);
  assert.equal(production.environment, "production");
  assert.deepEqual(production.args, ["build", "--profile", "production", "--platform", "ios", "--no-wait"]);
  for (const profile of ["preview", "simulator"])
    assert.equal(buildPlan(["--profile", profile]).environment, "preview");
});
test("bootstrap cannot inherit local public endpoints or preemptively activate release validation", () => {
  const env = bootstrapEnvironment({ APP_ENV: "production", EXPO_PUBLIC_NATIVE_DASHBOARD_URL: "http://192.168.0.200:3000", EXPO_PUBLIC_CONVEX_URL: "http://localhost:3210", PATH: "/usr/bin" });
  assert.equal(env.APP_ENV, undefined);
  assert.equal(env.EXPO_PUBLIC_NATIVE_DASHBOARD_URL, undefined);
  assert.equal(env.EXPO_PUBLIC_CONVEX_URL, undefined);
  assert.equal(env.EXPO_NO_DOTENV, "1");
  assert.equal(env.EXPO_NO_KEYCHAIN, "1");
  assert.equal(env.PATH, "/usr/bin");
});
test("passes metadata literally and refuses invalid build targets and unexpected mutation flags", () => {
  const message = "Calendar fix'; touch /tmp/not-executed; echo '";
  const plan = buildPlan(["--message", message, "--non-interactive"]);
  assert.equal(plan.args[plan.args.indexOf("--message") + 1], message);
  assert.ok(plan.command.includes("'\\''"));
  for (const args of [["--profile", "unknown"], ["--platform", "web"], ["--profile", "simulator", "--platform", "all"], ["--wait", "--no-wait"], ["--auto-submit"], ["--profile"]])
    assert.throws(() => buildPlan(args));
});

test("EAS env:exec quote stripping preserves executable and each literal build argument", (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "opus-build-argv-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  // Substitute a local argv recorder for npx: this never invokes EAS or a build.
  fs.writeFileSync(path.join(directory, "npx"), `#!${process.execPath}\nprocess.stdout.write(JSON.stringify(process.argv.slice(2)));\n`, { mode: 0o755 });
  const message = "Calendar fix'; touch should-not-exist; echo '\n`false` $(false) $HOME";
  for (const profile of ["production", "preview", "simulator"]) {
    const plan = buildPlan(["--profile", profile, "--message", message, "--non-interactive"]);
    // Mirrors EAS CLI 24.11.0 EnvExec.sanitizeFlagsAndArgs before shell:true.
    const first = plan.command[0], last = plan.command.at(-1);
    const clean = ((first === "'" && last === "'") || (first === '"' && last === '"'))
      ? plan.command.slice(1, -1) : plan.command;
    const result = spawnSync(clean, [], {
      shell: true, cwd: directory,
      env: { ...process.env, PATH: `${directory}${path.delimiter}${process.env.PATH}` },
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), ["eas-cli@latest", ...plan.args]);
    assert.equal(fs.existsSync(path.join(directory, "should-not-exist")), false);
  }
});
