import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getFunctionName } from "convex/server";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { DashboardShell } from "../components/dashboard/DashboardShell";
import BookingsPage from "../app/(dashboard)/beauty/bookings/page";
import { NotificationBell } from "../components/notifications/NotificationBell";
import { StudioSwitcher } from "../components/staff/StudioSwitcher";
import type { Id } from "../convex/_generated/dataModel";
import { SessionRecoveryContext } from "../hooks/use-session-recovery";
import type { SessionStatus } from "../lib/session-recovery";
import { EmailOtpForm } from "../components/auth/EmailOtpForm";
import { UpgradeRedirect } from "../app/upgrade/_components/UpgradeRedirect";
import { OnboardingWizard } from "../app/onboarding/_components/OnboardingWizard";

const state = vi.hoisted(() => ({
  authenticated: true,
  loading: false,
  sessionStatus: "active" as SessionStatus,
  tokenError: false,
  pathname: "/beauty",
  results: new Map<string, unknown>(),
  queries: [] as string[],
}));

vi.mock("convex/react", () => ({
  useConvexAuth: () => ({
    isAuthenticated: state.authenticated,
    isLoading: state.loading,
  }),
  useQuery: (query: Parameters<typeof getFunctionName>[0], args?: unknown) => {
    if (args === "skip") return undefined;
    const name = getFunctionName(query);
    state.queries.push(name);
    return state.results.get(name);
  },
  useMutation: () => vi.fn(),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => state.pathname,
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));
vi.mock("@/components/dashboard-i18n-provider", () => ({
  useDashboardI18n: () => ({ t: (english: string) => english }),
}));
vi.mock("@/components/Logo", () => ({ Logo: () => null }));
vi.mock("@/components/dashboard/DashboardHeader", () => ({
  DashboardHeader: () => null,
}));
vi.mock("@/components/dashboard/WebsiteSetupBanner", () => ({
  WebsiteSetupBanner: () => null,
}));
vi.mock("@/components/dashboard/DashboardAnnouncementCarousel", () => ({
  DashboardAnnouncementCarousel: () => null,
}));
vi.mock("@/components/notifications/BrowserPushSync", () => ({
  BrowserPushSync: () => null,
}));
vi.mock("@/components/bookings/QuickBookingProvider", () => ({
  QuickBookingProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("@/components/staff/PersonalStaffCalendar", () => ({
  PersonalStaffCalendar: () => "My appointments",
}));
vi.mock("@/components/bookings/BookingsSplitView", () => ({
  BookingsSplitView: () => "Team appointments",
}));

beforeEach(() => {
  state.authenticated = true;
  state.loading = false;
  state.sessionStatus = "active";
  state.tokenError = false;
  state.pathname = "/beauty";
  state.results.clear();
  state.queries = [];
  state.results.set("users:getMyProfile", {
    user: { _id: "user" },
    orgId: "org",
    industry: "beauty_wellness",
    bookingAccess: "team",
  });
});

const renderWithSession = (children: ReactNode) =>
  renderToStaticMarkup(
    createElement(
      SessionRecoveryContext.Provider,
      {
        value: {
          status: state.sessionStatus,
          hasTokenError: state.tokenError,
          retry: vi.fn(),
        },
      },
      children,
    ),
  );
const renderShell = (children: ReactNode = "Dashboard content") =>
  renderWithSession(createElement(DashboardShell, null, children));

describe("dashboard loading and access", () => {
  test("renders page content while unrelated settings are still loading", () => {
    expect(renderShell()).toContain("Dashboard content");
  });

  test("waits for authentication and a resolved profile", () => {
    state.loading = true;
    expect(renderShell()).not.toContain("Dashboard content");
    state.loading = false;
    state.results.delete("users:getMyProfile");
    expect(renderShell()).not.toContain("Dashboard content");
  });

  test("does not show protected content to signed-out users or users without a studio", () => {
    state.authenticated = false;
    expect(renderShell()).not.toContain("Dashboard content");
    state.authenticated = true;
    state.results.set("users:getMyProfile", { user: { _id: "user" } });
    expect(renderShell()).not.toContain("Dashboard content");
  });

  test.each(["pending", "unavailable", "active"] as const)(
    "keeps a %s session on the recovery screen without subscribing to private data",
    (status) => {
      state.authenticated = false;
      state.sessionStatus = status;
      const html = renderShell();
      expect(html).toContain(
        status === "pending"
          ? "Restoring your session"
          : "Reconnecting to your session",
      );
      expect(html).not.toContain("Dashboard content");
      expect(state.queries).toEqual([]);
    },
  );

  test("hides protected content immediately when the session ends, even before Convex disconnects", () => {
    state.sessionStatus = "signed-out";
    expect(renderShell()).not.toContain("Dashboard content");
    expect(state.queries).toEqual([]);
  });

  test("keeps personal staff restricted to their permitted routes", () => {
    state.results.set("users:getMyProfile", {
      user: { _id: "user" },
      orgId: "org",
      industry: "beauty_wellness",
      bookingAccess: "own",
    });
    expect(renderShell()).not.toContain("Dashboard content");
    state.pathname = "/beauty/bookings";
    expect(renderShell()).toContain("Dashboard content");
  });

  test.each([
    "/beauty",
    "/beauty/bookings",
    "/settings",
    "/notifications/preferences",
    "/website",
    "/website/editor",
  ])("offers recovery without mounting beauty queries on %s", (pathname) => {
    state.pathname = pathname;
    state.results.set("users:getMyProfile", {
      user: { _id: "user" },
      orgId: "hospitality-org",
      industry: "hospitality",
      bookingAccess: "team",
    });
    const html = renderShell(
      createElement(NotificationBell, {
        orgId: "hospitality-org" as Id<"orgs">,
      }),
    );
    expect(html).toContain("Choose a beauty studio");
    expect(html).toContain("Sign out");
    expect(state.queries).toEqual([
      "users:getMyProfile",
      "users:listMemberships",
    ]);
  });

  test("does not mount beauty content without a confirmed active industry", () => {
    state.results.set("users:getMyProfile", {
      user: { _id: "user" },
      orgId: "org",
    });
    expect(renderShell()).not.toContain("Dashboard content");
  });
});

describe("login session recovery", () => {
  const renderLogin = (purpose: "studio" | "client") =>
    renderWithSession(
      createElement(EmailOtpForm, {
        purpose,
        title: "Sign in",
        description: "Enter your email",
      }),
    );

  test.each(["studio", "client"] as const)(
    "does not flash the %s login form during restoration or a network failure",
    (purpose) => {
      state.authenticated = false;
      for (const status of ["pending", "unavailable", "active"] as const) {
        state.sessionStatus = status;
        const html = renderLogin(purpose);
        expect(html).not.toContain('type="email"');
        expect(html).not.toContain('type="submit"');
        expect(state.queries).toEqual([]);
      }
    },
  );

  test.each(["studio", "client"] as const)(
    "shows the %s login form for a confirmed signed-out session",
    (purpose) => {
      state.authenticated = false;
      state.sessionStatus = "signed-out";
      expect(renderLogin(purpose)).toContain('type="email"');
      expect(state.queries).toEqual([]);
    },
  );

  test("client sign-in never queries studio membership or activation", () => {
    expect(renderLogin("client")).toContain("Opening your appointments");
    expect(state.queries).toEqual([]);
  });

  test("a hospitality session never queries beauty activation on login", () => {
    state.results.set("users:getMyProfile", {
      user: { _id: "user" },
      orgId: "hospitality-org",
      industry: "hospitality",
    });
    expect(renderLogin("studio")).toContain("Opening your studio");
    expect(state.queries).toEqual(["users:getMyProfile"]);
  });
});

describe("setup and upgrade session recovery", () => {
  test.each([UpgradeRedirect, OnboardingWizard])(
    "%s keeps a failed connection in recovery without private queries",
    (Component) => {
      state.authenticated = false;
      state.sessionStatus = "unavailable";
      expect(renderWithSession(createElement(Component))).toContain(
        "Reconnecting to your session",
      );
      expect(state.queries).toEqual([]);
    },
  );
});

describe("studio switching from an unsupported business", () => {
  const renderSwitcher = () =>
    renderToStaticMarkup(
      createElement(StudioSwitcher, {
        orgId: "hospitality-org" as Id<"orgs">,
      }),
    );

  test("offers a single beauty membership when the current business is excluded", () => {
    state.results.set("users:listMemberships", [
      { orgId: "beauty-org", name: "Beauty Studio", role: "owner" },
    ]);
    const html = renderSwitcher();
    expect(html).toContain('aria-label="Switch studio"');
    expect(html).toContain("Choose a studio");
  });

  test("hides the switcher when there is no other active membership", () => {
    expect(renderSwitcher()).toBe("");
    state.results.set("users:listMemberships", []);
    expect(renderSwitcher()).toBe("");
    state.results.set("users:listMemberships", [
      { orgId: "hospitality-org", name: "Restaurant", role: "owner" },
    ]);
    expect(renderSwitcher()).toBe("");
  });
});

describe("booking page loading", () => {
  const renderBookings = () =>
    renderToStaticMarkup(createElement(BookingsPage));

  test("shows personal bookings without waiting for the team directory", () => {
    state.results.set("users:getMyProfile", {
      orgId: "org",
      bookingAccess: "own",
    });
    state.results.set("bookings:listBookingsByOrg", []);
    expect(renderBookings()).toContain("My appointments");
    expect(renderBookings()).not.toContain("Team appointments");
  });

  test("waits for both appointments and staff before rendering the team calendar", () => {
    state.results.set("bookings:listBookingsByOrg", []);
    expect(renderBookings()).toContain("Loading bookings");
    state.results.set("staff:listStaffMembers", []);
    expect(renderBookings()).toContain("Team appointments");
  });
});

test("notification badges wait for saved preferences and respect disabled notifications", () => {
  state.results.set("dashboardNotifications:getUnreadCount", 4);
  state.results.set("dashboardNotifications:list", []);
  const renderBell = () =>
    renderToStaticMarkup(
      createElement(NotificationBell, {
        orgId: "org" as Id<"orgs">,
        placement: "header",
      }),
    );
  expect(renderBell()).not.toContain(">4</span>");
  state.results.set("orgSettings:getOrgSettings", {
    settings: { dashboardNotificationsEnabled: false },
  });
  expect(renderBell()).not.toContain(">4</span>");
  state.results.set("orgSettings:getOrgSettings", {
    settings: { dashboardNotificationsEnabled: true },
  });
  expect(renderBell()).toContain(">4</span>");
});
