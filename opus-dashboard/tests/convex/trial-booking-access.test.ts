import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { convexTest } from "convex-test";
import { api, internal } from "../../convex/_generated/api";
import schema from "../../convex/schema";
import { convexModules } from "../../convex-test.setup";

const backend = () => convexTest(schema, convexModules);

async function publishedTrial(t: ReturnType<typeof backend>) {
  const owner = t.withIdentity({
    subject: "trial-owner",
    email: "trial@example.com",
  });
  await owner.mutation(api.users.ensureUser);
  const { orgId } = await owner.mutation(api.activation.startBeautyBusiness, {
    name: "Trial Studio",
    category: "beauty_salon",
  });
  await owner.mutation(api.activation.saveOwnerName, { name: "Trial Owner" });
  await owner.mutation(api.activation.saveLocation, {
    address: "Macedonia Street 12",
    city: "Skopje",
    country: "MK",
    coordinates: { lat: 41.9981, lng: 21.4254 },
  });
  const serviceId = await owner.mutation(api.activation.saveFirstService, {
    name: "Treatment",
    durationMins: 30,
    priceMinorUnits: 1800,
  });
  await owner.mutation(api.activation.saveHours, {
    openingHours: Array.from({ length: 7 }, (_, dayOfWeek) => ({
      dayOfWeek,
      open: "09:00",
      close: "17:00",
      isClosed: false,
    })),
  });
  await owner.mutation(api.website.publish, { orgId });
  const org = await t.run((ctx) => ctx.db.get(orgId));
  const endsAt = Date.now() + 60_000;
  // Keep appointments and OTP valid across the entitlement boundary.
  await t.run((ctx) =>
    ctx.db.patch(orgId, { trial: { startedAt: Date.now(), endsAt } }),
  );
  const slots = await t.query(api.publicBooking.getPublicSlots, {
    orgId,
    serviceId,
    staffId: "any",
    date: "2026-10-26",
  });
  const staffId = slots[0].availableStaffIds[0];
  return { owner, orgId, serviceId, staffId, slots, endsAt, slug: org!.slug };
}

describe("trial expiry booking boundaries", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-24T08:00:00Z"));
  });
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  test("expiry blocks fresh appointments while retaining the website and existing appointment management", async () => {
    const t = backend();
    const s = await publishedTrial(t);
    const createArgs = {
      orgId: s.orgId,
      staffId: s.staffId,
      serviceIds: [s.serviceId],
      startAt: s.slots[0].startAt,
      customerName: "Existing Client",
    };
    const bookingId = await s.owner.mutation(
      api.bookings.createManualBooking,
      createArgs,
    );
    vi.setSystemTime(s.endsAt);
    await expect(
      s.owner.mutation(api.bookings.createManualBooking, {
        ...createArgs,
        startAt: s.slots[2].startAt,
      }),
    ).rejects.toThrow("SUBSCRIPTION_REQUIRED");
    const existing = await t.run((ctx) => ctx.db.get(bookingId));
    await expect(
      s.owner.mutation(api.bookings.createBooking, {
        orgId: s.orgId,
        staffId: s.staffId,
        serviceId: s.serviceId,
        customerId: existing!.customerId,
        startAt: s.slots[2].startAt,
        source: "manual",
      }),
    ).rejects.toThrow("SUBSCRIPTION_REQUIRED");
    const site = await t.query(api.publicSite.getBySlug, { slug: s.slug });
    expect(site?.bookingSettings.acceptingBookings).toBe(false);
    expect(
      await t.query(api.publicBooking.getPublicSlots, {
        orgId: s.orgId,
        serviceId: s.serviceId,
        staffId: "any",
        date: "2026-10-26",
      }),
    ).toEqual([]);
    const moved = await s.owner.mutation(api.bookings.rescheduleBooking, {
      orgId: s.orgId,
      bookingId,
      newStartAt: s.slots[2].startAt,
    });
    await s.owner.mutation(api.bookings.cancelBooking, {
      orgId: s.orgId,
      bookingId: moved,
    });
    expect(await t.run((ctx) => ctx.db.get(bookingId))).toMatchObject({
      status: "cancelled",
      isDeleted: false,
    });
    expect(await t.run((ctx) => ctx.db.get(moved))).toMatchObject({
      status: "cancelled",
      isDeleted: false,
    });
  });

  test("a valid guest verification cannot create an appointment after the trial expires", async () => {
    const t = backend();
    const s = await publishedTrial(t);
    const { challengeId } = await t.mutation(
      internal.publicBooking.createBookingEmailChallenge,
      {
        orgId: s.orgId,
        email: "guest@example.com",
        codeHash: "valid-hash",
        encryptedCode: "test-only",
      },
    );
    vi.setSystemTime(s.endsAt);
    await expect(
      t.mutation(internal.publicBooking.createVerifiedPublicBooking, {
        orgId: s.orgId,
        serviceId: s.serviceId,
        staffId: s.staffId,
        startAt: s.slots[0].startAt,
        customerName: "Guest Client",
        customerEmail: "guest@example.com",
        customerPhone: "+38970222333",
        challengeId,
        otpHash: "valid-hash",
      }),
    ).rejects.toThrow("not currently accepting bookings");
    expect(
      await t.run((ctx) =>
        ctx.db
          .query("bookings")
          .withIndex("by_org", (q) => q.eq("orgId", s.orgId))
          .collect(),
      ),
    ).toEqual([]);
    expect(await t.run((ctx) => ctx.db.get(challengeId))).toMatchObject({
      status: "pending",
    });
  });

  test("legacy Free continues accepting bookings beyond the former trial date and paid access restores an expired studio", async () => {
    const t = backend();
    const s = await publishedTrial(t);
    vi.setSystemTime(s.endsAt);
    for (const patch of [
      { trial: undefined },
      {
        plan: "paid" as const,
        trial: { startedAt: s.endsAt - 60_000, endsAt: s.endsAt },
      },
    ]) {
      await t.run((ctx) => ctx.db.patch(s.orgId, patch));
      expect(
        (await t.query(api.publicSite.getBySlug, { slug: s.slug }))
          ?.bookingSettings.acceptingBookings,
      ).toBe(true);
      expect(
        (
          await t.query(api.publicBooking.getPublicSlots, {
            orgId: s.orgId,
            serviceId: s.serviceId,
            staffId: "any",
            date: "2026-10-26",
          })
        ).length,
      ).toBeGreaterThan(0);
    }
  });
});
