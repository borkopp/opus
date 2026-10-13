import { describe, expect, it } from "vitest";
import {
  getDashboardNavLinks,
  getNavLinks,
  isDashboardNavActive,
} from "../../lib/vertical-nav-config";

const paths = (profile: Parameters<typeof getDashboardNavLinks>[0]) =>
  getDashboardNavLinks(profile, "en").map((link) => link.href);

describe("dashboard navigation", () => {
  it.each(["owner", "manager"])(
    "gives hospitality %s the venue setup destination",
    (role) => {
      expect(paths({ industry: "hospitality", role })).toEqual([
        "/hospitality",
        "/hospitality/tables",
        "/hospitality/setup",
      ]);
    },
  );

  it.each(["staff", undefined])(
    "keeps hospitality operations available without setup for %s",
    (role) => {
      expect(
        paths({ industry: "hospitality", role, bookingAccess: "own" }),
      ).toEqual(["/hospitality", "/hospitality/tables"]);
    },
  );

  it("preserves beauty team and personal booking navigation", () => {
    expect(paths({ industry: "beauty_wellness", role: "owner" })).toEqual([
      "/beauty",
      "/beauty/bookings",
      "/beauty/clients",
      "/beauty/services",
      "/beauty/promote",
    ]);
    expect(
      paths({
        industry: "beauty_wellness",
        role: "staff",
        bookingAccess: "own",
      }),
    ).toEqual(["/beauty/bookings"]);
    expect(paths({})).toEqual(paths({ industry: "beauty_wellness" }));
  });

  it.each(["en", "mk", "sq"] as const)(
    "localizes hospitality links in %s without changing destinations",
    (language) => {
      const config = getNavLinks("hospitality", language);
      expect(config.links.map((link) => link.href)).toEqual(
        paths({ industry: "hospitality", role: "owner" }),
      );
      expect(config.links.every((link) => link.label.length > 0)).toBe(true);
      expect(config.label).not.toEqual(
        getNavLinks("beauty_wellness", language).label,
      );
    },
  );

  it("highlights only the current destination and recognizes beauty team subpages", () => {
    expect(isDashboardNavActive("/hospitality", "/hospitality/tables")).toBe(
      false,
    );
    expect(isDashboardNavActive("/hospitality", "/hospitality")).toBe(true);
    expect(
      isDashboardNavActive("/hospitality/tables", "/hospitality/tables/layout"),
    ).toBe(true);
    expect(
      isDashboardNavActive("/hospitality/tables", "/hospitality/tables-other"),
    ).toBe(false);
    expect(isDashboardNavActive("/beauty", "/beauty/bookings")).toBe(false);
    expect(
      isDashboardNavActive("/beauty/services", "/beauty/staff/member"),
    ).toBe(true);
  });
});
