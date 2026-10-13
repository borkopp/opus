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

describe("business-aware sign-in destination", () => {
  const fresh = { hasBusiness: false };
  const beauty = {
    hasBusiness: true,
    industry: "beauty_wellness",
    role: "owner",
  };
  const venue = { hasBusiness: true, industry: "hospitality", role: "owner" };

  it.each([
    undefined,
    "/hospitality/setup",
    "/beauty",
    "/settings?tab=team",
    "/login",
  ])("takes a fresh account to the chooser from %s", (callback) =>
    expect(authDestination(callback, false, fresh)).toBe("/onboarding"),
  );
  it.each([
    "/onboarding?plan=pro&team=5&currency=eur",
    "/onboarding?industry=beauty_wellness&plan=pro",
    "/onboarding?industry=hospitality",
  ])("preserves explicit selection and Pro intent at %s", (callback) => {
    expect(authDestination(callback, false, fresh)).toBe(callback);
  });
  it("takes fresh Pro sign-ins to the chooser without losing price choices", () => {
    const destination = new URL(
      authDestination("/upgrade?team=5&currency=eur", false, fresh),
      "https://studio.opus.mk",
    );
    expect(destination.pathname).toBe("/onboarding");
    expect(Object.fromEntries(destination.searchParams)).toEqual({
      plan: "pro",
      team: "5",
      currency: "eur",
    });
  });
  it.each([
    "/invites/token",
    "/business/switch",
    "/account",
    "/book/studio?date=2026-10-20",
    "/reserve/cafe",
    "/reserve/cafe/manage/token",
  ])(
    "keeps invitation and customer journey %s outside business setup",
    (callback) => {
      expect(authDestination(callback, false, fresh)).toBe(callback);
      expect(authDestination(callback, false, venue)).toBe(callback);
    },
  );
  it("resumes unfinished venues and preserves published or host dashboards", () => {
    expect(authDestination(undefined, false, venue)).toBe("/hospitality/setup");
    expect(authDestination("/hospitality", false, venue)).toBe(
      "/hospitality/setup",
    );
    expect(
      authDestination("/beauty", true, {
        ...venue,
        hospitalityOnboardingComplete: true,
      }),
    ).toBe("/hospitality");
    expect(authDestination(undefined, false, { ...venue, role: "staff" })).toBe(
      "/hospitality",
    );
    expect(
      authDestination("/hospitality/setup", true, {
        ...venue,
        hospitalityOnboardingComplete: true,
      }),
    ).toBe("/hospitality/setup");
  });
  it("never sends hospitality through beauty Pro onboarding", () => {
    expect(
      authDestination("/onboarding?plan=pro", true, {
        ...venue,
        hospitalityOnboardingComplete: true,
      }),
    ).toBe("/hospitality");
    expect(authDestination("/upgrade?team=5", false, venue)).toBe(
      "/hospitality/setup",
    );
  });
  it("keeps existing beauty setup bookmarks, Pro intent, and adding a separate venue", () => {
    expect(
      authDestination("/onboarding?step=service-duration", false, beauty),
    ).toBe("/onboarding?step=service-duration");
    expect(authDestination("/hospitality/setup", true, beauty)).toBe(
      "/hospitality/setup",
    );
    expect(authDestination("/onboarding?plan=pro", true, beauty)).toBe(
      "/upgrade",
    );
  });
  it.each([
    "https://example.com",
    "//example.com",
    "/\\example.com",
    "/signup",
  ])(
    "keeps unsafe hospitality callback %s in its own workspace",
    (callback) => {
      expect(
        authDestination(callback, true, {
          ...venue,
          hospitalityOnboardingComplete: true,
        }),
      ).toBe("/hospitality");
    },
  );
});
