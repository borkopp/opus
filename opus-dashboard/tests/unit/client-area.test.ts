import { describe, expect, it } from "vitest";
import { isClientAreaPathname } from "../../lib/client-account";

describe("customer and business account boundary", () => {
  it.each([
    "/account",
    "/account/sign-in",
    "/book/studio",
    "/reserve/cafe",
    "/reserve/cafe/manage/reservation-id",
    "/sites/cafe/reserve",
  ])("does not bootstrap business identity on %s", (pathname) => {
    expect(isClientAreaPathname(pathname)).toBe(true);
  });

  it.each([
    "/onboarding",
    "/hospitality/setup",
    "/hospitality",
    "/beauty",
    "/login",
    "/signup",
    "/invites/token",
    "/accounting",
    "/reservation-settings",
  ])("keeps business synchronization available on %s", (pathname) => {
    expect(isClientAreaPathname(pathname)).toBe(false);
  });
});
