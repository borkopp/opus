import { beforeEach, describe, expect, it, vi } from "vitest";
import { getFunctionName } from "convex/server";
import Login from "../../app/login/[[...rest]]/page";

const state = vi.hoisted(() => ({
  token: "remembered" as string | undefined,
  profile: {
    orgId: "studio",
    industry: "beauty_wellness",
    bookingAccess: "team",
  } as Record<string, unknown> | null,
  onboardingComplete: true,
  queries: [] as string[],
  failed: false,
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));
vi.mock("@/lib/i18n/server", () => ({ getRequestLocale: async () => "en" }));
vi.mock("@/components/auth/EmailOtpForm", () => ({ EmailOtpForm: () => null }));
vi.mock("@/components/auth/AuthLayout", () => ({ AuthLayout: () => null }));
vi.mock("@/lib/auth-server", () => ({
  getInitialAuthToken: async () => state.token,
  fetchAuthQuery: async (query: Parameters<typeof getFunctionName>[0]) => {
    const name = getFunctionName(query);
    state.queries.push(name);
    if (state.failed) throw new Error("Temporary outage");
    return name === "users:getMyProfile"
      ? state.profile
      : { onboardingComplete: state.onboardingComplete };
  },
}));

beforeEach(() => {
  state.token = "remembered";
  state.profile = {
    orgId: "studio",
    industry: "beauty_wellness",
    bookingAccess: "team",
  };
  state.onboardingComplete = true;
  state.queries = [];
  state.failed = false;
});
const login = (callbackUrl?: string) =>
  Login({ searchParams: Promise.resolve({ callbackUrl }) });

describe("returning users arriving at login", () => {
  it("redirects completed studios before rendering login", async () => {
    await expect(login()).rejects.toThrow("redirect:/beauty");
  });
  it("retains the calendar date and Pro intent", async () => {
    await expect(login("/beauty/bookings?date=2026-10-17")).rejects.toThrow(
      "redirect:/beauty/bookings?date=2026-10-17",
    );
    await expect(login("/onboarding?plan=pro")).rejects.toThrow(
      "redirect:/upgrade",
    );
  });
  it("keeps unfinished studios in onboarding", async () => {
    state.onboardingComplete = false;
    await expect(login()).rejects.toThrow("redirect:/onboarding");
    state.profile = {};
    await expect(login()).rejects.toThrow("redirect:/onboarding");
  });
  it.each([
    { orgId: "studio", industry: "beauty_wellness", bookingAccess: "own" },
    { orgId: "restaurant", industry: "hospitality", bookingAccess: "team" },
  ])(
    "does not call beauty activation for a restricted membership",
    async (profile) => {
      state.profile = profile;
      await expect(login()).rejects.toThrow("redirect:/beauty");
      expect(state.queries).toEqual(["users:getMyProfile"]);
    },
  );
  it("routes booking callbacks to client sign-in before any studio queries", async () => {
    await expect(login("/book/sample-studio")).rejects.toThrow(
      "redirect:/account/sign-in?callbackUrl=",
    );
    expect(state.queries).toEqual([]);
  });
  it("allows login for a genuinely signed-out session", async () => {
    state.token = undefined;
    await expect(login()).resolves.toBeDefined();
    expect(state.queries).toEqual([]);
  });
  it("falls back to client recovery if the backend is temporarily unavailable", async () => {
    state.failed = true;
    await expect(login()).resolves.toBeDefined();
  });
});
