import { spawn, execFile } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { constants, createWriteStream } from "node:fs";
import {
  access,
  chmod,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { createServer } from "node:http";
import { createServer as createTcpServer } from "node:net";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const appRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const require = createRequire(path.join(appRoot, "package.json"));
export const BACKEND_VERSION = "precompiled-2026-10-06-a3538c6";

// Provider credentials, deployment selectors, NODE_OPTIONS and local .env files
// are deliberately not inherited by the disposable application.
export function isolatedProcessEnv(source = process.env) {
  const keys = [
    "PATH",
    "HOME",
    "USERPROFILE",
    "LOCALAPPDATA",
    "SystemRoot",
    "WINDIR",
    "TMPDIR",
    "TMP",
    "TEMP",
    "LANG",
    "LC_ALL",
    "NODE_EXTRA_CA_CERTS",
    "XDG_CACHE_HOME",
    "PLAYWRIGHT_BROWSERS_PATH",
    "PLAYWRIGHT_CHANNEL",
  ];
  return Object.fromEntries(
    keys.filter((key) => source[key]).map((key) => [key, source[key]]),
  );
}

function assertLoopbackUrl(value) {
  const url = new URL(value);
  if (
    url.protocol !== "http:" ||
    !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)
  ) {
    throw new Error(
      `E2E infrastructure refuses a non-loopback URL: ${url.origin}`,
    );
  }
  return url;
}

export function replaceResendEndpoint(source, mailboxUrl) {
  assertLoopbackUrl(mailboxUrl);
  const original = '"https://api.resend.com/emails"';
  if (source.split(original).length !== 2) {
    throw new Error(
      "Expected exactly one Resend endpoint in the copied email provider.",
    );
  }
  return source.replace(original, JSON.stringify(`${mailboxUrl}/emails`));
}

export function redactInfrastructureLog(value, secrets) {
  let result = value;
  for (const secret of secrets) {
    if (secret) result = result.replaceAll(secret, "[REDACTED]");
  }
  return result.replace(
    /\b(Bearer|Convex)\s+[A-Za-z0-9_.|:-]{16,}/g,
    "$1 [REDACTED]",
  );
}

export async function createMailbox() {
  const token = randomBytes(32).toString("hex");
  const messages = [];
  const idempotency = new Map();
  const server = createServer(async (request, response) => {
    const reply = (status, body) => {
      response.writeHead(status, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      });
      response.end(JSON.stringify(body));
    };
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    if (request.method === "GET" && url.pathname === "/health")
      return reply(200, { ok: true });
    if (request.headers.authorization !== `Bearer ${token}`)
      return reply(401, { error: "Unauthorized" });
    if (request.method === "GET" && url.pathname === "/messages") {
      const to = url.searchParams.get("to")?.toLowerCase();
      const after = Number(url.searchParams.get("after") ?? 0);
      return reply(200, {
        messages: messages.filter(
          (message) =>
            message.receivedAt >= after &&
            (!to ||
              message.to.some((recipient) => recipient.toLowerCase() === to)),
        ),
      });
    }
    if (request.method !== "POST" || url.pathname !== "/emails")
      return reply(404, { error: "Not found" });
    try {
      const chunks = [];
      let size = 0;
      for await (const chunk of request) {
        size += chunk.length;
        if (size > 2_000_000) return reply(413, { error: "Message too large" });
        chunks.push(chunk);
      }
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      if (
        !Array.isArray(body.to) ||
        !body.to.every((recipient) => typeof recipient === "string") ||
        typeof body.subject !== "string"
      ) {
        return reply(400, { error: "Invalid email payload" });
      }
      const key = request.headers["idempotency-key"];
      if (key && idempotency.has(key))
        return reply(200, { id: idempotency.get(key) });
      const id = `e2e-mail-${randomUUID()}`;
      messages.push({ ...body, id, receivedAt: Date.now() });
      if (key) idempotency.set(key, id);
      return reply(200, { id });
    } catch {
      return reply(400, { error: "Invalid email payload" });
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const url = `http://127.0.0.1:${server.address().port}`;
  return {
    url,
    token,
    close: () =>
      new Promise((resolve) => {
        server.closeAllConnections();
        server.close(resolve);
      }),
  };
}

async function availablePort(host = "127.0.0.1") {
  const server = createTcpServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, host, resolve);
  });
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function backendBinary(tempRoot) {
  if (process.env.OPUS_E2E_CONVEX_BINARY) {
    const binary = path.resolve(process.env.OPUS_E2E_CONVEX_BINARY);
    await access(binary);
    return binary;
  }
  const filename =
    process.platform === "win32"
      ? "convex-local-backend.exe"
      : "convex-local-backend";
  const cacheRoot =
    process.platform === "win32"
      ? path.join(
          process.env.LOCALAPPDATA ||
            path.join(os.homedir(), "AppData", "Local"),
          "convex",
        )
      : path.join(os.homedir(), ".cache", "convex");
  const cached = path.join(cacheRoot, "binaries", BACKEND_VERSION, filename);
  try {
    await access(cached);
    return cached;
  } catch {
    /* Download only the pinned official binary. */
  }
  const triples = {
    "darwin-arm64": "aarch64-apple-darwin",
    "darwin-x64": "x86_64-apple-darwin",
    "linux-arm64": "aarch64-unknown-linux-gnu",
    "linux-x64": "x86_64-unknown-linux-gnu",
    "win32-x64": "x86_64-pc-windows-msvc",
  };
  const triple = triples[`${process.platform}-${process.arch}`];
  if (!triple)
    throw new Error(
      `Unsupported Convex E2E platform: ${process.platform}-${process.arch}`,
    );
  console.info(
    `[beauty-e2e] Downloading official Convex backend ${BACKEND_VERSION}.`,
  );
  const response = await fetch(
    `https://github.com/get-convex/convex-backend/releases/download/${BACKEND_VERSION}/convex-local-backend-${triple}.zip`,
    { signal: AbortSignal.timeout(60_000) },
  );
  if (!response.ok)
    throw new Error(
      `Convex backend download failed (${response.status}). Set OPUS_E2E_CONVEX_BINARY to an existing local binary.`,
    );
  const binary = path.join(tempRoot, filename);
  await writeFile(
    binary,
    backendExecutableFromZip(
      Buffer.from(await response.arrayBuffer()),
      filename,
    ),
    { mode: 0o755 },
  );
  await chmod(binary, 0o755);
  return binary;
}

export function backendExecutableFromZip(archive, filename) {
  const AdmZip = require("adm-zip");
  const entry = new AdmZip(archive).getEntry(filename);
  if (!entry)
    throw new Error(
      "Official Convex download did not contain the expected executable.",
    );
  // Do not extract the archive tree: only the exact executable entry is used.
  return entry.getData();
}

async function copyApplication(tempRoot, mailboxUrl) {
  const projectDir = path.join(tempRoot, "opus-dashboard");
  await mkdir(projectDir);
  const entries = [
    "app",
    "components",
    "convex",
    "hooks",
    "lib",
    "public",
    "types",
    "next.config.ts",
    "next-env.d.ts",
    "postcss.config.mjs",
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "proxy.ts",
    "components.json",
    "eslint.config.mjs",
    "instrumentation-client.ts",
  ];
  for (const entry of entries) {
    const source = path.join(appRoot, entry);
    try {
      await access(source);
    } catch {
      continue;
    }
    await cp(source, path.join(projectDir, entry), { recursive: true });
  }
  await cp(path.join(appRoot, "..", "shared"), path.join(tempRoot, "shared"), {
    recursive: true,
  });
  // Standalone tracing must resolve dependencies inside this copied monorepo.
  // A symlink to the checkout escapes outputFileTracingRoot during packaging.
  // Clone file data where the filesystem supports it; Node falls back to copies.
  console.info(
    "[beauty-e2e] Copying installed dependencies into the disposable application.",
  );
  await cp(
    path.join(appRoot, "node_modules"),
    path.join(projectDir, "node_modules"),
    {
      recursive: true,
      verbatimSymlinks: true,
      mode: constants.COPYFILE_FICLONE,
    },
  );
  const provider = path.join(projectDir, "convex", "lib", "emailDelivery.ts");
  await writeFile(
    provider,
    replaceResendEndpoint(await readFile(provider, "utf8"), mailboxUrl),
  );
  const fixtures = await readFile(
    path.join(appRoot, "tests", "e2e", "support", "fixtures.ts"),
    "utf8",
  );
  await writeFile(
    path.join(projectDir, "convex", "e2eFixtures.ts"),
    fixtures.replaceAll('"../../../convex/_generated/', '"./_generated/'),
  );
  // Local Node actions need a runtime installed on this machine. No source
  // configuration is changed, and all current supported majors meet the app's requirements.
  const nodeVersion = process.versions.node.split(".")[0];
  if (!["20", "22", "24"].includes(nodeVersion))
    throw new Error(
      "Beauty E2E requires Node.js 20, 22 or 24 for local Convex actions.",
    );
  await writeFile(
    path.join(projectDir, "convex.json"),
    JSON.stringify({ node: { nodeVersion }, aiFiles: { enabled: false } }),
  );
  return projectDir;
}

async function waitFor(url, child, timeoutMs = 30_000, expectedBody) {
  assertLoopbackUrl(url);
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (child.exitCode !== null || child.signalCode !== null)
      throw new Error(`Process exited before ${url} was ready.`);
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(1000),
        redirect: "manual",
      });
      if (
        response.status < 500 &&
        (!expectedBody || (await response.text()) === expectedBody)
      )
        return;
    } catch {
      /* The owned server is still starting. */
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for isolated service ${url}.`);
}

async function stopOwnedProcess(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const kill = (signal) => {
    try {
      if (process.platform === "win32") child.kill(signal);
      else process.kill(-child.pid, signal);
    } catch (error) {
      if (error.code !== "ESRCH") throw error;
    }
  };
  kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 3000).unref()),
  ]);
  if (child.exitCode === null && child.signalCode === null) kill("SIGKILL");
}

export async function startEnvironment() {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "opus-beauty-e2e-"));
  const children = [];
  const secrets = [];
  let mailbox;
  let stopped = false;
  const collectLogs = async () => {
    const destination = path.join(
      appRoot,
      "test-results",
      `infrastructure-${path.basename(tempRoot)}`,
    );
    await mkdir(destination, { recursive: true });
    for (const name of await readdir(tempRoot)) {
      if (!name.endsWith(".log")) continue;
      const text = await readFile(path.join(tempRoot, name), "utf8");
      await writeFile(
        path.join(destination, name),
        redactInfrastructureLog(text, secrets),
      );
    }
    return destination;
  };
  const stop = async ({ keepArtifacts = false } = {}) => {
    if (stopped) return;
    stopped = true;
    process.removeListener("SIGINT", onInterrupt);
    process.removeListener("SIGTERM", onTerminate);
    for (const child of children.reverse()) {
      await stopOwnedProcess(child);
    }
    await mailbox?.close();
    if (!keepArtifacts) await rm(tempRoot, { recursive: true, force: true });
  };
  const onInterrupt = () => {
    void stop().finally(() => process.exit(130));
  };
  const onTerminate = () => {
    void stop().finally(() => process.exit(143));
  };
  process.once("SIGINT", onInterrupt);
  process.once("SIGTERM", onTerminate);
  const spawnLogged = (command, args, cwd, env, label) => {
    const log = path.join(tempRoot, `${label}.log`);
    const output = createWriteStream(log);
    const child = spawn(command, args, {
      cwd,
      env,
      detached: process.platform !== "win32",
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout.pipe(output, { end: false });
    child.stderr.pipe(output, { end: false });
    child.once("close", () => output.end());
    child.once("error", () => output.end());
    children.push(child);
    return { child, log };
  };
  const runLogged = async (...args) => {
    const { child, log } = spawnLogged(...args);
    const code = await new Promise((resolve, reject) => {
      child.once("error", reject);
      child.once("exit", resolve);
    });
    if (code !== 0)
      throw new Error(
        `${args[4]} failed (${code}). Log: ${log}\n${(await readFile(log, "utf8")).split("\n").slice(-24).join("\n")}`,
      );
  };
  try {
    mailbox = await createMailbox();
    secrets.push(mailbox.token);
    const projectDir = await copyApplication(tempRoot, mailbox.url);
    const usedPorts = new Set([new URL(mailbox.url).port]);
    const port = async (host) => {
      let value;
      do {
        value = await availablePort(host);
      } while (usedPorts.has(String(value)));
      usedPorts.add(String(value));
      return value;
    };
    const cloudPort = await port("127.0.0.1");
    const sitePort = await port("127.0.0.1");
    const frontendPort = await port("localhost");
    const frontendUrl = `http://localhost:${frontendPort}`;
    const convexUrl = `http://127.0.0.1:${cloudPort}`;
    const convexSiteUrl = `http://127.0.0.1:${sitePort}`;
    const binary = await backendBinary(tempRoot);
    const instanceName = `opus-e2e-${randomUUID()}`;
    const instanceSecret = randomBytes(32).toString("hex");
    secrets.push(instanceSecret);
    const systemEnv = {
      ...isolatedProcessEnv(),
      CI: "1",
      NEXT_TELEMETRY_DISABLED: "1",
    };
    const { stdout } = await execFileAsync(
      binary,
      [
        "keygen",
        "admin-key",
        "--instance-name",
        instanceName,
        "--instance-secret",
        instanceSecret,
      ],
      { env: systemEnv },
    );
    const adminKey = stdout.trim();
    secrets.push(adminKey);
    const { child: backend } = spawnLogged(
      binary,
      [
        "--interface",
        "127.0.0.1",
        "--port",
        String(cloudPort),
        "--site-proxy-port",
        String(sitePort),
        "--convex-origin",
        convexUrl,
        "--convex-site",
        convexSiteUrl,
        "--instance-name",
        instanceName,
        "--instance-secret",
        instanceSecret,
        "--disable-beacon",
        "--local-storage",
        path.join(tempRoot, "storage"),
        path.join(tempRoot, "backend.sqlite3"),
      ],
      projectDir,
      systemEnv,
      "backend",
    );
    await waitFor(`${convexUrl}/instance_name`, backend, 30_000, instanceName);
    const authProxySecret = randomBytes(32).toString("hex");
    const backendEnv = {
      SITE_URL: frontendUrl,
      BETTER_AUTH_SECRET: randomBytes(32).toString("hex"),
      AUTH_PROXY_SECRET: authProxySecret,
      AUTH_EMAIL_MODE: "provider",
      AUTH_EMAIL_PROVIDERS: "resend",
      BOOKING_EMAIL_PROVIDERS: "resend",
      REMINDER_EMAIL_PROVIDERS: "resend",
      AUTH_EMAIL_FROM: "login@opus.example.test",
      BOOKING_EMAIL_FROM: "bookings@opus.example.test",
      RESEND_API_KEY: mailbox.token,
      NEXT_PUBLIC_ROOT_DOMAIN: `localhost:${frontendPort}`,
      NEXT_PUBLIC_CLIENT_ACCOUNT_URL: frontendUrl,
    };
    secrets.push(authProxySecret, backendEnv.BETTER_AUTH_SECRET);
    const envResponse = await fetch(
      `${convexUrl}/api/update_environment_variables`,
      {
        method: "POST",
        headers: {
          Authorization: `Convex ${adminKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          changes: Object.entries(backendEnv).map(([name, value]) => ({
            name,
            value,
          })),
        }),
      },
    );
    if (!envResponse.ok)
      throw new Error(
        `Failed to configure disposable backend (${envResponse.status}).`,
      );
    console.info(
      "[beauty-e2e] Pushing current backend source to a new disposable local database.",
    );
    await runLogged(
      process.execPath,
      [
        path.join(projectDir, "node_modules", "convex", "bin", "main.js"),
        "dev",
        "--once",
        "--url",
        convexUrl,
        "--admin-key",
        adminKey,
        "--typecheck",
        "enable",
      ],
      projectDir,
      systemEnv,
      "convex-push",
    );
    const env = {
      ...systemEnv,
      NODE_ENV: "development",
      SITE_URL: frontendUrl,
      AUTH_PROXY_SECRET: authProxySecret,
      NEXT_PUBLIC_CONVEX_URL: convexUrl,
      NEXT_PUBLIC_CONVEX_SITE_URL: convexSiteUrl,
      NEXT_PUBLIC_ROOT_DOMAIN: `localhost:${frontendPort}`,
      NEXT_PUBLIC_CLIENT_ACCOUNT_URL: frontendUrl,
      NEXT_PUBLIC_MAPBOX_TOKEN: "pk.opus-e2e",
      OPUS_E2E_ISOLATED: "1",
      PLAYWRIGHT_BASE_URL: frontendUrl,
      OPUS_E2E_CONVEX_URL: convexUrl,
      OPUS_E2E_CONVEX_ADMIN_KEY: adminKey,
      OPUS_E2E_MAILBOX_URL: mailbox.url,
      OPUS_E2E_MAILBOX_TOKEN: mailbox.token,
    };
    // The production auth UI intentionally requires edge/CAPTCHA configuration.
    // A local dev frontend uses the existing localhost policy while preserving
    // real OTPs. A production build remains a separate release gate.
    console.info(
      "[beauty-e2e] Starting the disposable webpack development frontend.",
    );
    const next = path.join(
      projectDir,
      "node_modules",
      "next",
      "dist",
      "bin",
      "next",
    );
    const { child: frontend } = spawnLogged(
      process.execPath,
      [
        next,
        "dev",
        "--webpack",
        "--hostname",
        "localhost",
        "--port",
        String(frontendPort),
      ],
      projectDir,
      env,
      "frontend",
    );
    await waitFor(`${frontendUrl}/login`, frontend, 90_000);
    console.info(`[beauty-e2e] Isolated app ready at ${frontendUrl}.`);
    return {
      projectDir,
      tempRoot,
      frontendUrl,
      convexUrl,
      convexSiteUrl,
      mailboxUrl: mailbox.url,
      mailboxToken: mailbox.token,
      adminKey,
      env,
      stop,
      collectLogs,
      trackProcess: (child) => children.push(child),
      buildProduction: async () => {
        await stopOwnedProcess(frontend);
        console.info(
          "[beauty-e2e] Checking the same isolated source with a production webpack build.",
        );
        await runLogged(
          process.execPath,
          [next, "build", "--webpack"],
          projectDir,
          { ...env, NODE_ENV: "production" },
          "frontend-build",
        );
        await access(
          path.join(
            projectDir,
            ".next",
            "standalone",
            "opus-dashboard",
            "server.js",
          ),
        );
      },
    };
  } catch (error) {
    const logs = await collectLogs();
    await stop();
    throw new Error(
      `${redactInfrastructureLog(error.message, secrets)}\nSanitized infrastructure logs: ${logs}.`,
      { cause: error },
    );
  }
}
