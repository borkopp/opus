import { afterEach, describe, expect, it, vi } from "vitest";
import {
  mobileAuthPreflight,
  mobileAuthResponse,
} from "../lib/mobile-auth-cors";
afterEach(() => vi.unstubAllEnvs());
describe("mobile auth proxy browser origins", () => {
  it("keeps native requests and the existing same-origin dashboard working", () => {
    vi.stubEnv("NODE_ENV", "production");
    const native = new Request("https://studio.opus.mk/api/auth/get-session");
    expect(mobileAuthPreflight(native)).toBeNull();
    expect(
      mobileAuthPreflight(
        new Request(native.url, {
          headers: { origin: "https://studio.opus.mk" },
        }),
      ),
    ).toBeNull();
    const response = mobileAuthResponse(
      native,
      new Response("ok", {
        headers: { "set-cookie": "session=secret; HttpOnly; Secure" },
      }),
    );
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.has("access-control-allow-origin")).toBe(false);
  });
  it("allows credentials only for configured exact origins and refuses localhost in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_MOBILE_WEB_ORIGINS", "https://mobile.opus.mk");
    const request = new Request("https://studio.opus.mk/api/auth/security", {
      method: "OPTIONS",
      headers: { origin: "https://mobile.opus.mk" },
    });
    expect(
      mobileAuthPreflight(request)?.headers.get("access-control-allow-origin"),
    ).toBe("https://mobile.opus.mk");
    expect(
      mobileAuthPreflight(request)?.headers.get(
        "access-control-allow-credentials",
      ),
    ).toBe("true");
    for (const origin of [
      "https://mobile.opus.mk.evil.example",
      "http://localhost:8081",
      "null",
    ])
      expect(
        mobileAuthPreflight(new Request(request.url, { headers: { origin } }))
          ?.status,
      ).toBe(403);
  });
});
