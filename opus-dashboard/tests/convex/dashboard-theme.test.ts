import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import { api } from "../../convex/_generated/api";
import schema from "../../convex/schema";
import { convexModules } from "../../convex-test.setup";
import { resolveDashboardTheme } from "../../lib/dashboard-theme";

async function setup() {
  const backend = convexTest(schema, convexModules);
  const owner = backend.withIdentity({
    subject: "theme-owner",
    email: "owner@example.com",
  });
  await owner.mutation(api.users.ensureUser);
  const { orgId } = await owner.mutation(api.activation.startBeautyBusiness, {
    name: "Theme Studio",
    category: "hair_salon",
  });
  const colleague = backend.withIdentity({
    subject: "theme-staff",
    email: "staff@example.com",
  });
  const userId = await colleague.mutation(api.users.ensureUser);
  const staffId = await backend.run(async (ctx) => {
    await ctx.db.patch(userId, { activeOrgId: orgId });
    return await ctx.db.insert("staff_members", {
      orgId,
      userId,
      displayName: "Team member",
      specialties: [],
      role: "staff",
      isActive: true,
      isDeleted: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });
  return { backend, owner, colleague, orgId, staffId };
}

describe("personal dashboard themes", () => {
  it("defaults legacy memberships to Clarity and persists a choice across fresh profile reads", async () => {
    const { backend, owner, orgId } = await setup();
    const initial = await owner.query(api.users.getMyProfile);
    expect(initial?.dashboardTheme).toBeUndefined();
    expect(resolveDashboardTheme(initial?.dashboardTheme)).toBe("clarity");

    await owner.mutation(api.users.setDashboardTheme, { theme: "studio" });
    const newSession = backend.withIdentity({
      subject: "theme-owner",
      email: "owner@example.com",
    });
    expect(
      (await newSession.query(api.users.getMyProfile))?.dashboardTheme,
    ).toBe("studio");
    await newSession.mutation(api.users.setDashboardTheme, {
      theme: "clarity",
    });
    expect((await owner.query(api.users.getMyProfile))?.dashboardTheme).toBe(
      "clarity",
    );

    const audits = await backend.run(async (ctx) =>
      (
        await ctx.db
          .query("audit_log")
          .withIndex("by_org", (q) => q.eq("orgId", orgId))
          .collect()
      ).filter((row) => row.action === "staff.dashboard_theme_updated"),
    );
    expect(audits).toHaveLength(2);
    expect(audits[0].after).toEqual({ dashboardTheme: "studio" });
    expect(audits[1].before).toEqual({ dashboardTheme: "studio" });
  });

  it("lets staff choose without changing their colleagues or another business", async () => {
    const { backend, owner, colleague, orgId, staffId } = await setup();
    const other = backend.withIdentity({
      subject: "theme-other",
      email: "other@example.com",
    });
    await other.mutation(api.users.ensureUser);
    await other.mutation(api.activation.startBeautyBusiness, {
      name: "Other Studio",
      category: "nail_salon",
    });
    await colleague.mutation(api.users.setDashboardTheme, { theme: "studio" });
    expect(
      (await colleague.query(api.users.getMyProfile))?.dashboardTheme,
    ).toBe("studio");
    expect(
      (await owner.query(api.users.getMyProfile))?.dashboardTheme,
    ).toBeUndefined();
    expect(
      (await other.query(api.users.getMyProfile))?.dashboardTheme,
    ).toBeUndefined();
    const members = await backend.run((ctx) =>
      ctx.db
        .query("staff_members")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .collect(),
    );
    expect(
      members
        .filter((member) => member.dashboardTheme === "studio")
        .map((member) => member._id),
    ).toEqual([staffId]);
  });

  it("records an explicit default choice for onboarding and avoids duplicate audit writes", async () => {
    const { backend, owner, orgId } = await setup();
    await owner.mutation(api.users.setDashboardTheme, { theme: "clarity" });
    await owner.mutation(api.users.setDashboardTheme, { theme: "clarity" });
    expect((await owner.query(api.users.getMyProfile))?.dashboardTheme).toBe(
      "clarity",
    );
    const audits = await backend.run((ctx) =>
      ctx.db
        .query("audit_log")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .collect(),
    );
    expect(
      audits.filter((row) => row.action === "staff.dashboard_theme_updated"),
    ).toHaveLength(1);
  });

  it("rejects unauthenticated, unassigned, and inactive staff", async () => {
    const { backend, colleague, staffId } = await setup();
    await expect(
      backend.mutation(api.users.setDashboardTheme, { theme: "studio" }),
    ).rejects.toThrow("Unauthenticated");
    const unassigned = backend.withIdentity({
      subject: "no-org",
      email: "no-org@example.com",
    });
    await unassigned.mutation(api.users.ensureUser);
    await expect(
      unassigned.mutation(api.users.setDashboardTheme, { theme: "studio" }),
    ).rejects.toThrow("No active business");
    await backend.run((ctx) => ctx.db.patch(staffId, { isActive: false }));
    await expect(
      colleague.mutation(api.users.setDashboardTheme, { theme: "studio" }),
    ).rejects.toThrow("Unauthorised");
  });

  it("validates theme values and refuses client-supplied staff or tenant IDs", async () => {
    const { owner, orgId, staffId } = await setup();
    // Deliberately exercise untyped client payloads at the validator boundary.
    // @ts-expect-error unsupported theme
    const invalidTheme: "clarity" | "studio" = "dark";
    await expect(
      owner.mutation(api.users.setDashboardTheme, { theme: invalidTheme }),
    ).rejects.toThrow();
    const tenantPayload = { theme: "studio" as const, orgId };
    await expect(
      owner.mutation(api.users.setDashboardTheme, tenantPayload),
    ).rejects.toThrow();
    const staffPayload = { theme: "studio" as const, staffId };
    await expect(
      owner.mutation(api.users.setDashboardTheme, staffPayload),
    ).rejects.toThrow();
  });
});
