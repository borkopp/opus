import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authSecurityPolicy, withAuthProxyProof } from "../lib/auth-proxy";
import {
  AUTH_CAPTCHA_ACTION,
  AUTH_CLIENT_IP_HEADER,
  AUTH_PROXY_HEADERS,
  isOtpSendRequest,
} from "../lib/auth-protection";
import {
  authenticateAuthProxy,
  verifyAuthCaptcha,
} from "../convex/lib/authProtection";

const siteUrl = "https://studio.opus.mk";
const secret = "a-test-proxy-secret-with-at-least-32-characters";
function request(country: string | null = "DE", token?: string) {
  const headers = new Headers({
    "Content-Type": "application/json",
    "x-vercel-forwarded-for": "203.0.113.10",
  });
  if (country) headers.set("x-vercel-ip-country", country);
  if (token) headers.set("x-captcha-response", token);
  return new Request(`${siteUrl}/api/auth/email-otp/send-verification-otp`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email: "test@example.com", type: "sign-in" }),
  });
}
async function trustedRequest(country: string | null, token?: string) {
  const secured = await authenticateAuthProxy(
    await withAuthProxyProof(request(country, token)),
    siteUrl,
  );
  expect(secured).toBeInstanceOf(Request);
  return secured as Request;
}

beforeEach(() => {
  vi.stubEnv("VERCEL", "1");
  vi.stubEnv("AUTH_PROXY_SECRET", secret);
  vi.stubEnv("TURNSTILE_SITE_KEY", "public-site-key");
  vi.stubEnv("TURNSTILE_SECRET_KEY", "test-provider-secret");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("country policy and trusted forwarding", () => {
  it("materializes framework-wrapped requests before signing", async () => {
    const wrapped = new Proxy(request("MK"), {
      get(target, property) {
        const value = Reflect.get(target, property, target);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
    const forwarded = await withAuthProxyProof(wrapped);
    expect(await forwarded.clone().json()).toEqual({
      email: "test@example.com",
      type: "sign-in",
    });
    expect(await authenticateAuthProxy(forwarded, siteUrl)).toBeInstanceOf(
      Request,
    );
  });

  it.each(["MK", "RS", "AL"])(
    "exempts %s while retaining a trusted rate-limit IP",
    async (country) => {
      expect(authSecurityPolicy(request(country)).required).toBe(false);
      const forwarded = await trustedRequest(country);
      expect(forwarded.headers.get(AUTH_CLIENT_IP_HEADER)).toBe("203.0.113.10");
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);
      expect(await verifyAuthCaptcha(forwarded, siteUrl)).toBeUndefined();
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it.each(["DE", "BG", "GR", "XK", "US", "mk", "MK,US", null])(
    "requires CAPTCHA for %s",
    async (country) => {
      expect(authSecurityPolicy(request(country)).required).toBe(true);
      expect(
        (await verifyAuthCaptcha(await trustedRequest(country), siteUrl))
          ?.status,
      ).toBe(400);
    },
  );

  it("ignores country headers on non-Vercel production servers", () => {
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("NODE_ENV", "production");
    expect(authSecurityPolicy(request("MK")).required).toBe(true);
    expect(
      authSecurityPolicy(new Request("http://localhost/api/auth/security"))
        .required,
    ).toBe(true);
  });

  it("keeps local development usable without production keys", async () => {
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("AUTH_PROXY_SECRET", "");
    const local = new Request(
      "http://localhost:3000/api/auth/email-otp/send-verification-otp",
      { method: "POST" },
    );
    expect(authSecurityPolicy(local).required).toBe(false);
    expect(
      await authenticateAuthProxy(local, "http://localhost:3000"),
    ).toBeInstanceOf(Request);
    expect(
      await verifyAuthCaptcha(local, "http://localhost:3000"),
    ).toBeUndefined();
  });

  it("rejects direct Convex requests with forged country and IP headers", async () => {
    const direct = request("MK");
    direct.headers.set(AUTH_PROXY_HEADERS.country, "MK");
    direct.headers.set(AUTH_CLIENT_IP_HEADER, "203.0.113.99");
    expect(
      ((await authenticateAuthProxy(direct, siteUrl)) as Response).status,
    ).toBe(403);
  });

  it.each(
    Object.values(AUTH_PROXY_HEADERS).filter(
      (h) => h !== AUTH_PROXY_HEADERS.signature,
    ),
  )("rejects tampering with signed %s", async (header) => {
    const signed = await withAuthProxyProof(request("DE", "test-token"));
    signed.headers.set(
      header,
      header === AUTH_PROXY_HEADERS.country ? "MK" : "forged",
    );
    expect(
      ((await authenticateAuthProxy(signed, siteUrl)) as Response).status,
    ).toBe(403);
  });

  it("binds the proof to the email body and CAPTCHA token", async () => {
    const signed = await withAuthProxyProof(request("MK"));
    const changed = new Request(signed.url, {
      method: "POST",
      headers: signed.headers,
      body: '{"email":"different@example.com","type":"sign-in"}',
    });
    expect(
      ((await authenticateAuthProxy(changed, siteUrl)) as Response).status,
    ).toBe(403);
    signed.headers.set("x-captcha-response", "different-token");
    expect(
      ((await authenticateAuthProxy(signed, siteUrl)) as Response).status,
    ).toBe(403);
  });

  it("rejects an expired proof", async () => {
    const signed = await withAuthProxyProof(request("MK"));
    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 61_000);
    expect(
      ((await authenticateAuthProxy(signed, siteUrl)) as Response).status,
    ).toBe(403);
  });

  it("strips attacker-supplied rate-limit headers before signing", async () => {
    const incoming = request("MK");
    incoming.headers.set(AUTH_CLIENT_IP_HEADER, "203.0.113.99");
    const secured = (await authenticateAuthProxy(
      await withAuthProxyProof(incoming),
      siteUrl,
    )) as Request;
    expect(secured.headers.get(AUTH_CLIENT_IP_HEADER)).toBe("203.0.113.10");
  });

  it("fails closed when the shared secret is missing", async () => {
    vi.stubEnv("AUTH_PROXY_SECRET", "");
    expect(
      ((await authenticateAuthProxy(request("MK"), siteUrl)) as Response)
        .status,
    ).toBe(503);
  });

  it.each([
    "/email-otp/request-password-reset",
    "/forget-password/email-otp",
    "/email-otp/request-email-change",
    "/send-verification-email",
    "/request-password-reset",
    "//email-otp/send-verification-otp/",
    "/%65mail-otp/send-verification-otp",
  ])("guards alternate email endpoint %s", (path) => {
    expect(
      isOtpSendRequest(
        new Request(`${siteUrl}/api/auth${path}`, { method: "POST" }),
      ),
    ).toBe(true);
  });
});

describe("server-side Turnstile verification", () => {
  it("verifies a token with Cloudflare before allowing a send", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        success: true,
        hostname: "studio.opus.mk",
        action: AUTH_CAPTCHA_ACTION,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    expect(
      await verifyAuthCaptcha(
        await trustedRequest("DE", "test-token"),
        siteUrl,
      ),
    ).toBeUndefined();
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    );
    expect(options.body.get("response")).toBe("test-token");
    expect(options.body.get("remoteip")).toBe("203.0.113.10");
  });

  it.each([
    { success: false, "error-codes": ["timeout-or-duplicate"] },
    {
      success: true,
      hostname: "attacker.example",
      action: AUTH_CAPTCHA_ACTION,
    },
    { success: true, hostname: "studio.opus.mk", action: "different-form" },
    { success: true },
  ])("rejects failed, reused, or mismatched tokens: %j", async (result) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(result)));
    expect(
      (
        await verifyAuthCaptcha(
          await trustedRequest("DE", "test-token"),
          siteUrl,
        )
      )?.status,
    ).toBe(400);
  });

  it("fails closed if the provider is down", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("timeout")));
    expect(
      (
        await verifyAuthCaptcha(
          await trustedRequest("DE", "test-token"),
          siteUrl,
        )
      )?.status,
    ).toBe(503);
  });

  it("requires a configured provider secret outside the exempt countries", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    expect(
      (
        await verifyAuthCaptcha(
          await trustedRequest("DE", "test-token"),
          siteUrl,
        )
      )?.status,
    ).toBe(503);
  });
});
