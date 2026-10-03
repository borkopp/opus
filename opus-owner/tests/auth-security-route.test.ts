import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { OWNER_EMAIL } from "../../shared/owner-access";
import {
  AUTH_PROXY_HEADERS,
  verifyAuthProxyRequest,
} from "../../shared/auth-security";
const { forward } = vi.hoisted(() => ({
  forward: vi.fn(async (request: Request) => {
    void request;
    return Response.json({ ok: true });
  }),
}));
vi.mock("@/lib/auth-server", () => ({ handler: { POST: forward } }));
vi.mock("@/lib/auth-policy", async () => import("../lib/auth-policy"));
vi.mock("@/lib/auth-security", async () => import("../lib/auth-security"));
import { POST } from "../app/api/auth/[...all]/route";
const secret = "a-shared-test-proxy-secret-with-more-than-32-characters";
beforeEach(() => {
  forward.mockClear();
  vi.stubEnv("OWNER_SITE_URL", "https://admin.opus.mk");
  vi.stubEnv("AUTH_PROXY_SECRET", secret);
  vi.stubEnv("VERCEL", "1");
});
afterEach(() => vi.unstubAllEnvs());
function request(email = OWNER_EMAIL, origin = "https://admin.opus.mk") {
  return new Request(
    "https://admin.opus.mk/api/auth/email-otp/send-verification-otp",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: origin,
        "x-vercel-ip-country": "DE",
        "x-vercel-forwarded-for": "203.0.113.10",
        "x-captcha-response": "test-token",
        "x-opus-auth-country": "MK",
      },
      body: JSON.stringify({ email, type: "sign-in" }),
    },
  );
}
it("preserves the owner allowlist before signing any request", async () => {
  expect((await POST(request("other@example.com"))).status).toBe(403);
  expect(forward).not.toHaveBeenCalled();
});
it("preserves exact origin enforcement", async () => {
  expect(
    (await POST(request(OWNER_EMAIL, "https://studio.opus.mk"))).status,
  ).toBe(403);
  expect(forward).not.toHaveBeenCalled();
});
it("signs owner requests with their real country, IP, hostname and CAPTCHA token", async () => {
  expect((await POST(request())).status).toBe(200);
  const forwarded = forward.mock.calls[0][0];
  expect(forwarded.headers.get(AUTH_PROXY_HEADERS.country)).toBe("DE");
  expect(forwarded.headers.get(AUTH_PROXY_HEADERS.hostname)).toBe(
    "admin.opus.mk",
  );
  expect(forwarded.headers.get("x-captcha-response")).toBe("test-token");
  expect(await verifyAuthProxyRequest(forwarded, secret)).toBe(true);
  expect((await forwarded.json()).email).toBe(OWNER_EMAIL);
});
it("fails closed when proxy configuration is missing", async () => {
  vi.stubEnv("AUTH_PROXY_SECRET", "");
  expect((await POST(request())).status).toBe(503);
  expect(forward).not.toHaveBeenCalled();
});
