import { describe, expect, it } from "vitest";
import {
  authDestination,
  stripCheckoutSessionToken,
} from "../../lib/auth-destination";

describe("sign-in destination", () => {
  it("opens the homepage for completed studios and setup for unfinished accounts", () => {
    expect(authDestination(undefined, true)).toBe("/beauty");
    expect(authDestination(undefined, false)).toBe("/onboarding");
  });
  it.each([
    "/onboarding",
    "/onboarding?step=review",
    "/onboarding/",
    "/onboarding#review",
  ])("does not return completed studios to %s", (callback) => {
    expect(authDestination(callback, true)).toBe("/beauty");
    expect(authDestination(callback, false)).toBe(callback);
  });
  it("preserves explicit local destinations", () => {
    expect(authDestination("/bookings?date=2026-09-12", true)).toBe(
      "/bookings?date=2026-09-12",
    );
    expect(authDestination("/settings?tab=branding", false)).toBe(
      "/settings?tab=branding",
    );
  });
  it("drops Polar return credentials while retaining billing state and fragments", () => {
    for (const complete of [true, false]) {
      expect(
        authDestination(
          "/settings?tab=billing&checkout=returned&currency=eur&team=3&customer_session_token=synthetic-polar-session#subscription",
          complete,
        ),
      ).toBe(
        "/settings?tab=billing&checkout=returned&currency=eur&team=3#subscription",
      );
    }
  });
  it("removes the credential from nested encoded callbacks and duplicate parameters", () => {
    const billing =
      "/settings?checkout=returned&customer_session_token=first&customer_session_token=second";
    const signIn = `/login?callbackUrl=${encodeURIComponent(billing)}`;
    const destination = `/upgrade?callbackUrl=${encodeURIComponent(signIn)}`;
    const cleaned = new URL(
      stripCheckoutSessionToken(destination),
      "https://studio.opus.mk",
    );
    const nested = new URL(
      cleaned.searchParams.get("callbackUrl")!,
      "https://studio.opus.mk",
    );
    expect(nested.searchParams.get("callbackUrl")).toBe(
      "/settings?checkout=returned",
    );
  });
  it("leaves unrelated authentication and booking credentials untouched", () => {
    const destination =
      "/account?claim=booking&token=invite&otp=123456&offer=recovery#proof=proof";
    expect(stripCheckoutSessionToken(destination)).toBe(destination);
    expect(authDestination(destination, true)).toBe(destination);
  });
  it("does not normalize a cleaned local path into a protocol-relative destination", () => {
    expect(
      authDestination(
        "/path/..//outside.test?customer_session_token=synthetic",
        true,
      ),
    ).toBe("/path/..//outside.test");
  });
  it("keeps Pro intent through sign-in for both new and existing accounts", () => {
    for (const complete of [true, false]) {
      expect(authDestination("/upgrade", complete)).toBe("/upgrade");
    }
    expect(authDestination("/onboarding?plan=pro", false)).toBe(
      "/onboarding?plan=pro",
    );
    expect(authDestination("/onboarding?plan=pro", true)).toBe("/upgrade");
    expect(authDestination("/onboarding?step=hours&plan=pro", true)).toBe(
      "/upgrade",
    );
  });
  it.each([
    "https://example.com",
    "//example.com",
    "/\\example.com",
    "/\n/example.com",
    "/login",
    "/signup?callbackUrl=/login",
  ])("rejects unsafe or looping callbacks: %s", (callback) => {
    expect(authDestination(callback, true)).toBe("/beauty");
    expect(authDestination(callback, false)).toBe("/onboarding");
  });
});
