import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { memoryAdapter } from "better-auth/adapters/memory";
import type { GenericCtx } from "@convex-dev/better-auth";
import type { DataModel } from "../convex/_generated/dataModel";

const { database, sent } = vi.hoisted(() => ({
  database: {} as Record<string, unknown[]>,
  sent: vi.fn(),
}));
vi.mock("@convex-dev/better-auth", async () => ({
  createClient: () => ({ adapter: () => memoryAdapter(database) }),
}));
// Exercise the real Better Auth limiter and OTP endpoints with an isolated DB.
vi.mock("@convex-dev/better-auth/plugins", () => ({
  convex: () => ({ id: "test-convex" }),
}));
vi.mock("../convex/lib/emailDelivery", () => ({
  deliverEmail: sent,
  emailFromForRoute: () => "OPUS <login@auth.opus.mk>",
  providerOrderForRoute: () => ["resend"],
}));
import { createAuth } from "../convex/betterAuth";
import { withAuthProxyProof } from "../lib/auth-proxy";

beforeEach(() => {
  for (const key of Object.keys(database)) delete database[key];
  for (const key of ["user", "session", "account", "verification", "rateLimit"])
    database[key] = [];
  sent.mockReset();
  vi.stubEnv("SITE_URL", "https://studio.opus.mk");
  vi.stubEnv(
    "BETTER_AUTH_SECRET",
    "a-test-better-auth-secret-with-at-least-32-characters",
  );
  vi.stubEnv(
    "AUTH_PROXY_SECRET",
    "a-test-proxy-secret-with-at-least-32-characters",
  );
  vi.stubEnv("AUTH_TEST_OTP", "");
  vi.stubEnv("AUTH_EMAIL_MODE", "");
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("VERCEL", "1");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

async function sendRequest(ip: string, email: string, country = "MK") {
  return withAuthProxyProof(
    new Request(
      "https://studio.opus.mk/api/auth/email-otp/send-verification-otp",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-vercel-ip-country": country,
          "x-vercel-forwarded-for": ip,
          Origin: "https://studio.opus.mk",
        },
        body: JSON.stringify({ email, type: "sign-in" }),
      },
    ),
  );
}

it("accepts the native scheme through the signed proxy and keeps CAPTCHA and proof required", async () => {
  const auth = createAuth({} as GenericCtx<DataModel>);
  const native = await sendRequest("203.0.113.60", "native@example.com");
  native.headers.delete("origin");
  native.headers.set("expo-origin", "opus-studio:///");
  expect((await auth.handler(native)).status).toBe(200);
  expect(sent).toHaveBeenCalledTimes(1);

  const protectedCountry = await sendRequest(
    "203.0.113.61",
    "native-de@example.com",
    "DE",
  );
  protectedCountry.headers.delete("origin");
  protectedCountry.headers.set("expo-origin", "opus-studio:///");
  expect((await auth.handler(protectedCountry)).status).toBe(400);
  const unsigned = new Request(
    "https://studio.opus.mk/api/auth/email-otp/send-verification-otp",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "expo-origin": "opus-studio:///",
      },
      body: JSON.stringify({ email: "unsigned@example.com", type: "sign-in" }),
    },
  );
  expect((await auth.handler(unsigned)).status).toBe(403);
  expect(sent).toHaveBeenCalledTimes(1);
});

it("limits different email addresses from one IP even without NODE_ENV=production", async () => {
  const auth = createAuth({} as GenericCtx<DataModel>);
  for (let i = 0; i < 3; i++) {
    const response = await auth.handler(
      await sendRequest("203.0.113.10", `recipient${i}@example.com`),
    );
    expect(response.status).toBe(200);
  }
  expect(
    (
      await auth.handler(
        await sendRequest("203.0.113.10", "fourth@example.com"),
      )
    ).status,
  ).toBe(429);
  expect(sent).toHaveBeenCalledTimes(3);
  expect(database.rateLimit.length).toBeGreaterThan(0);
  expect(database.user).toHaveLength(0);
  // Each request rebuilds createAuth in production: persisted limits must survive.
  const nextAuth = createAuth({} as GenericCtx<DataModel>);
  expect(
    (
      await nextAuth.handler(
        await sendRequest("203.0.113.10", "fifth@example.com"),
      )
    ).status,
  ).toBe(429);
  expect(
    (
      await nextAuth.handler(
        await sendRequest("203.0.113.11", "other@example.com"),
      )
    ).status,
  ).toBe(200);
});

it("sends no email for an unsigned or unverified foreign request", async () => {
  const auth = createAuth({} as GenericCtx<DataModel>);
  const raw = new Request(
    "https://studio.opus.mk/api/auth/email-otp/send-verification-otp",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-vercel-ip-country": "MK",
      },
      body: JSON.stringify({ email: "direct@example.com", type: "sign-in" }),
    },
  );
  expect((await auth.handler(raw)).status).toBe(403);
  expect(
    (
      await auth.handler(
        await sendRequest("203.0.113.12", "foreign@example.com", "DE"),
      )
    ).status,
  ).toBe(400);
  expect(sent).not.toHaveBeenCalled();
  expect(database.verification).toHaveLength(0);
});

it("limits OTP verification to five attempts per IP per minute", async () => {
  const auth = createAuth({} as GenericCtx<DataModel>);
  const request = () =>
    withAuthProxyProof(
      new Request("https://studio.opus.mk/api/auth/sign-in/email-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-vercel-ip-country": "MK",
          "x-vercel-forwarded-for": "203.0.113.15",
          Origin: "https://studio.opus.mk",
        },
        body: JSON.stringify({ email: "missing@example.com", otp: "000000" }),
      }),
    );
  for (let attempt = 0; attempt < 5; attempt++) {
    expect((await auth.handler(await request())).status).not.toBe(429);
  }
  expect((await auth.handler(await request())).status).toBe(429);
  expect(sent).not.toHaveBeenCalled();
  expect(database.user).toHaveLength(0);
});

it("preserves successful OTP sign-in and requesting a fresh code", async () => {
  const auth = createAuth({} as GenericCtx<DataModel>);
  const email = "valid@example.com";
  expect(
    (await auth.handler(await sendRequest("203.0.113.16", email))).status,
  ).toBe(200);
  expect(database.user).toHaveLength(0);
  expect(
    (await auth.handler(await sendRequest("203.0.113.16", email))).status,
  ).toBe(200);
  const otp = sent.mock.calls.at(-1)?.[0].text.match(/\b\d{6}\b/)?.[0];
  expect(otp).toMatch(/^\d{6}$/);
  const verified = await auth.handler(
    await withAuthProxyProof(
      new Request("https://studio.opus.mk/api/auth/sign-in/email-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-vercel-ip-country": "MK",
          "x-vercel-forwarded-for": "203.0.113.16",
          Origin: "https://studio.opus.mk",
        },
        body: JSON.stringify({ email, otp }),
      }),
    ),
  );
  expect(verified.status).toBe(200);
  expect(database.user).toHaveLength(1);
  expect(database.session).toHaveLength(1);
  expect(sent).toHaveBeenCalledTimes(2);
});
