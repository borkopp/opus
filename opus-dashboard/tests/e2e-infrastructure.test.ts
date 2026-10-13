import { describe, expect, test } from "vitest";
import { createRequire } from "node:module";
import {
  createMailbox,
  isolatedProcessEnv,
  replaceResendEndpoint,
  redactInfrastructureLog,
  backendExecutableFromZip,
} from "../scripts/e2e-environment.mjs";

describe("isolated business journey E2E infrastructure", () => {
  test("extracts only the expected backend executable on a clean machine", () => {
    const AdmZip = createRequire(import.meta.url)("adm-zip");
    const archive = new AdmZip();
    archive.addFile("convex-local-backend", Buffer.from("test executable"));
    archive.addFile("unrelated-file", Buffer.from("ignored"));
    expect(
      backendExecutableFromZip(
        archive.toBuffer(),
        "convex-local-backend",
      ).toString(),
    ).toBe("test executable");
    expect(() =>
      backendExecutableFromZip(archive.toBuffer(), "missing-executable"),
    ).toThrow("expected executable");
  });
  test("removes generated credentials from retained infrastructure diagnostics", () => {
    expect(
      redactInfrastructureLog(
        "--admin-key private-admin-key Bearer fallback-secret-token",
        ["private-admin-key"],
      ),
    ).toBe("--admin-key [REDACTED] Bearer [REDACTED]");
  });
  test("does not inherit provider credentials, deployment selectors, OTP overrides or suite selection", () => {
    expect(
      isolatedProcessEnv({
        PATH: "/bin",
        HOME: "/home/test",
        NODE_ENV: "production",
        RESEND_API_KEY: "real-provider-key",
        CONVEX_DEPLOY_KEY: "production-deployment-key",
        CONVEX_SELF_HOSTED_URL: "https://remote.example.test",
        AUTH_TEST_OTP: "123456",
        OPUS_E2E_SUITE: "hospitality",
        NODE_OPTIONS: "--require injected.js",
        NEXT_PUBLIC_CONVEX_URL: "https://remote.example.test",
      }),
    ).toEqual({ PATH: "/bin", HOME: "/home/test" });
  });

  test("changes only the single copied provider URL and requires a loopback sink", () => {
    const source = 'await fetch("https://api.resend.com/emails", payload);';
    expect(replaceResendEndpoint(source, "http://127.0.0.1:12345")).toBe(
      'await fetch("http://127.0.0.1:12345/emails", payload);',
    );
    expect(() => replaceResendEndpoint("", "http://localhost:12345")).toThrow(
      "exactly one",
    );
    expect(() =>
      replaceResendEndpoint(`${source}\n${source}`, "http://localhost:12345"),
    ).toThrow("exactly one");
    expect(() =>
      replaceResendEndpoint(source, "https://provider.example.test"),
    ).toThrow("non-loopback");
  });

  test("mailbox requires its private token, preserves real content and deduplicates provider retries", async () => {
    const mailbox = await createMailbox();
    try {
      expect((await fetch(`${mailbox.url}/messages`)).status).toBe(401);
      expect(
        (await fetch(`${mailbox.url}/emails`, { method: "POST" })).status,
      ).toBe(401);
      const after = Date.now();
      const payload = {
        from: "login@opus.example.test",
        to: ["owner@example.test"],
        subject: "Sign-in code",
        text: "Your code is 482195",
        html: "<strong>482195</strong>",
      };
      const request = {
        method: "POST",
        headers: {
          Authorization: `Bearer ${mailbox.token}`,
          "Content-Type": "application/json",
          "Idempotency-Key": "fixture-otp",
        },
        body: JSON.stringify(payload),
      };
      const first = await (
        await fetch(`${mailbox.url}/emails`, request)
      ).json();
      const retry = await (
        await fetch(`${mailbox.url}/emails`, request)
      ).json();
      expect(retry).toEqual(first);
      const result = await (
        await fetch(
          `${mailbox.url}/messages?to=OWNER%40example.test&after=${after}`,
          { headers: { Authorization: `Bearer ${mailbox.token}` } },
        )
      ).json();
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]).toMatchObject({ ...payload, id: first.id });
      const other = await (
        await fetch(`${mailbox.url}/messages?to=other%40example.test`, {
          headers: { Authorization: `Bearer ${mailbox.token}` },
        })
      ).json();
      expect(other.messages).toEqual([]);
    } finally {
      await mailbox.close();
    }
  });
});
