import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startEnvironment } from "./e2e-environment.mjs";

const projectDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
let environment;
try {
  environment = await startEnvironment();
  const buildProduction = process.argv.slice(2).includes("--build");
  const args = process.argv
    .slice(2)
    .filter((argument) => !["--build", "--hospitality"].includes(argument));
  const child = spawn(
    process.execPath,
    [
      path.join(projectDir, "node_modules", "@playwright", "test", "cli.js"),
      "test",
      ...args,
    ],
    {
      cwd: projectDir,
      env: {
        ...environment.env,
        // Select tests only. Both suites run the same self-service application.
        OPUS_E2E_SUITE: process.argv.includes("--hospitality")
          ? "hospitality"
          : "beauty",
      },
      detached: process.platform !== "win32",
      stdio: "inherit",
    },
  );
  environment.trackProcess(child);
  const code = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (status) => resolve(status ?? 1));
  });
  if (code === 0 && buildProduction) await environment.buildProduction();
  if (code !== 0)
    console.error(
      `[beauty-e2e] Sanitized infrastructure logs: ${await environment.collectLogs()}.`,
    );
  await environment.stop();
  process.exitCode = code;
} catch (error) {
  console.error(error.message);
  if (environment)
    console.error(
      `[beauty-e2e] Sanitized infrastructure logs: ${await environment.collectLogs()}.`,
    );
  await environment?.stop();
  process.exitCode = 1;
}
