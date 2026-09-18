import { describe, expect, it } from "vitest";
import { authDestination } from "../../lib/auth-destination";

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
