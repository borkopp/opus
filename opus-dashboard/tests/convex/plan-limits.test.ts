import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { convexModules } from "../../convex-test.setup";
import { PRO_TEAM_TIERS, type ProTeamLimit } from "../../../shared/pro-pricing";

const backend = () => convexTest(schema, convexModules);
type Backend = ReturnType<typeof backend>;

async function studio(
  t: Backend,
  plan: "free" | "paid",
  name = "Luna",
  teamLimit?: ProTeamLimit,
) {
  const owner = t.withIdentity({ subject: name, email: `${name}@example.com` });
  await owner.mutation(api.users.ensureUser);
  const { orgId } = await owner.mutation(api.activation.startBeautyBusiness, {
    name,
    category: "nail_salon",
  });
  await t.run(async (ctx) => {
    await ctx.db.patch(orgId, { plan });
    if (teamLimit)
      await ctx.db.insert("billing_accounts", {
        orgId,
        externalCustomerId: `opus:${orgId}`,
        environment: "sandbox",
        productId: `pro-${teamLimit}`,
        managed: true,
        hasOpenSubscription: true,
        syncVersion: 1,
        syncedVersion: 1,
        isDeleted: false,
        subscription: {
          id: `subscription-${teamLimit}`,
          status: "active",
          teamLimit,
          productId: `pro-${teamLimit}`,
          amount: PRO_TEAM_TIERS.find((tier) => tier.teamLimit === teamLimit)!
            .monthlyPriceMinorUnits,
          currency: "mkd",
          interval: "month",
          intervalCount: 1,
          currentPeriodEnd: Date.now() + 30 * 86400_000,
          cancelAtPeriodEnd: false,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
  });
  return {
    owner,
    orgId,
    addPhoto: (index: number, type: "gallery" | "cover" = "gallery") =>
      owner.mutation(api.orgMedia.addMedia, {
        orgId,
        url: `https://example.com/${name}/${index}.jpg`,
        type,
        sortOrder: index,
      }),
    addStaff: (index: number, role: "owner" | "manager" | "staff" = "staff") =>
      owner.mutation(api.staff.createStaffMember, {
        orgId,
        displayName: `Member ${index}`,
        role,
        specialties: [],
      }),
  };
}

describe("studio plan limits", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  test.each([
    { plan: "free" as const, limit: 3 },
    { plan: "paid" as const, limit: 15 },
  ])(
    "$plan permits $limit active gallery photos and replacement after removal",
    async ({ plan, limit }) => {
      const t = backend();
      const s = await studio(t, plan);
      await s.addPhoto(0, "cover");
      const ids: Id<"org_media">[] = [];
      for (let i = 1; i <= limit; i++) ids.push(await s.addPhoto(i));
      await expect(s.addPhoto(limit + 1)).rejects.toThrow(
        `Maximum of ${limit}`,
      );
      const settings = await s.owner.query(api.orgSettings.getOrgSettings, {
        orgId: s.orgId,
      });
      expect(settings?.galleryPhotoLimit).toBe(limit);
      expect(
        settings?.media.filter((item) => item.type === "gallery"),
      ).toHaveLength(limit);
      await s.owner.mutation(api.orgMedia.removeMedia, {
        orgId: s.orgId,
        mediaId: ids[0],
      });
      await s.addPhoto(limit + 2);
      expect(await t.run((ctx) => ctx.db.get(ids[0]))).toMatchObject({
        isDeleted: true,
      });
      const media = await s.owner.query(api.orgMedia.listByOrg, {
        orgId: s.orgId,
      });
      expect(media.filter((item) => item.type === "gallery")).toHaveLength(
        limit,
      );
    },
  );

  test("gallery capacity follows upgrades and downgrades without deleting existing photos", async () => {
    const t = backend();
    const s = await studio(t, "free");
    for (let i = 0; i < 3; i++) await s.addPhoto(i);
    await t.run((ctx) => ctx.db.patch(s.orgId, { plan: "paid" }));
    await s.addPhoto(3);
    await t.run((ctx) => ctx.db.patch(s.orgId, { plan: "free" }));
    await expect(s.addPhoto(4)).rejects.toThrow("Maximum of 3");
    const settings = await s.owner.query(api.orgSettings.getOrgSettings, {
      orgId: s.orgId,
    });
    expect(settings?.galleryPhotoLimit).toBe(3);
    expect(settings?.media).toHaveLength(4);
  });

  test.each([
    { plan: "free" as const, limit: 3 },
    { plan: "paid" as const, limit: 15 },
  ])(
    "storefront uploads use the same $plan gallery limit",
    async ({ plan, limit }) => {
      const t = backend();
      const s = await studio(t, plan);
      const galleryStorageIds = await t.run(async (ctx) => {
        const ids = [];
        for (let i = 0; i <= limit; i++)
          ids.push(
            await ctx.storage.store(
              new Blob([`photo-${i}`], { type: "image/png" }),
            ),
          );
        return ids;
      });
      await s.owner.mutation(api.activation.saveStorefront, {
        galleryStorageIds,
      });
      const media = await s.owner.query(api.orgMedia.listByOrg, {
        orgId: s.orgId,
      });
      expect(media.filter((item) => item.type === "gallery")).toHaveLength(
        limit,
      );
    },
  );

  test("Free retains one owner and three staff, including managers", async () => {
    const t = backend();
    const s = await studio(t, "free");
    await expect(s.addStaff(1, "owner")).rejects.toThrow("FREE_STAFF_LIMIT");
    await s.addStaff(1, "manager");
    await s.addStaff(2);
    const last = await s.addStaff(3);
    await expect(s.addStaff(4)).rejects.toThrow("FREE_STAFF_LIMIT");
    expect(await s.owner.query(api.staff.getStaffPlanStatus, {})).toMatchObject(
      {
        totalCount: 4,
        totalLimit: 4,
        canUseStaffRole: false,
        canUseOwnerRole: false,
      },
    );
    await s.owner.mutation(api.staff.updateStaffMember, {
      orgId: s.orgId,
      staffId: last,
      isActive: false,
    });
    await s.addStaff(4);
    await expect(
      s.owner.mutation(api.staff.updateStaffMember, {
        orgId: s.orgId,
        staffId: last,
        isActive: true,
      }),
    ).rejects.toThrow("FREE_STAFF_LIMIT");
  });

  test.each(PRO_TEAM_TIERS)(
    "Pro $teamLimit counts all roles and blocks creation and reactivation at capacity",
    async ({ teamLimit }) => {
      const t = backend();
      const s = await studio(t, "paid", "Luna", teamLimit);
      await s.addStaff(1, "owner");
      await s.addStaff(2, "manager");
      const ids = [];
      for (let i = 3; i < teamLimit; i++) ids.push(await s.addStaff(i));
      expect(
        await s.owner.query(api.staff.getStaffPlanStatus, {}),
      ).toMatchObject({
        totalCount: teamLimit,
        totalLimit: teamLimit,
        canUseStaffRole: false,
        canUseOwnerRole: false,
      });
      for (const role of ["staff", "manager", "owner"] as const) {
        await expect(s.addStaff(teamLimit, role)).rejects.toThrow(
          "PRO_STAFF_LIMIT",
        );
      }
      await s.owner.mutation(api.staff.updateStaffMember, {
        orgId: s.orgId,
        staffId: ids[0],
        role: "manager",
        displayName: "Edited at capacity",
      });
      expect(
        await s.owner.query(api.staff.getStaffPlanStatus, { staffId: ids[0] }),
      ).toMatchObject({ canUseStaffRole: true, canUseOwnerRole: true });
      await s.owner.mutation(api.staff.updateStaffMember, {
        orgId: s.orgId,
        staffId: ids[0],
        isActive: false,
      });
      const replacement = await s.addStaff(teamLimit);
      await expect(
        s.owner.mutation(api.staff.updateStaffMember, {
          orgId: s.orgId,
          staffId: ids[0],
          isActive: true,
        }),
      ).rejects.toThrow("PRO_STAFF_LIMIT");
      await s.owner.mutation(api.staff.updateStaffMember, {
        orgId: s.orgId,
        staffId: replacement,
        isActive: false,
      });
      await s.owner.mutation(api.staff.updateStaffMember, {
        orgId: s.orgId,
        staffId: ids[0],
        isActive: true,
      });
    },
  );

  test("a package downgrade keeps team history and permits edits and reductions until the team fits", async () => {
    const t = backend();
    const s = await studio(t, "paid", "Luna", 8);
    const ids = [];
    for (let i = 1; i < 8; i++) ids.push(await s.addStaff(i));
    await t.run(async (ctx) => {
      const account = await ctx.db
        .query("billing_accounts")
        .withIndex("by_org", (q) => q.eq("orgId", s.orgId))
        .unique();
      await ctx.db.patch(account!._id, {
        subscription: { ...account!.subscription!, teamLimit: 4 },
      });
    });
    expect(await s.owner.query(api.staff.getStaffPlanStatus, {})).toMatchObject(
      { totalLimit: 4, totalCount: 8 },
    );
    await expect(s.addStaff(8)).rejects.toThrow("PRO_STAFF_LIMIT");
    await s.owner.mutation(api.staff.updateStaffMember, {
      orgId: s.orgId,
      staffId: ids[0],
      role: "manager",
      displayName: "Still editable",
    });
    for (const staffId of ids.slice(0, 5)) {
      await s.owner.mutation(api.staff.updateStaffMember, {
        orgId: s.orgId,
        staffId,
        isActive: false,
      });
    }
    await s.addStaff(8);
    expect(await s.owner.query(api.staff.getStaffPlanStatus, {})).toMatchObject(
      { totalLimit: 4, totalCount: 4 },
    );
    const stored = await s.owner.query(api.staff.listStaffMembers, {
      orgId: s.orgId,
    });
    expect(stored).toHaveLength(9);
  });

  test("legacy Pro teams above 12 may edit and reduce usage, but cannot grow", async () => {
    const t = backend();
    const s = await studio(t, "paid");
    const ids = await t.run(async (ctx) => {
      const ids = [];
      for (let i = 0; i < 12; i++)
        ids.push(
          await ctx.db.insert("staff_members", {
            orgId: s.orgId,
            displayName: `Legacy ${i}`,
            role: "staff",
            specialties: [],
            isActive: true,
            isDeleted: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }),
        );
      return ids;
    });
    await expect(s.addStaff(13)).rejects.toThrow("PRO_STAFF_LIMIT");
    await s.owner.mutation(api.staff.updateStaffMember, {
      orgId: s.orgId,
      staffId: ids[0],
      role: "manager",
      displayName: "Updated",
    });
    await s.owner.mutation(api.staff.updateStaffMember, {
      orgId: s.orgId,
      staffId: ids[0],
      isActive: false,
    });
    await expect(s.addStaff(13)).rejects.toThrow("PRO_STAFF_LIMIT");
    await s.owner.mutation(api.staff.updateStaffMember, {
      orgId: s.orgId,
      staffId: ids[1],
      isActive: false,
    });
    await s.addStaff(13);
    await t.run((ctx) => ctx.db.patch(s.orgId, { plan: "free" }));
    await expect(s.addStaff(14)).rejects.toThrow("FREE_STAFF_LIMIT");
    await s.owner.mutation(api.staff.updateStaffMember, {
      orgId: s.orgId,
      staffId: ids[2],
      displayName: "Still editable",
    });
  });

  test("capacity is tenant scoped and cannot be borrowed from a Pro studio", async () => {
    const t = backend();
    const free = await studio(t, "free", "Free");
    const pro = await studio(t, "paid", "Pro");
    for (let i = 0; i < 3; i++) await free.addPhoto(i);
    await pro.addPhoto(0);
    await expect(
      free.owner.mutation(api.orgMedia.addMedia, {
        orgId: pro.orgId,
        url: "https://example.com/foreign.jpg",
        type: "gallery",
        sortOrder: 1,
      }),
    ).rejects.toThrow();
    await expect(
      free.owner.mutation(api.staff.createStaffMember, {
        orgId: pro.orgId,
        displayName: "Foreign",
        role: "staff",
        specialties: [],
      }),
    ).rejects.toThrow();
    await expect(free.addPhoto(3)).rejects.toThrow("Maximum of 3");
  });
});
