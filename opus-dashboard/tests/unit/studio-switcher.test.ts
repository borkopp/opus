import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Id } from "../../convex/_generated/dataModel";
import { StudioSwitcher } from "../../components/staff/StudioSwitcher";

const state = vi.hoisted(() => ({
  memberships: undefined as Array<{ orgId: string; name: string }> | undefined,
}));
vi.mock("convex/react", () => ({ useQuery: () => state.memberships }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("../../components/dashboard-i18n-provider", () => ({
  useDashboardI18n: () => ({ t: (english: string) => english }),
}));

const render = (orgId?: string) =>
  renderToStaticMarkup(
    createElement(StudioSwitcher, { orgId: orgId as Id<"orgs"> | undefined }),
  );
beforeEach(() => {
  state.memberships = undefined;
});

describe("business switcher recovery", () => {
  it("offers the single remaining membership when the active venue is disabled or removed", () => {
    state.memberships = [{ orgId: "beauty-org", name: "Beauty studio" }];
    expect(render("disabled-venue")).toContain('aria-label="Switch business"');
    expect(render("disabled-venue")).toContain("Choose business");
  });
  it("hides when the only membership is already active or none are available", () => {
    expect(render("beauty-org")).toBe("");
    state.memberships = [];
    expect(render("beauty-org")).toBe("");
    state.memberships = [{ orgId: "beauty-org", name: "Beauty studio" }];
    expect(render("beauty-org")).toBe("");
  });
  it("offers available memberships when no active organization is selected", () => {
    state.memberships = [{ orgId: "beauty-org", name: "Beauty studio" }];
    expect(render()).toContain('aria-label="Switch business"');
  });
});
