import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { TrialAccessNotice } from "../../components/billing/TrialAccessNotice";
import { BillingPlanSummary } from "../../app/(dashboard)/(shared)/settings/_components/tabs/BillingPlanSummary";
import { StaffPlanFooter } from "../../app/(dashboard)/beauty/services/_components/StaffPlanFooter";

const staffPlan = vi.hoisted(() => ({
  accessState: "expired",
  isFree: false,
  totalCount: 1,
  totalLimit: 12,
  canUseStaffRole: false,
}));

vi.mock("convex/react", () => ({
  useQuery: () => staffPlan,
}));

vi.mock("@/components/dashboard-i18n-provider", () => ({
  useDashboardI18n: () => ({
    t: (english: string) => english,
    locale: "en-GB",
  }),
}));
vi.mock("next/font/google", () => ({
  Audiowide: () => ({ className: "test-font" }),
}));

const trialEndsAt = Date.UTC(2026, 11, 24, 10);
const freeStatus: Parameters<typeof BillingPlanSummary>[0]["data"] = {
  plan: "free",
  effectivePlan: "free",
  hasPaidAccess: false,
  accessState: "legacy_free",
  trialEndsAt: null,
  canManage: true,
  checkoutAvailable: false,
  teamCount: 1,
  teamLimit: 4,
  recommendedTeamLimit: 1,
  tiers: [],
  portalAvailable: false,
  managed: false,
  subscription: null,
  hasOpenSubscription: false,
  syncing: false,
  syncFailed: false,
  lastSyncedAt: null,
};

describe("trial billing UI", () => {
  it("explains expired staff capacity without calling it a full paid plan", () => {
    const html = renderToStaticMarkup(createElement(StaffPlanFooter));
    expect(html).toContain("Trial ended");
    expect(html).toContain("Subscribe before adding or reactivating");
    expect(html).toContain("edit existing profiles");
    expect(html).not.toContain("Team limit reached");
    expect(html).not.toContain("Pro ·");
  });
  it.each(["legacy_free", "paid"] as const)(
    "shows no trial announcement for %s studios",
    (accessState) => {
      expect(
        renderToStaticMarkup(
          createElement(TrialAccessNotice, {
            accessState,
            trialEndsAt,
            canManage: true,
          }),
        ),
      ).toBe("");
    },
  );

  it("shows a dated trial and subscription link without claiming payment", () => {
    const html = renderToStaticMarkup(
      createElement(TrialAccessNotice, {
        accessState: "trial",
        trialEndsAt,
        canManage: true,
      }),
    );
    expect(html).toContain("24 Dec 2026");
    expect(html).toContain("Your trial includes paid features");
    expect(html).not.toContain("will not be charged automatically");
    expect(html).toContain('href="/settings?tab=billing"');
  });

  it("keeps expired staff informed without offering an owner-only billing link", () => {
    const html = renderToStaticMarkup(
      createElement(TrialAccessNotice, {
        accessState: "expired",
        trialEndsAt,
        canManage: false,
      }),
    );
    expect(html).toContain("Your existing appointments and data are kept");
    expect(html).toContain("Contact your studio owner");
    expect(html).not.toContain('href="/settings?tab=billing"');
  });

  it("does not label trial access as a paid subscription", () => {
    const html = renderToStaticMarkup(
      createElement(BillingPlanSummary, {
        currency: "mkd",
        data: {
          ...freeStatus,
          accessState: "trial",
          effectivePlan: "paid",
          hasPaidAccess: true,
          trialEndsAt,
        },
      }),
    );
    expect(html).toContain("During your trial");
    expect(html).toContain("24 Dec 2026");
    expect(html).not.toContain("Pro enabled");
    expect(html).not.toContain("OPUS Free");
  });

  it("preserves a manually granted paid plan without online subscription", () => {
    const html = renderToStaticMarkup(
      createElement(BillingPlanSummary, {
        currency: "mkd",
        data: {
          ...freeStatus,
          plan: "paid",
          effectivePlan: "paid",
          hasPaidAccess: true,
          accessState: "paid",
          teamLimit: 12,
        },
      }),
    );
    expect(html).toContain("Pro enabled");
    expect(html).toContain("No online subscription");
    expect(html).not.toContain("Trial ends");
  });
});
