import { beforeEach, describe, expect, test, vi } from "vitest";
import { convexTest } from "convex-test";
import { api } from "../../convex/_generated/api";
import schema from "../../convex/schema";
import { convexModules } from "../../convex-test.setup";

const createBackend = () => convexTest(schema, convexModules);
type TestBackend = ReturnType<typeof createBackend>;

const identity = (subject: string) => ({
  subject,
  email: `${subject}@example.com`,
  name: subject === "owner-1" ? "Ada Owner" : "Second Owner",
});

const openingHours = Array.from({ length: 7 }, (_, dayOfWeek) => ({
  dayOfWeek,
  open: "09:00",
  close: "17:00",
  isClosed: dayOfWeek > 4,
}));

async function createOwner(t: TestBackend, subject = "owner-1") {
  const authenticated = t.withIdentity(identity(subject));
  await authenticated.mutation(api.users.ensureUser);
  return authenticated;
}

async function completeBeautySetup(t: TestBackend) {
  const owner = await createOwner(t);
  const orgId = await owner.mutation(api.activation.startBeautyBusiness, {
    name: "Atelier One",
    category: "hair_salon",
  });
  await owner.mutation(api.activation.saveLocation, {
    address: "Macedonia Street 12",
    city: "Skopje",
    neighborhood: "Centar",
    postalCode: "1000",
    country: "mk",
    coordinates: { lat: 41.9981, lng: 21.4254 },
  });
  const serviceId = await owner.mutation(api.activation.saveFirstService, {
    name: "Signature Cut",
    description: "Consultation, wash, cut and finish.",
    durationMins: 45,
    priceMinorUnits: 1800,
  });
  await owner.mutation(api.activation.saveHours, { openingHours });
  await owner.mutation(api.activation.saveStorefront, {
    tagline: "Calm craft in the centre of Skopje.",
    bio: "A modern studio focused on thoughtful, wearable hair.",
    phone: "+38970111222",
  });
  await owner.mutation(api.orgMedia.addMedia, {
    orgId,
    url: "https://images.example.com/atelier-cover.jpg",
    type: "cover",
    sortOrder: 0,
  });
  return { owner, orgId, serviceId };
}

describe("beauty activation engine", () => {
  let t: TestBackend;

  beforeEach(() => {
    vi.useRealTimers();
    t = createBackend();
  });

  test("requires authentication and never trusts a supplied tenant", async () => {
    await expect(
      t.mutation(api.activation.startBeautyBusiness, {
        name: "No Identity",
        category: "barbershop",
      }),
    ).rejects.toThrow("Unauthenticated");

    const firstOwner = await createOwner(t, "owner-1");
    const firstOrgId = await firstOwner.mutation(
      api.activation.startBeautyBusiness,
      { name: "Tenant One", category: "barbershop" },
    );
    const secondOwner = await createOwner(t, "owner-2");
    await secondOwner.mutation(api.activation.startBeautyBusiness, {
      name: "Tenant Two",
      category: "spa",
    });

    await expect(
      secondOwner.query(api.listing.getListingReadiness, {
        orgId: firstOrgId,
      }),
    ).rejects.toThrow("Unauthorised");
    await expect(
      secondOwner.query(api.dashboard.getDashboardMetrics, {
        orgId: firstOrgId,
        startOfDayMs: 0,
        endOfDayMs: Date.now() + 1_000,
      }),
    ).rejects.toThrow("Unauthorised");
    await expect(
      secondOwner.mutation(api.customers.findOrCreateCustomer, {
        orgId: firstOrgId,
        name: "Tampered Customer",
        phone: "+38970000000",
      }),
    ).rejects.toThrow("Unauthorised");
  });

  test("creates one idempotent business and assigns unique slugs", async () => {
    const owner = await createOwner(t);
    const firstOrgId = await owner.mutation(
      api.activation.startBeautyBusiness,
      { name: "Studio North", category: "beauty_salon" },
    );
    const repeatedOrgId = await owner.mutation(
      api.activation.startBeautyBusiness,
      { name: "Studio North", category: "beauty_salon" },
    );
    expect(repeatedOrgId).toBe(firstOrgId);

    const secondOwner = await createOwner(t, "owner-2");
    const secondOrgId = await secondOwner.mutation(
      api.activation.startBeautyBusiness,
      { name: "Studio North", category: "beauty_salon" },
    );

    const orgs = await t.run(async (ctx) => await ctx.db.query("orgs").collect());
    expect(orgs).toHaveLength(2);
    expect(orgs.find((org) => org._id === firstOrgId)?.slug).toBe("studio-north");
    expect(orgs.find((org) => org._id === secondOrgId)?.slug).toBe("studio-north-2");
  });

  test("persists confirmed location and maps ISO hours to provider availability", async () => {
    const owner = await createOwner(t);
    const orgId = await owner.mutation(api.activation.startBeautyBusiness, {
      name: "Map Studio",
      category: "nail_salon",
    });
    const coordinates = { lat: 41.995, lng: 21.431 };

    await owner.mutation(api.activation.saveLocation, {
      address: "Partizanska 8",
      city: "Skopje",
      country: "mk",
      coordinates,
    });
    await owner.mutation(api.activation.saveHours, { openingHours });

    const persisted = await t.run(async (ctx) => {
      const org = await ctx.db.get(orgId);
      const rules = await ctx.db
        .query("availability_rules")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .collect();
      const audits = await ctx.db
        .query("audit_log")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .collect();
      return { org, rules, audits };
    });

    expect(persisted.org?.coordinates).toEqual(coordinates);
    expect(persisted.org?.country).toBe("MK");
    expect(persisted.rules).toHaveLength(7);
    expect(persisted.rules.find((rule) => rule.dayOfWeek === 1)?.isActive).toBe(true);
    expect(persisted.rules.find((rule) => rule.dayOfWeek === 0)?.isActive).toBe(false);
    expect(persisted.audits.map((event) => event.action)).toEqual(
      expect.arrayContaining([
        "activation.location_saved",
        "activation.hours_saved",
      ]),
    );
  });

  test("publishes only when ready, preserves public contracts, and auto suspends/restores", async () => {
    const owner = await createOwner(t);
    const orgId = await owner.mutation(api.activation.startBeautyBusiness, {
      name: "Blocked Studio",
      category: "spa",
    });
    await expect(
      owner.mutation(api.listing.publishOrg, { orgId }),
    ).rejects.toThrow("Cannot publish");

    const complete = await completeBeautySetup(t);
    const ready = await complete.owner.query(api.listing.getListingReadiness, {
      orgId: complete.orgId,
    });
    expect(ready?.allBlockingMet).toBe(true);
    expect(ready?.nextStep).toBe("review");

    await complete.owner.mutation(api.listing.publishOrg, {
      orgId: complete.orgId,
    });
    const feed = await complete.owner.query(api.public.listPublished, {
      industry: "beauty_wellness",
    });
    expect(feed.items).toHaveLength(1);
    expect(Object.keys(feed.items[0])).toEqual(
      expect.arrayContaining([
        "_id",
        "averageRating",
        "beautyCategory",
        "city",
        "coordinates",
        "coverImageUrl",
        "industry",
        "isFeatured",
        "name",
        "neighborhood",
        "openingHours",
        "reviewCount",
        "slug",
        "tagline",
      ]),
    );
    expect(feed.items[0]).not.toHaveProperty("braintreeMerchantAccountId");
    expect(feed.items[0]).not.toHaveProperty("planStatus");

    const profile = await complete.owner.query(api.public.getPublicProfile, {
      slug: "atelier-one",
    });
    expect(profile).toMatchObject({
      name: "Atelier One",
      slug: "atelier-one",
      city: "Skopje",
      beautyCategory: "hair_salon",
    });
    expect(profile?.services[0]).toMatchObject({
      name: "Signature Cut",
      durationMins: 45,
      priceMinorUnits: 1800,
    });

    await complete.owner.mutation(api.services.updateService, {
      orgId: complete.orgId,
      serviceId: complete.serviceId,
      isActive: false,
    });
    expect(
      await complete.owner.query(api.public.getPublicProfile, {
        slug: "atelier-one",
      }),
    ).toBeNull();

    await complete.owner.mutation(api.services.updateService, {
      orgId: complete.orgId,
      serviceId: complete.serviceId,
      isActive: true,
    });
    expect(
      await complete.owner.query(api.public.getPublicProfile, {
        slug: "atelier-one",
      }),
    ).not.toBeNull();

    const statusEvents = await complete.owner.run(async (ctx) => {
      const events = await ctx.db
        .query("audit_log")
        .withIndex("by_org", (q) => q.eq("orgId", complete.orgId))
        .collect();
      return events
        .map((event) => event.action)
        .filter((action) => action.startsWith("org.listing_status."));
    });
    expect(statusEvents).toEqual(
      expect.arrayContaining([
        "org.listing_status.suspended",
        "org.listing_status.published",
      ]),
    );
  });

  test("soft deletes media and removes the listing from public visibility", async () => {
    const { owner, orgId } = await completeBeautySetup(t);
    await owner.mutation(api.listing.publishOrg, { orgId });
    const media = await owner.query(api.orgMedia.listByOrg, { orgId });

    await owner.mutation(api.orgMedia.removeMedia, {
      orgId,
      mediaId: media[0]._id,
    });

    const deletedMedia = await t.run(async (ctx) => await ctx.db.get(media[0]._id));
    const org = await t.run(async (ctx) => await ctx.db.get(orgId));
    expect(deletedMedia?.isDeleted).toBe(true);
    expect(deletedMedia?.deletedAt).toEqual(expect.any(Number));
    expect(org?.listingStatus).toBe("suspended");
  });

  test("exposes real public availability and atomically rejects slot conflicts", async () => {
    const { owner, orgId, serviceId } = await completeBeautySetup(t);
    await owner.mutation(api.listing.publishOrg, { orgId });

    const nextMonday = new Date();
    const daysUntilMonday = ((8 - nextMonday.getUTCDay()) % 7) || 7;
    nextMonday.setUTCDate(nextMonday.getUTCDate() + daysUntilMonday);
    const date = nextMonday.toISOString().slice(0, 10);

    const slots = await owner.query(api.publicBooking.getPublicSlots, {
      orgId,
      serviceId,
      staffId: "any",
      date,
    });
    expect(slots.length).toBeGreaterThan(0);
    const slot = slots[0];
    const staffId = slot.availableStaffIds[0];

    await expect(
      owner.mutation(api.publicBooking.createPublicBooking, {
        orgId,
        serviceId,
        staffId,
        startAt: new Date(`${date}T00:00:00.000Z`).getTime(),
        customerName: "Outside Hours",
        customerPhone: "+38970999999",
        paymentMethod: "cash",
      }),
    ).rejects.toThrow("outside working hours or no longer available");

    const booking = await owner.mutation(api.publicBooking.createPublicBooking, {
      orgId,
      serviceId,
      staffId,
      startAt: slot.startAt,
      customerName: "Marketplace Customer",
      customerPhone: "+38970123456",
      paymentMethod: "cash",
    });
    expect(booking).toMatchObject({
      serviceName: "Signature Cut",
      startAt: slot.startAt,
      priceMinorUnits: 1800,
    });

    await expect(
      owner.mutation(api.publicBooking.createPublicBooking, {
        orgId,
        serviceId,
        staffId,
        startAt: slot.startAt,
        customerName: "Conflicting Customer",
        customerPhone: "+38970654321",
        paymentMethod: "cash",
      }),
    ).rejects.toThrow("no longer available");
  });

  test("keeps published hospitality records dormant across public discovery and booking", async () => {
    const { owner, orgId, serviceId } = await completeBeautySetup(t);
    await owner.mutation(api.listing.publishOrg, { orgId });

    const hospitalityOrgId = await t.run(async (ctx) =>
      await ctx.db.insert("orgs", {
        name: "Dormant Dining Room",
        slug: "dormant-dining-room",
        industry: "hospitality",
        city: "Skopje",
        listingStatus: "published",
        publishedAt: Date.now(),
        reviewCount: 0,
        averageRating: 0,
        plan: "starter",
        planStatus: "trialing",
        source: "customer",
        isDeleted: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );

    const feed = await owner.query(api.public.listPublished, {});
    expect(feed.items.map((item) => item.slug)).toEqual(["atelier-one"]);
    expect(feed.totalCount).toBe(1);

    expect(
      await owner.query(api.public.searchPublished, {
        query: "Dormant Dining Room",
        city: "Skopje",
      }),
    ).toEqual([]);
    expect(
      await owner.query(api.public.getPublicProfile, {
        slug: "dormant-dining-room",
      }),
    ).toBeNull();

    const nextMonday = new Date();
    const daysUntilMonday = ((8 - nextMonday.getUTCDay()) % 7) || 7;
    nextMonday.setUTCDate(nextMonday.getUTCDate() + daysUntilMonday);
    const date = nextMonday.toISOString().slice(0, 10);
    const beautySlots = await owner.query(api.publicBooking.getPublicSlots, {
      orgId,
      serviceId,
      staffId: "any",
      date,
    });
    const staffId = beautySlots[0].availableStaffIds[0];

    expect(
      await owner.query(api.publicBooking.getPublicSlots, {
        orgId: hospitalityOrgId,
        serviceId,
        staffId,
        date,
      }),
    ).toEqual([]);
    await expect(
      owner.mutation(api.publicBooking.createPublicBooking, {
        orgId: hospitalityOrgId,
        serviceId,
        staffId,
        startAt: beautySlots[0].startAt,
        customerName: "Hidden Guest",
        customerPhone: "+38970000111",
        paymentMethod: "cash",
      }),
    ).rejects.toThrow("not currently accepting bookings");
  });

  test("protects staff booking actions and validates reschedule availability", async () => {
    const { owner, orgId, serviceId } = await completeBeautySetup(t);
    await owner.mutation(api.listing.publishOrg, { orgId });

    const nextMonday = new Date();
    const daysUntilMonday = ((8 - nextMonday.getUTCDay()) % 7) || 7;
    nextMonday.setUTCDate(nextMonday.getUTCDate() + daysUntilMonday);
    const date = nextMonday.toISOString().slice(0, 10);
    const slots = await owner.query(api.publicBooking.getPublicSlots, {
      orgId,
      serviceId,
      staffId: "any",
      date,
    });
    const staffId = slots[0].availableStaffIds[0];
    const created = await owner.mutation(api.publicBooking.createPublicBooking, {
      orgId,
      serviceId,
      staffId,
      startAt: slots[0].startAt,
      customerName: "Lifecycle Customer",
      customerPhone: "+38970000222",
      paymentMethod: "cash",
    });

    const secondOwner = await createOwner(t, "owner-2");
    await secondOwner.mutation(api.activation.startBeautyBusiness, {
      name: "Other Studio",
      category: "spa",
    });
    await expect(
      secondOwner.mutation(api.bookings.cancelBooking, {
        orgId,
        bookingId: created.bookingId,
      }),
    ).rejects.toThrow("Unauthorised");
    await expect(
      secondOwner.mutation(api.bookings.rescheduleBooking, {
        orgId,
        bookingId: created.bookingId,
        newStartAt: slots[1].startAt,
      }),
    ).rejects.toThrow("Unauthorised");

    const outsideWorkingHours = new Date(`${date}T00:00:00.000Z`).getTime();
    await expect(
      owner.mutation(api.bookings.rescheduleBooking, {
        orgId,
        bookingId: created.bookingId,
        newStartAt: outsideWorkingHours,
      }),
    ).rejects.toThrow("outside working hours or no longer available");
    expect(
      await t.run(async (ctx) => (await ctx.db.get(created.bookingId))?.status),
    ).toBe("confirmed");

    await owner.mutation(api.bookings.checkInBooking, {
      orgId,
      bookingId: created.bookingId,
    });
    await owner.mutation(api.bookings.completeBooking, {
      orgId,
      bookingId: created.bookingId,
    });
    expect(
      await t.run(async (ctx) => (await ctx.db.get(created.bookingId))?.status),
    ).toBe("completed");
  });
});
