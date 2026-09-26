import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import proxy from "../../proxy";
import { authDestination } from "../../lib/auth-destination";
import { upgradeDestination } from "../../lib/upgrade";

describe("Pro entry journey", () => {
  it("takes anonymous visitors through email sign-in without losing Pro intent", () => {
    const response = proxy(
      new NextRequest("https://studio.opus.mk/upgrade", {
        headers: { host: "studio.opus.mk" },
      }),
    );
    expect(response.status).toBe(307);
    const login = new URL(response.headers.get("location")!);
    expect(login.pathname).toBe("/login");
    expect(authDestination(login.searchParams.get("callbackUrl")!, false)).toBe(
      "/upgrade",
    );
    expect(
      upgradeDestination({
        hasStudio: false,
        operationalSetupComplete: false,
      }),
    ).toBe("/onboarding?plan=pro");
  });

  it("keeps the plan when an onboarding page reload requires reauthentication", () => {
    const response = proxy(
      new NextRequest("https://studio.opus.mk/onboarding?plan=pro", {
        headers: { host: "studio.opus.mk" },
      }),
    );
    const login = new URL(response.headers.get("location")!);
    const callback = login.searchParams.get("callbackUrl")!;
    expect(authDestination(callback, false)).toBe("/onboarding?plan=pro");
    expect(authDestination(callback, true)).toBe("/upgrade");
  });

  it("resumes unfinished studio setup and opens billing once the studio is operational", () => {
    const profile = { hasStudio: true, role: "owner", plan: "free" } as const;
    expect(
      upgradeDestination({ ...profile, operationalSetupComplete: false }),
    ).toBe("/onboarding?plan=pro");
    expect(
      upgradeDestination({ ...profile, operationalSetupComplete: true }),
    ).toBe("/settings?tab=billing");
  });

  it("opens subscription management for existing Pro owners regardless of setup", () => {
    expect(
      upgradeDestination({
        hasStudio: true,
        role: "owner",
        plan: "paid",
        operationalSetupComplete: false,
      }),
    ).toBe("/settings?tab=billing");
  });

  it.each(["staff", "manager"] as const)(
    "shows %s the owner-only billing notice instead of owner onboarding",
    (role) => {
      expect(
        upgradeDestination({
          hasStudio: true,
          role,
          plan: "free",
          operationalSetupComplete: false,
        }),
      ).toBe("/settings?tab=billing");
    },
  );

  it("keeps upgrade links on tenant websites inside that tenant", () => {
    const response = proxy(
      new NextRequest("https://studio-luna.opus.mk/upgrade", {
        headers: { host: "studio-luna.opus.mk" },
      }),
    );
    expect(
      new URL(response.headers.get("x-middleware-rewrite")!).pathname,
    ).toBe("/sites/studio-luna/upgrade");
  });
});
