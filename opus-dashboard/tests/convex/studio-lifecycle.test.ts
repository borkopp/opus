import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import { api } from "../../convex/_generated/api";
import schema from "../../convex/schema";
import { convexModules } from "../../convex-test.setup";

const createBackend = () => convexTest(schema, convexModules);
type Backend = ReturnType<typeof createBackend>;

async function studio(t: Backend, subject = "owner") {
  const owner = t.withIdentity({ subject, email: `${subject}@example.com` });
  const userId = await owner.mutation(api.users.ensureUser);
  const { orgId } = await owner.mutation(api.activation.startBeautyBusiness, {
    name: `${subject} studio`,
    category: "hair_salon",
  });
  const profile = await owner.query(api.users.getMyProfile);
  return { owner, userId, orgId, staffId: profile!.staffId! };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe("studio membership lifecycle", () => {
  it.each(["unlinked", "inactive", "deleted"] as const)(
    "lets a user with only a %s membership start a new studio",
    async (state) => {
      const t = createBackend();
      const s = await studio(t);
      await t.run(async (ctx) => {
        await ctx.db.patch(
          s.staffId,
          state === "unlinked"
            ? { userId: undefined }
            : state === "inactive"
              ? { isActive: false }
              : { isDeleted: true },
        );
      });
      expect(
        (await s.owner.query(api.users.getMyProfile))?.orgId,
      ).toBeUndefined();
      const created = await s.owner.mutation(
        api.activation.startBeautyBusiness,
        {
          name: "New independent studio",
          category: "barbershop",
        },
      );
      expect(created.created).toBe(true);
      expect(created.orgId).not.toBe(s.orgId);
      expect((await s.owner.query(api.users.getMyProfile))?.orgId).toBe(
        created.orgId,
      );
      expect((await t.run((ctx) => ctx.db.get(s.orgId)))?.name).toBe(
        "owner studio",
      );
    },
  );

  it("resumes the live owner membership after access to the preferred studio is revoked", async () => {
    const t = createBackend();
    const first = await studio(t, "first");
    const second = await studio(t, "second");
    await t.run(async (ctx) => {
      await ctx.db.patch(first.userId, { activeOrgId: second.orgId });
    });
    expect((await first.owner.query(api.users.getMyProfile))?.orgId).toBe(
      first.orgId,
    );
    expect(
      await first.owner.mutation(api.activation.startBeautyBusiness, {
        name: "First studio resumed",
      }),
    ).toEqual({ orgId: first.orgId, created: false });
    expect((await t.run((ctx) => ctx.db.get(second.orgId)))?.name).toBe(
      "second studio",
    );
  });

  it.each(["unlinked", "deleted-account"] as const)(
    "prevents the only signed-in owner from leaving a %s owner seat in charge",
    async (state) => {
      const t = createBackend();
      const s = await studio(t);
      await t.run((ctx) => ctx.db.patch(s.orgId, { plan: "paid" }));
      const spareStaffId = await s.owner.mutation(api.staff.createStaffMember, {
        orgId: s.orgId,
        displayName: "Unaccepted co-owner",
        role: "owner",
        specialties: [],
      });
      if (state === "deleted-account")
        await t.run(async (ctx) => {
          const deletedUserId = await ctx.db.insert("users", {
            authUserId: "deleted-owner",
            name: "Deleted owner",
            email: "deleted@example.com",
            isDeleted: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
          await ctx.db.patch(spareStaffId, { userId: deletedUserId });
        });
      for (const change of [
        { role: "manager" as const },
        { isActive: false },
      ]) {
        await expect(
          s.owner.mutation(api.staff.updateStaffMember, {
            orgId: s.orgId,
            staffId: s.staffId,
            ...change,
          }),
        ).rejects.toThrow("must keep at least one active owner");
      }
      expect((await s.owner.query(api.users.getMyProfile))?.role).toBe("owner");
    },
  );

  it("allows ownership to pass to another active linked owner", async () => {
    const t = createBackend();
    const s = await studio(t);
    const successor = t.withIdentity({
      subject: "successor",
      email: "successor@example.com",
    });
    const successorUserId = await successor.mutation(api.users.ensureUser);
    await t.run(async (ctx) => {
      await ctx.db.patch(s.orgId, { plan: "paid" });
      await ctx.db.insert("staff_members", {
        orgId: s.orgId,
        userId: successorUserId,
        displayName: "Successor",
        role: "owner",
        specialties: [],
        isActive: true,
        isDeleted: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });
    await s.owner.mutation(api.staff.updateStaffMember, {
      orgId: s.orgId,
      staffId: s.staffId,
      role: "manager",
    });
    expect((await successor.query(api.users.getMyProfile))?.role).toBe("owner");
    expect((await s.owner.query(api.users.getMyProfile))?.role).toBe("manager");
  });

  it("can switch back after accepting a new seat following a soft-deleted membership", async () => {
    const t = createBackend();
    const first = await studio(t, "first");
    const second = await studio(t, "second");
    await t.run(async (ctx) => {
      await ctx.db.patch(second.orgId, { plan: "paid" });
      await ctx.db.insert("staff_members", {
        orgId: second.orgId,
        userId: first.userId,
        displayName: "Old seat",
        role: "staff",
        specialties: [],
        isActive: false,
        isDeleted: true,
        deletedAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });
    const staffId = await second.owner.mutation(api.staff.createStaffMember, {
      orgId: second.orgId,
      displayName: "New seat",
      role: "staff",
      specialties: [],
    });
    const inviteId = await second.owner.mutation(api.staff.inviteStaffMember, {
      orgId: second.orgId,
      staffId,
      email: "first@example.com",
    });
    const invite = await t.run((ctx) => ctx.db.get(inviteId));
    await first.owner.mutation(api.staff.acceptStaffInvite, {
      token: invite!.token,
    });
    await first.owner.mutation(api.users.switchOrg, { orgId: first.orgId });
    await first.owner.mutation(api.users.switchOrg, { orgId: second.orgId });
    expect(await first.owner.query(api.users.getMyProfile)).toMatchObject({
      orgId: second.orgId,
      staffId,
      bookingAccess: "own",
    });
  });
});

describe("website readiness after onboarding", () => {
  async function bookableTeam(t: Backend) {
    const s = await studio(t);
    await s.owner.mutation(api.activation.saveOwnerName, {
      name: "Studio Owner",
    });
    await s.owner.mutation(api.activation.saveLocation, {
      address: "Macedonia 12",
      city: "Skopje",
      country: "MK",
      coordinates: { lat: 41.99, lng: 21.43 },
    });
    const serviceId = await s.owner.mutation(api.activation.saveFirstService, {
      name: "Haircut",
      durationMins: 30,
      priceMinorUnits: 1800,
    });
    await s.owner.mutation(api.activation.saveHours, {
      openingHours: Array.from({ length: 7 }, (_, dayOfWeek) => ({
        dayOfWeek,
        open: "09:00",
        close: "17:00",
        isClosed: false,
      })),
    });
    const specialistId = await s.owner.mutation(api.staff.createStaffMember, {
      orgId: s.orgId,
      displayName: "Specialist",
      role: "staff",
      specialties: [],
    });
    await s.owner.mutation(api.availability.setAvailabilityRule, {
      orgId: s.orgId,
      staffId: specialistId,
      dayOfWeek: 1,
      startTime: "09:00",
      endTime: "17:00",
      isActive: true,
    });
    await s.owner.mutation(api.website.publish, {});
    return { ...s, serviceId, specialistId };
  }

  it("keeps a website available when its owner stops taking appointments but a specialist remains bookable", async () => {
    const t = createBackend();
    const s = await bookableTeam(t);
    await s.owner.mutation(api.services.updateService, {
      orgId: s.orgId,
      serviceId: s.serviceId,
      staffIds: [s.specialistId],
    });
    expect(await s.owner.query(api.activation.getState)).toMatchObject({
      allWebsiteRequirementsComplete: true,
      onboardingComplete: true,
    });
    expect(
      await t.query(api.publicSite.getBySlug, { slug: "owner-studio" }),
    ).not.toBeNull();
    expect((await t.run((ctx) => ctx.db.get(s.orgId)))?.websiteStatus).toBe(
      "published",
    );

    await s.owner.mutation(api.staff.updateStaffMember, {
      orgId: s.orgId,
      staffId: s.specialistId,
      isActive: false,
    });
    expect((await t.run((ctx) => ctx.db.get(s.orgId)))?.websiteStatus).toBe(
      "suspended",
    );
    expect(
      await t.query(api.publicSite.getBySlug, { slug: "owner-studio" }),
    ).toBeNull();
  });

  it("keeps a sole 35-minute service publishable on a 15-minute start interval", async () => {
    const t = createBackend();
    const s = await bookableTeam(t);
    // Retained catalogues can contain durations that are not multiples of the
    // start interval. The public engine supports their exact occupied time.
    await t.run((ctx) => ctx.db.patch(s.serviceId, { durationMins: 35 }));
    const date = new Date(Date.now() + 7 * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const slots = await t.query(api.publicBooking.getPublicSlots, {
      orgId: s.orgId,
      staffId: s.staffId,
      serviceId: s.serviceId,
      date,
    });
    expect(slots.length).toBeGreaterThan(1);
    expect(slots[1].startAt - slots[0].startAt).toBe(15 * 60_000);
    const client = t.withIdentity({
      subject: "uneven-duration-client",
      email: "duration@example.com",
      emailVerified: true,
    });
    const result = await client.mutation(
      api.publicBooking.createPublicBooking,
      {
        orgId: s.orgId,
        staffId: s.staffId,
        serviceId: s.serviceId,
        startAt: slots[0].startAt,
        customerName: "Duration Client",
      },
    );
    const booking = await t.run((ctx) => ctx.db.get(result.bookingId));
    expect(booking!.endAt - booking!.startAt).toBe(35 * 60_000);
    expect(
      (await s.owner.query(api.activation.getState))
        ?.allWebsiteRequirementsComplete,
    ).toBe(true);
    await s.owner.mutation(api.website.publish, {});
    expect(
      await t.query(api.publicSite.getBySlug, { slug: "owner-studio" }),
    ).not.toBeNull();
  });

  it.each([
    {
      name: "a full-window break",
      durationMins: 30,
      bufferTimeMins: 0,
      breaks: [{ startTime: "09:00", endTime: "10:00" }],
      ready: false,
    },
    {
      name: "insufficient closing buffer",
      durationMins: 60,
      bufferTimeMins: 15,
      breaks: [],
      ready: false,
    },
    {
      name: "a free interval with no aligned start",
      durationMins: 30,
      bufferTimeMins: 0,
      breaks: [
        { startTime: "09:00", endTime: "09:01" },
        { startTime: "09:31", endTime: "10:00" },
      ],
      ready: false,
    },
    {
      name: "an exact fit including closing buffer",
      durationMins: 45,
      bufferTimeMins: 15,
      breaks: [],
      ready: true,
    },
    {
      name: "an exact fit after a break",
      durationMins: 30,
      bufferTimeMins: 15,
      breaks: [{ startTime: "09:00", endTime: "09:15" }],
      ready: true,
    },
  ])(
    "matches actual slots for $name",
    async ({ durationMins, bufferTimeMins, breaks, ready }) => {
      const t = createBackend();
      const s = await bookableTeam(t);
      await t.run(async (ctx) => {
        await ctx.db.patch(s.serviceId, { durationMins });
        await ctx.db.patch(s.orgId, {
          openingHours: Array.from({ length: 7 }, (_, dayOfWeek) => ({
            dayOfWeek,
            open: "09:00",
            close: "10:00",
            isClosed: false,
          })),
        });
        const settings = await ctx.db
          .query("org_settings")
          .withIndex("by_org", (q) => q.eq("orgId", s.orgId))
          .first();
        await ctx.db.patch(settings!._id, { bufferTimeMins });
        const rules = await ctx.db
          .query("availability_rules")
          .withIndex("by_org_staff_day_active", (q) =>
            q.eq("orgId", s.orgId).eq("staffId", s.staffId),
          )
          .collect();
        for (const rule of rules)
          await ctx.db.patch(rule._id, {
            startTime: "09:00",
            endTime: "10:00",
            breaks,
          });
      });
      const date = new Date(Date.now() + 7 * 86_400_000)
        .toISOString()
        .slice(0, 10);
      const slots = await t.query(api.publicBooking.getPublicSlots, {
        orgId: s.orgId,
        staffId: s.staffId,
        serviceId: s.serviceId,
        date,
      });
      expect(slots.length > 0).toBe(ready);
      const state = await s.owner.query(api.activation.getState);
      expect(
        state?.requirements.find((item) => item.code === "availability")
          ?.complete,
      ).toBe(ready);
      expect(state?.allWebsiteRequirementsComplete).toBe(ready);
      if (ready) await s.owner.mutation(api.website.publish, {});
      else
        await expect(s.owner.mutation(api.website.publish, {})).rejects.toThrow(
          "Bookable hours",
        );
    },
  );

  it.each(["owner-confirmation", "inactive-service", "outside-hours"] as const)(
    "does not count an alternate provider as ready with %s missing",
    async (missing) => {
      const t = createBackend();
      const s = await bookableTeam(t);
      await s.owner.mutation(api.services.updateService, {
        orgId: s.orgId,
        serviceId: s.serviceId,
        staffIds: [s.specialistId],
      });
      if (missing === "owner-confirmation")
        await t.run((ctx) =>
          ctx.db.patch(s.orgId, { ownerNameConfirmed: false }),
        );
      if (missing === "inactive-service")
        await s.owner.mutation(api.services.updateService, {
          orgId: s.orgId,
          serviceId: s.serviceId,
          isActive: false,
        });
      if (missing === "outside-hours")
        await s.owner.mutation(api.availability.setAvailabilityRule, {
          orgId: s.orgId,
          staffId: s.specialistId,
          dayOfWeek: 1,
          startTime: "18:00",
          endTime: "20:00",
          isActive: true,
        });
      expect(
        (await s.owner.query(api.activation.getState))
          ?.allWebsiteRequirementsComplete,
      ).toBe(false);
      expect(
        await t.query(api.publicSite.getBySlug, { slug: "owner-studio" }),
      ).toBeNull();
      await expect(s.owner.mutation(api.website.publish, {})).rejects.toThrow(
        "Cannot publish website",
      );
    },
  );
});
