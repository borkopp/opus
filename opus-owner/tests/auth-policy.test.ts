import { afterEach, describe, expect, test, vi } from "vitest";
import { allowedAuthRequest, isSameOrigin } from "../lib/auth-policy";
import { OWNER_EMAIL } from "../../shared/owner-access";

afterEach(() => vi.unstubAllEnvs());
describe("owner authentication proxy", () => {
  test("only sends sign-in codes to the exact allowlisted address", () => {
    const path = "/api/auth/email-otp/send-verification-otp";
    expect(
      allowedAuthRequest(path, { email: OWNER_EMAIL, type: "sign-in" }),
    ).toBe(true);
    for (const email of [
      "studio@example.com",
      "borko.petrevski+other@gmail.com",
      "borko.petrevski@gmail.com.attacker.test",
      null,
    ]) {
      expect(allowedAuthRequest(path, { email, type: "sign-in" })).toBe(false);
    }
    expect(
      allowedAuthRequest(path, {
        email: OWNER_EMAIL,
        type: "email-verification",
      }),
    ).toBe(false);
  });
  test("blocks signup, account changes, arbitrary auth endpoints and invalid codes", () => {
    const body = { email: OWNER_EMAIL, otp: "123456" };
    expect(allowedAuthRequest("/api/auth/sign-in/email-otp", body)).toBe(true);
    expect(
      allowedAuthRequest("/api/auth/sign-in/email-otp", {
        ...body,
        otp: "12345",
      }),
    ).toBe(false);
    for (const path of [
      "/api/auth/sign-up/email",
      "/api/auth/change-email",
      "/api/auth/update-user",
    ])
      expect(allowedAuthRequest(path, body)).toBe(false);
  });
  test("requires the configured exact origin and fails closed when unconfigured", () => {
    const request = (origin: string) =>
      new Request("https://admin.opus.mk/api/overview", {
        headers: { origin },
      });
    vi.stubEnv("OWNER_SITE_URL", "");
    expect(isSameOrigin(request("https://admin.opus.mk"))).toBe(false);
    vi.stubEnv("OWNER_SITE_URL", "https://admin.opus.mk");
    expect(isSameOrigin(request("https://admin.opus.mk"))).toBe(true);
    expect(isSameOrigin(request("https://studio.opus.mk"))).toBe(false);
    expect(isSameOrigin(request("https://admin.opus.mk.attacker.test"))).toBe(
      false,
    );
  });
});
