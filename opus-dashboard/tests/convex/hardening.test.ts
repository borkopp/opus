import { beforeEach, describe, expect, test } from "vitest";
import { convexTest } from "convex-test";
import { api, internal } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import schema from "../../convex/schema";
import { convexModules } from "../../convex-test.setup";

const createBackend = () => convexTest(schema, convexModules);
type TestBackend = ReturnType<typeof createBackend>;

const ownerIdentity = {
  subject: "hardening-owner",
  email: "hardening-owner@example.com",
  name: "Hardening Owner",
};

const allDaysOpeningHours = Array.from({ length: 7 }, (_, dayOfWeek) => ({
  dayOfWeek,
  open: "09:00",
  close: "17:00",
  isClosed: false,
}));

const validSettings = {
  timezone: "Europe/Skopje",
  currency: "MKD",
  locale: "mk-MK",
  slotDurationMins: 15,
  quickBookingDurationMins: 30,
  bookingWindowDays: 60,
  cancellationWindowHours: 24,
  bufferTimeMins: 0,
};

type SettingsInput = typeof validSettings;

const invalidSettingsCases: Array<[string, Partial<SettingsInput>, string]> = [
  ["an invalid timezone", { timezone: "Mars/Olympus" }, "valid IANA timezone"],
  ["an empty locale", { locale: "   " }, "valid locale tag"],
  ["an invalid locale", { locale: "not_a_locale" }, "valid locale tag"],
  ["an unsupported currency", { currency: "JPY" }, "supported currency"],
  ["zero slot duration", { slotDurationMins: 0 }, "Slot duration"],
  ["fractional slot duration", { slotDurationMins: 15.5 }, "Slot duration"],
  ["excessive slot duration", { slotDurationMins: 481 }, "Slot duration"],
  [
    "zero quick booking duration",
    { quickBookingDurationMins: 0 },
    "Quick booking duration",
  ],
  [
    "quick booking shorter than a slot",
    { quickBookingDurationMins: 10 },
    "Quick booking duration",
  ],
  [
    "quick booking not aligned to the slot duration",
    { quickBookingDurationMins: 20 },
    "Quick booking duration",
  ],
  ["zero booking window", { bookingWindowDays: 0 }, "Booking window"],
  ["fractional booking window", { bookingWindowDays: 1.5 }, "Booking window"],
  ["excessive booking window", { bookingWindowDays: 731 }, "Booking window"],
  [
    "zero cancellation window",
    { cancellationWindowHours: 0 },
    "Cancellation window",
  ],
  [
    "fractional cancellation window",
    { cancellationWindowHours: 1.5 },
    "Cancellation window",
  ],
  [
    "excessive cancellation window",
    { cancellationWindowHours: 8_761 },
    "Cancellation window",
  ],
  ["negative buffer", { bufferTimeMins: -1 }, "Buffer time"],
  ["fractional buffer", { bufferTimeMins: 0.5 }, "Buffer time"],
  ["excessive buffer", { bufferTimeMins: 241 }, "Buffer time"],
];

async function createOwner(t: TestBackend) {
  const owner = t.withIdentity(ownerIdentity);
  await owner.mutation(api.users.ensureUser);
  const orgId = await owner.mutation(api.activation.startBeautyBusiness, {
    name: "Hardening Studio",
    category: "beauty_salon",
  });
  return { owner, orgId };
}

async function completePublishedWebsite(t: TestBackend) {
  const { owner, orgId } = await createOwner(t);
  await owner.mutation(api.activation.saveLocation, {
    address: "Macedonia Street 12",
    city: "Skopje",
    country: "MK",
    coordinates: { lat: 41.9981, lng: 21.4254 },
  });
  const serviceId = await owner.mutation(api.activation.saveFirstService, {
    name: "Signature Service",
    durationMins: 30,
    priceMinorUnits: 1_200,
  });
  await owner.mutation(api.activation.saveHours, {
    openingHours: allDaysOpeningHours,
  });
  await owner.mutation(api.activation.saveStorefront, {
    tagline: "Reliable care in central Skopje.",
    phone: "+38970111222",
  });
  const logoStorageId = await t.run(async (ctx) => {
    return await ctx.storage.store(
      new Blob(["hardening-logo"], { type: "image/png" }),
    );
  });
  await owner.mutation(api.orgSettings.updateLogo, {
    orgId,
    storageId: logoStorageId,
  });
  await owner.mutation(api.orgMedia.addMedia, {
    orgId,
    url: "https://images.example.com/hardening-cover.jpg",
    type: "cover",
    sortOrder: 0,
  });
  await owner.mutation(api.website.publish, { orgId });
  const service = await t.run(async (ctx) => await ctx.db.get(serviceId));
  const staffId = service?.staffIds[0];
  if (!staffId) throw new Error("Published fixture has no assigned staff");
  return { owner, orgId, serviceId, staffId };
}

function nextMondayDate() {
  const nextMonday = new Date();
  const daysUntilMonday = (8 - nextMonday.getUTCDay()) % 7 || 7;
  nextMonday.setUTCDate(nextMonday.getUTCDate() + daysUntilMonday);
  return nextMonday.toISOString().slice(0, 10);
}

async function insertCustomer(
  t: TestBackend,
  orgId: Id<"orgs">,
  phone: string,
) {
  return await t.run(async (ctx) => {
    const now = Date.now();
    return await ctx.db.insert("customers", {
      orgId,
      name: "Throttle Customer",
      phone,
      totalVisits: 0,
      totalSpendMinorUnits: 0,
      noShowCount: 0,
      noShowRiskScore: 0,
      whatsappOptIn: false,
      marketingOptIn: false,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });
  });
}

async function insertRecentBooking(
  t: TestBackend,
  fixture: {
    orgId: Id<"orgs">;
    serviceId: Id<"services">;
    staffId: Id<"staff_members">;
  },
  customerId: Id<"customers">,
  source: "web" | "opus_web" | "manual",
) {
  await t.run(async (ctx) => {
    const now = Date.now();
    await ctx.db.insert("bookings", {
      orgId: fixture.orgId,
      serviceId: fixture.serviceId,
      staffId: fixture.staffId,
      customerId,
      startAt: 1,
      endAt: 2,
      priceMinorUnits: 1_200,
      currency: "MKD",
      surgePriceApplied: false,
      status: "confirmed",
      source,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });
  });
}

async function createVerifiedGuestBooking(
  t: TestBackend,
  args: {
    orgId: Id<"orgs">;
    serviceId: Id<"services">;
    staffId: Id<"staff_members">;
    startAt: number;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
  },
) {
  const email = args.customerEmail.trim().toLowerCase();
  const challengeId = await t.run(async (ctx) => {
    const now = Date.now();
    return await ctx.db.insert("booking_email_verifications", {
      orgId: args.orgId,
      email,
      codeHash: "verified-test-hash",
      attempts: 0,
      status: "pending",
      expiresAt: now + 10 * 60 * 1_000,
      createdAt: now,
      updatedAt: now,
    });
  });
  const result = await t.mutation(
    internal.publicBooking.createVerifiedPublicBooking,
    {
      ...args,
      customerEmail: email,
      challengeId,
      otpHash: "verified-test-hash",
    },
  );
  if (!result.ok) throw new Error(`Verification failed: ${result.reason}`);
  return result.booking;
}

describe("operational settings hardening", () => {
  let t: TestBackend;

  beforeEach(() => {
    t = createBackend();
  });

  test.each(invalidSettingsCases)(
    "rejects %s without changing stored settings",
    async (_label, overrides, expectedError) => {
      const { owner, orgId } = await createOwner(t);
      const before = await owner.query(api.orgSettings.getOrgSettings, {
        orgId,
      });

      await expect(
        owner.mutation(api.orgSettings.updateOrgSettings, {
          orgId,
          ...validSettings,
          ...overrides,
        }),
      ).rejects.toThrow(expectedError);

      const stored = await owner.query(api.orgSettings.getOrgSettings, {
        orgId,
      });
      expect(stored?.settings).toEqual(before?.settings);
    },
  );

  test("accepts valid settings and stores their canonical forms", async () => {
    const { owner, orgId } = await createOwner(t);

    await expect(
      owner.mutation(api.orgSettings.updateOrgSettings, {
        orgId,
        timezone: "  Europe/Skopje  ",
        currency: " eur ",
        locale: " mk-mk ",
        slotDurationMins: 20,
        quickBookingDurationMins: 40,
        bookingWindowDays: 90,
        cancellationWindowHours: 48,
        bufferTimeMins: 0,
      }),
    ).resolves.toBe(true);

    const stored = await owner.query(api.orgSettings.getOrgSettings, {
      orgId,
    });
    expect(stored?.settings).toMatchObject({
      timezone: "Europe/Skopje",
      currency: "EUR",
      locale: "mk-MK",
      slotDurationMins: 20,
      quickBookingDurationMins: 40,
      bookingWindowDays: 90,
      cancellationWindowHours: 48,
      bufferTimeMins: 0,
    });
  });

  test("suspends a published website when recomputation finds invalid stored settings", async () => {
    const { owner, orgId } = await completePublishedWebsite(t);
    await t.run(async (ctx) => {
      const settings = await ctx.db
        .query("org_settings")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .first();
      if (!settings) throw new Error("Settings fixture is missing");
      await ctx.db.patch(settings._id, { bookingWindowDays: 0 });
    });

    expect(await t.run(async (ctx) => await ctx.db.get(orgId))).toMatchObject({
      websiteStatus: "published",
    });
    expect(
      await t.query(api.publicSite.getBySlug, { slug: "hardening-studio" }),
    ).toBeNull();

    await t.mutation(internal.publication.recomputeWebsiteStatus, { orgId });

    expect(await t.run(async (ctx) => await ctx.db.get(orgId))).toMatchObject({
      listingStatus: "unpublished",
      websiteStatus: "suspended",
    });
    expect(
      await t.query(api.publicSite.getBySlug, { slug: "hardening-studio" }),
    ).toBeNull();

    await owner.mutation(api.orgSettings.updateOrgSettings, {
      orgId,
      ...validSettings,
    });
    expect(await t.run(async (ctx) => await ctx.db.get(orgId))).toMatchObject({
      websiteStatus: "published",
    });
  });

  test("rejects unsupported currencies for service creation and updates", async () => {
    const fixture = await completePublishedWebsite(t);

    await expect(
      fixture.owner.mutation(api.services.createService, {
        orgId: fixture.orgId,
        name: "Unsupported Currency Service",
        durationMins: 30,
        priceMinorUnits: 1_000,
        currency: "JPY",
        staffIds: [fixture.staffId],
        sortOrder: 1,
      }),
    ).rejects.toThrow("Unsupported service currency");
    await expect(
      fixture.owner.mutation(api.services.updateService, {
        orgId: fixture.orgId,
        serviceId: fixture.serviceId,
        currency: "JPY",
      }),
    ).rejects.toThrow("Unsupported service currency");

    const services = await fixture.owner.query(api.services.listServices, {
      orgId: fixture.orgId,
    });
    expect(services).toHaveLength(1);
    expect(services[0]).toMatchObject({
      _id: fixture.serviceId,
      currency: "MKD",
    });
  });
});

describe("public booking throttling", () => {
  let t: TestBackend;

  beforeEach(() => {
    t = createBackend();
  });

  test("allows the third recent public booking for a customer and rejects the fourth", async () => {
    const fixture = await completePublishedWebsite(t);
    const phone = "+38970120001";
    const customerId = await insertCustomer(t, fixture.orgId, phone);
    await insertRecentBooking(t, fixture, customerId, "web");
    await insertRecentBooking(t, fixture, customerId, "opus_web");

    const slots = await t.query(api.publicBooking.getPublicSlots, {
      orgId: fixture.orgId,
      serviceId: fixture.serviceId,
      staffId: fixture.staffId,
      date: nextMondayDate(),
    });
    expect(slots.length).toBeGreaterThan(1);

    await expect(
      createVerifiedGuestBooking(t, {
        orgId: fixture.orgId,
        serviceId: fixture.serviceId,
        staffId: fixture.staffId,
        startAt: slots[0].startAt,
        customerName: "Throttle Customer",
        customerPhone: phone,
        customerEmail: "throttle@example.com",
      }),
    ).resolves.toMatchObject({ bookingId: expect.any(String) });

    await expect(
      createVerifiedGuestBooking(t, {
        orgId: fixture.orgId,
        serviceId: fixture.serviceId,
        staffId: fixture.staffId,
        startAt: slots[1].startAt,
        customerName: "Throttle Customer",
        customerPhone: phone,
        customerEmail: "throttle@example.com",
      }),
    ).rejects.toThrow("Too many booking attempts");
  });

  test("rejects the thirteenth recent public booking for an organization", async () => {
    const fixture = await completePublishedWebsite(t);
    const customerId = await insertCustomer(t, fixture.orgId, "+38970120002");
    for (let index = 0; index < 12; index += 1) {
      await insertRecentBooking(
        t,
        fixture,
        customerId,
        index % 2 === 0 ? "web" : "opus_web",
      );
    }
    const slots = await t.query(api.publicBooking.getPublicSlots, {
      orgId: fixture.orgId,
      serviceId: fixture.serviceId,
      staffId: fixture.staffId,
      date: nextMondayDate(),
    });

    await expect(
      createVerifiedGuestBooking(t, {
        orgId: fixture.orgId,
        serviceId: fixture.serviceId,
        staffId: fixture.staffId,
        startAt: slots[0].startAt,
        customerName: "Fresh Customer",
        customerPhone: "+38970120003",
        customerEmail: "fresh@example.com",
      }),
    ).rejects.toThrow("Too many booking attempts");
  });

  test("does not count recent dashboard bookings toward public throttles", async () => {
    const fixture = await completePublishedWebsite(t);
    const phone = "+38970120004";
    const customerId = await insertCustomer(t, fixture.orgId, phone);
    for (let index = 0; index < 12; index += 1) {
      await insertRecentBooking(t, fixture, customerId, "manual");
    }
    const slots = await t.query(api.publicBooking.getPublicSlots, {
      orgId: fixture.orgId,
      serviceId: fixture.serviceId,
      staffId: fixture.staffId,
      date: nextMondayDate(),
    });

    await expect(
      createVerifiedGuestBooking(t, {
        orgId: fixture.orgId,
        serviceId: fixture.serviceId,
        staffId: fixture.staffId,
        startAt: slots[0].startAt,
        customerName: "Dashboard Customer",
        customerPhone: phone,
        customerEmail: "dashboard-customer@example.com",
      }),
    ).resolves.toMatchObject({ bookingId: expect.any(String) });
  });
});
