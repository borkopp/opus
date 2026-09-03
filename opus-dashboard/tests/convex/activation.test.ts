import { beforeEach, describe, expect, test, vi } from "vitest";
import { convexTest } from "convex-test";
import { api, internal } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
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

function dateInTimezone(timezone: string, timestamp = Date.now()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

function addCalendarDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

async function createOwner(t: TestBackend, subject = "owner-1") {
  const authenticated = t.withIdentity(identity(subject));
  await authenticated.mutation(api.users.ensureUser);
  return authenticated;
}

async function createAuthenticatedStaff(
  t: TestBackend,
  orgId: Id<"orgs">,
  subject: string,
  role: "owner" | "manager" | "staff",
) {
  const authenticated = t.withIdentity(identity(subject));
  const userId = await authenticated.mutation(api.users.ensureUser);
  const staffId = await t.run(async (ctx) => {
    const now = Date.now();
    await ctx.db.patch(userId, { activeOrgId: orgId, updatedAt: now });
    return await ctx.db.insert("staff_members", {
      orgId,
      userId,
      displayName: `${role} fixture`,
      specialties: [],
      role,
      isActive: true,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });
  });
  return { authenticated, staffId };
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
    customerNote?: string;
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

async function completeOperationalSetup(t: TestBackend) {
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
  return { owner, orgId, serviceId };
}

async function completeBeautySetup(t: TestBackend) {
  const setup = await completeOperationalSetup(t);
  const { owner, orgId } = setup;
  await owner.mutation(api.activation.saveStorefront, {
    tagline: "Calm craft in the centre of Skopje.",
    bio: "A modern studio focused on thoughtful, wearable hair.",
    phone: "+38970111222",
  });
  const logoStorageId = await t.run(async (ctx) => {
    return await ctx.storage.store(
      new Blob(["fixture-logo"], { type: "image/png" }),
    );
  });
  await owner.mutation(api.orgSettings.updateLogo, {
    orgId,
    storageId: logoStorageId,
  });
  await owner.mutation(api.orgMedia.addMedia, {
    orgId,
    url: "https://images.example.com/atelier-cover.jpg",
    type: "cover",
    sortOrder: 0,
  });
  return setup;
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

  test("prevents managers from creating, promoting, inviting, or deactivating owners", async () => {
    const { owner, orgId } = await completeBeautySetup(t);
    const { authenticated: manager } = await createAuthenticatedStaff(
      t,
      orgId,
      "manager-1",
      "manager",
    );
    const ownerSeatId = await owner.mutation(api.staff.createStaffMember, {
      orgId,
      displayName: "Second Owner Seat",
      role: "owner",
      specialties: [],
    });
    const staffSeatId = await owner.mutation(api.staff.createStaffMember, {
      orgId,
      displayName: "Staff Seat",
      role: "staff",
      specialties: [],
    });

    await expect(
      manager.mutation(api.staff.createStaffMember, {
        orgId,
        displayName: "Unauthorized Owner",
        role: "owner",
        specialties: [],
      }),
    ).rejects.toThrow("Only an owner can add another owner");
    await expect(
      manager.mutation(api.staff.updateStaffMember, {
        orgId,
        staffId: staffSeatId,
        role: "owner",
      }),
    ).rejects.toThrow("Only an owner can assign the owner role");
    await expect(
      manager.mutation(api.staff.inviteStaffMember, {
        orgId,
        staffId: ownerSeatId,
        email: "owner-seat@example.com",
      }),
    ).rejects.toThrow("Only an owner can invite another owner");
    await expect(
      manager.mutation(api.staff.deactivateStaffMember, {
        orgId,
        staffId: ownerSeatId,
      }),
    ).rejects.toThrow("Only an owner can deactivate another owner");

    expect(
      await t.run(async (ctx) => await ctx.db.get(ownerSeatId)),
    ).toMatchObject({
      role: "owner",
      isActive: true,
      isDeleted: false,
    });
    expect(
      await t.run(async (ctx) => await ctx.db.get(staffSeatId)),
    ).toMatchObject({
      role: "staff",
      isActive: true,
      isDeleted: false,
    });
  });

  test("lets only owners link a normalized appointment email to staff", async () => {
    const { owner, orgId } = await completeBeautySetup(t);
    const { authenticated: manager } = await createAuthenticatedStaff(
      t,
      orgId,
      "manager-email",
      "manager",
    );
    const staffId = await owner.mutation(api.staff.createStaffMember, {
      orgId,
      displayName: "Ana Artist",
      role: "staff",
      specialties: ["Nails"],
      appointmentEmail: " ANA.ARTIST@EXAMPLE.COM ",
    });

    expect(
      await owner.query(api.staff.getStaffMember, { orgId, staffId }),
    ).toMatchObject({
      appointmentEmail: "ana.artist@example.com",
    });
    expect(
      await manager.query(api.staff.getStaffMember, { orgId, staffId }),
    ).not.toHaveProperty("appointmentEmail");

    await expect(
      manager.mutation(api.staff.updateStaffMember, {
        orgId,
        staffId,
        appointmentEmail: "manager-change@example.com",
      }),
    ).rejects.toThrow("Only an owner can manage staff appointment emails");
    await expect(
      owner.mutation(api.staff.updateStaffMember, {
        orgId,
        staffId,
        appointmentEmail: "not-an-email",
      }),
    ).rejects.toThrow("Enter a valid appointment email address");

    await owner.mutation(api.staff.updateStaffMember, {
      orgId,
      staffId,
      appointmentEmail: null,
    });
    const persisted = await t.run(async (ctx) => ({
      staff: await ctx.db.get(staffId),
      audit: await ctx.db
        .query("audit_log")
        .withIndex("by_org", (query) => query.eq("orgId", orgId))
        .collect(),
    }));
    expect(persisted.staff).not.toHaveProperty("appointmentEmail");
    expect(
      persisted.audit.filter(
        (entry) =>
          entry.resourceId === staffId && entry.action === "staff.updated",
      ),
    ).toHaveLength(1);
  });

  test("keeps the last active owner from being demoted or deactivated", async () => {
    const { owner, orgId } = await completeBeautySetup(t);
    const ownerStaffId = await t.run(async (ctx) => {
      const ownerMember = await ctx.db
        .query("staff_members")
        .withIndex("by_org_role", (q) =>
          q.eq("orgId", orgId).eq("role", "owner"),
        )
        .first();
      if (!ownerMember) throw new Error("Owner fixture is missing");
      return ownerMember._id;
    });

    await expect(
      owner.mutation(api.staff.updateStaffMember, {
        orgId,
        staffId: ownerStaffId,
        role: "manager",
      }),
    ).rejects.toThrow("must keep at least one active owner");
    await expect(
      owner.mutation(api.staff.updateStaffMember, {
        orgId,
        staffId: ownerStaffId,
        isActive: false,
      }),
    ).rejects.toThrow("must keep at least one active owner");
    await expect(
      owner.mutation(api.staff.deactivateStaffMember, {
        orgId,
        staffId: ownerStaffId,
      }),
    ).rejects.toThrow("cannot deactivate yourself");

    expect(
      await t.run(async (ctx) => await ctx.db.get(ownerStaffId)),
    ).toMatchObject({
      role: "owner",
      isActive: true,
      isDeleted: false,
    });
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

    const orgs = await t.run(
      async (ctx) => await ctx.db.query("orgs").collect(),
    );
    expect(orgs).toHaveLength(2);
    expect(orgs.find((org) => org._id === firstOrgId)?.slug).toBe(
      "studio-north",
    );
    expect(orgs.find((org) => org._id === secondOrgId)?.slug).toBe(
      "studio-north-2",
    );
  });

  test("generates tenant-safe slugs for reserved names and Macedonian text", async () => {
    const reservedOwner = await createOwner(t);
    const reservedOrgId = await reservedOwner.mutation(
      api.activation.startBeautyBusiness,
      { name: "Studio", category: "beauty_salon" },
    );

    const macedonianOwner = await createOwner(t, "owner-macedonian");
    const macedonianOrgId = await macedonianOwner.mutation(
      api.activation.startBeautyBusiness,
      { name: "Студио Љубов", category: "beauty_salon" },
    );

    const slugs = await t.run(async (ctx) => ({
      reserved: (await ctx.db.get(reservedOrgId))?.slug,
      macedonian: (await ctx.db.get(macedonianOrgId))?.slug,
    }));
    expect(slugs).toEqual({
      reserved: "studio-2",
      macedonian: "studio-ljubov",
    });
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
    expect(persisted.rules.find((rule) => rule.dayOfWeek === 1)?.isActive).toBe(
      true,
    );
    expect(persisted.rules.find((rule) => rule.dayOfWeek === 0)?.isActive).toBe(
      false,
    );
    expect(persisted.audits.map((event) => event.action)).toEqual(
      expect.arrayContaining([
        "activation.location_saved",
        "activation.hours_saved",
      ]),
    );
  });

  test("rejects incomplete, foreign, oversized, and invalid locations before writing", async () => {
    const owner = await createOwner(t);
    const orgId = await owner.mutation(api.activation.startBeautyBusiness, {
      name: "Hardened Location Studio",
      category: "beauty_salon",
    });
    const validCoordinates = { lat: 41.9981, lng: 21.4254 };

    await expect(
      owner.mutation(api.activation.saveLocation, {
        address: "Macedonia Street 12",
        city: " ",
        country: "mk",
        coordinates: validCoordinates,
      }),
    ).rejects.toThrow("Address, city, and country are required");

    await expect(
      owner.mutation(api.activation.saveLocation, {
        address: "Foreign Street 1",
        city: "Sofia",
        country: "bg",
        coordinates: { lat: 42.6977, lng: 23.3219 },
      }),
    ).rejects.toThrow("Location must be in North Macedonia");

    await expect(
      owner.mutation(api.activation.saveLocation, {
        address: "Foreign Street 1",
        city: "Sofia",
        country: "mk",
        coordinates: { lat: 42.6977, lng: 23.3219 },
      }),
    ).rejects.toThrow("Location must be in North Macedonia");

    await expect(
      owner.mutation(api.activation.saveLocation, {
        address: "A".repeat(201),
        city: "Skopje",
        country: "mk",
        coordinates: validCoordinates,
      }),
    ).rejects.toThrow("Location details are too long");

    await expect(
      owner.mutation(api.activation.saveLocation, {
        address: "Macedonia Street 12",
        city: "Skopje",
        country: "mk",
        coordinates: { lat: 91, lng: 21.4254 },
      }),
    ).rejects.toThrow("Map coordinates are invalid");

    const persisted = await t.run(async (ctx) => ({
      org: await ctx.db.get(orgId),
      audits: await ctx.db
        .query("audit_log")
        .withIndex("by_org", (query) => query.eq("orgId", orgId))
        .collect(),
    }));
    expect(persisted.org?.address).toBeUndefined();
    expect(
      persisted.audits.filter(
        (event) => event.action === "activation.location_saved",
      ),
    ).toHaveLength(0);
  });

  test("unlocks the dashboard after operational setup but blocks website publishing until the public profile is complete", async () => {
    const { owner, orgId } = await completeOperationalSetup(t);

    const state = await owner.query(api.activation.getState, {});
    expect(state?.operationalSetupComplete).toBe(true);
    expect(state?.nextStep).toBe("review");
    expect(state?.allWebsiteRequirementsComplete).toBe(false);
    expect(
      state?.websiteRequirements
        .filter((requirement) => !requirement.complete)
        .map((requirement) => requirement.code),
    ).toEqual([
      "website_logo",
      "website_banner",
      "website_tagline",
      "website_phone",
    ]);

    const readiness = await owner.query(api.website.getReadiness, { orgId });
    expect(readiness?.allBlockingMet).toBe(false);
    expect(readiness?.requirements).toHaveLength(10);
    await expect(
      owner.mutation(api.website.publish, { orgId }),
    ).rejects.toThrow(
      "Cannot publish website: Website logo, Website cover photo, Studio tagline, Contact phone.",
    );
  });

  test("publishes the marketplace only when ready and keeps it independent from website readiness", async () => {
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
    expect(
      await complete.owner.query(api.publicSite.getBySlug, {
        slug: "atelier-one",
      }),
    ).toBeNull();
    expect(
      await t.run(
        async (ctx) => (await ctx.db.get(complete.orgId))?.websiteStatus,
      ),
    ).toBe("unpublished");

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
    ).toMatchObject({
      name: "Atelier One",
      services: [],
    });
    expect(
      await t.run(async (ctx) => await ctx.db.get(complete.orgId)),
    ).toMatchObject({
      listingStatus: "published",
      websiteStatus: "unpublished",
    });

    await complete.owner.mutation(api.services.updateService, {
      orgId: complete.orgId,
      serviceId: complete.serviceId,
      isActive: true,
    });
    expect(
      await complete.owner.query(api.public.getPublicProfile, {
        slug: "atelier-one",
      }),
    ).toMatchObject({
      name: "Atelier One",
      services: [expect.objectContaining({ name: "Signature Cut" })],
    });

    const statusEvents = await complete.owner.run(async (ctx) => {
      const events = await ctx.db
        .query("audit_log")
        .withIndex("by_org", (q) => q.eq("orgId", complete.orgId))
        .collect();
      return events
        .map((event) => event.action)
        .filter((action) => action.startsWith("org.listing_status."));
    });
    expect(statusEvents).toEqual([]);
  });

  test("publishes a website independently, freezes its slug, and is idempotent", async () => {
    const { owner, orgId } = await completeBeautySetup(t);

    const firstPublishResult = await owner.mutation(api.website.publish, {
      orgId,
    });
    const firstPublishedOrg = await t.run(
      async (ctx) => await ctx.db.get(orgId),
    );
    const repeatedPublishResult = await owner.mutation(api.website.publish, {
      orgId,
    });

    expect(firstPublishResult).toBe(orgId);
    expect(repeatedPublishResult).toBe(orgId);
    expect(firstPublishedOrg).toMatchObject({
      slug: "atelier-one",
      listingStatus: "unpublished",
      websiteStatus: "published",
      websitePublishedAt: expect.any(Number),
    });
    expect(
      await owner.query(api.public.listPublished, {
        industry: "beauty_wellness",
      }),
    ).toMatchObject({ items: [], totalCount: 0 });

    const publishAudits = await t.run(async (ctx) => {
      const events = await ctx.db
        .query("audit_log")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .collect();
      return events.filter((event) => event.action === "org.website.published");
    });
    const afterRepeatedPublish = await t.run(
      async (ctx) => await ctx.db.get(orgId),
    );
    expect(publishAudits).toHaveLength(1);
    expect(afterRepeatedPublish?.websitePublishedAt).toBe(
      firstPublishedOrg?.websitePublishedAt,
    );

    await owner.mutation(api.activation.startBeautyBusiness, {
      name: "Renamed Atelier",
      category: "hair_salon",
    });
    expect(await t.run(async (ctx) => await ctx.db.get(orgId))).toMatchObject({
      name: "Renamed Atelier",
      slug: "atelier-one",
      listingStatus: "unpublished",
      websiteStatus: "published",
    });
  });

  test.each([
    ["reserved", "studio"],
    ["invalid", "Legacy Invalid Slug!"],
  ])(
    "repairs a %s legacy tenant slug on first website publish",
    async (_kind, legacySlug) => {
      const { owner, orgId } = await completeBeautySetup(t);
      await t.run(async (ctx) => {
        await ctx.db.patch(orgId, { slug: legacySlug });
      });

      await owner.mutation(api.website.publish, { orgId });

      expect(await t.run(async (ctx) => await ctx.db.get(orgId))).toMatchObject(
        {
          slug: "atelier-one",
          websiteStatus: "published",
        },
      );
      expect(
        await t.query(api.publicSite.getBySlug, { slug: "atelier-one" }),
      ).not.toBeNull();
    },
  );

  test("repairs a duplicate legacy tenant slug on first website publish", async () => {
    const { owner, orgId } = await completeBeautySetup(t);
    await t.run(async (ctx) => {
      const now = Date.now();
      await ctx.db.insert("orgs", {
        name: "Existing Legacy Tenant",
        slug: "atelier-one",
        industry: "beauty_wellness",
        beautyCategory: "beauty_salon",
        listingStatus: "unpublished",
        websiteStatus: "unpublished",
        reviewCount: 0,
        averageRating: 0,
        plan: "free",
        source: "customer",
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      });
    });

    await owner.mutation(api.website.publish, { orgId });

    expect(await t.run(async (ctx) => await ctx.db.get(orgId))).toMatchObject({
      slug: "atelier-one-2",
      websiteStatus: "published",
    });
    expect(
      await t.query(api.publicSite.getBySlug, { slug: "atelier-one-2" }),
    ).not.toBeNull();
  });

  test("exposes public sites only for website-published beauty organizations", async () => {
    const { owner, orgId } = await completeBeautySetup(t);

    expect(
      await t.query(api.publicSite.getBySlug, { slug: "atelier-one" }),
    ).toBeNull();

    await owner.mutation(api.listing.publishOrg, { orgId });
    expect(
      await t.query(api.publicSite.getBySlug, { slug: "ATELIER-ONE" }),
    ).toBeNull();

    await owner.mutation(api.website.publish, { orgId });
    expect(
      await t.query(api.publicSite.getBySlug, { slug: " ATELIER-ONE " }),
    ).toMatchObject({
      _id: orgId,
      name: "Atelier One",
      slug: "atelier-one",
      beautyCategory: "hair_salon",
    });

    await owner.mutation(api.website.unpublish, { orgId });
    expect(
      await t.query(api.publicSite.getBySlug, { slug: "atelier-one" }),
    ).toBeNull();

    await t.run(async (ctx) => {
      await ctx.db.insert("orgs", {
        name: "Dormant Hospitality Site",
        slug: "dormant-hospitality-site",
        industry: "hospitality",
        listingStatus: "unpublished",
        websiteStatus: "published",
        websitePublishedAt: Date.now(),
        reviewCount: 0,
        averageRating: 0,
        plan: "free",
        source: "customer",
        isDeleted: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });
    expect(
      await t.query(api.publicSite.getBySlug, {
        slug: "dormant-hospitality-site",
      }),
    ).toBeNull();
  });

  test("omits services with no active assigned staff from public profiles", async () => {
    const { owner, orgId } = await completeBeautySetup(t);
    const secondaryStaffId = await owner.mutation(api.staff.createStaffMember, {
      orgId,
      displayName: "Secondary Provider",
      role: "staff",
      specialties: ["Colour"],
    });
    await owner.mutation(api.services.createService, {
      orgId,
      name: "Secondary Service",
      consumerDescription: "Available from the secondary provider.",
      durationMins: 30,
      priceMinorUnits: 900,
      currency: "MKD",
      staffIds: [secondaryStaffId],
      sortOrder: 1,
      isOpusVisible: true,
    });
    await owner.mutation(api.listing.publishOrg, { orgId });
    await owner.mutation(api.website.publish, { orgId });

    const beforeDeactivation = await t.query(api.publicSite.getBySlug, {
      slug: "atelier-one",
    });
    expect(beforeDeactivation?.services.map((service) => service.name)).toEqual(
      ["Signature Cut", "Secondary Service"],
    );

    await owner.mutation(api.staff.deactivateStaffMember, {
      orgId,
      staffId: secondaryStaffId,
    });

    const websiteProfile = await t.query(api.publicSite.getBySlug, {
      slug: "atelier-one",
    });
    const marketplaceProfile = await t.query(api.public.getPublicProfile, {
      slug: "atelier-one",
    });
    expect(websiteProfile?.services.map((service) => service.name)).toEqual([
      "Signature Cut",
    ]);
    expect(marketplaceProfile?.services.map((service) => service.name)).toEqual(
      ["Signature Cut"],
    );
    expect(
      websiteProfile?.staff.map((staff) => staff.displayName),
    ).not.toContain("Secondary Provider");
  });

  test("suspends and restores only the website as services are updated or created", async () => {
    const { owner, orgId, serviceId } = await completeBeautySetup(t);
    await owner.mutation(api.listing.publishOrg, { orgId });
    await owner.mutation(api.website.publish, { orgId });

    await owner.mutation(api.services.updateService, {
      orgId,
      serviceId,
      isActive: false,
    });
    expect(await t.run(async (ctx) => await ctx.db.get(orgId))).toMatchObject({
      listingStatus: "published",
      websiteStatus: "suspended",
    });
    expect(
      await t.query(api.publicSite.getBySlug, { slug: "atelier-one" }),
    ).toBeNull();

    const replacementServiceId = await owner.mutation(
      api.activation.saveFirstService,
      {
        name: "Restored Service",
        durationMins: 30,
        priceMinorUnits: 1200,
      },
    );
    expect(await t.run(async (ctx) => await ctx.db.get(orgId))).toMatchObject({
      listingStatus: "published",
      websiteStatus: "published",
    });
    expect(
      await t.query(api.publicSite.getBySlug, { slug: "atelier-one" }),
    ).not.toBeNull();

    await owner.mutation(api.services.updateService, {
      orgId,
      serviceId: replacementServiceId,
      isActive: false,
    });
    expect(await t.run(async (ctx) => await ctx.db.get(orgId))).toMatchObject({
      listingStatus: "published",
      websiteStatus: "suspended",
    });
    expect(
      await t.query(api.publicSite.getBySlug, { slug: "atelier-one" }),
    ).toBeNull();

    await owner.mutation(api.services.updateService, {
      orgId,
      serviceId,
      isActive: true,
    });
    expect(await t.run(async (ctx) => await ctx.db.get(orgId))).toMatchObject({
      listingStatus: "published",
      websiteStatus: "published",
    });

    const websiteStatusEvents = await t.run(async (ctx) => {
      const events = await ctx.db
        .query("audit_log")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .collect();
      return events
        .map((event) => event.action)
        .filter((action) => action.startsWith("org.website_status."));
    });
    expect(websiteStatusEvents).toEqual([
      "org.website_status.suspended",
      "org.website_status.published",
      "org.website_status.suspended",
      "org.website_status.published",
    ]);
  });

  test("restores a suspended website when copied availability makes the owner bookable again", async () => {
    const { owner, orgId } = await completeBeautySetup(t);
    await owner.mutation(api.listing.publishOrg, { orgId });
    await owner.mutation(api.website.publish, { orgId });

    const sourceStaffId = await owner.mutation(api.staff.createStaffMember, {
      orgId,
      displayName: "Schedule Source",
      role: "staff",
      specialties: [],
    });
    await owner.mutation(api.availability.setAvailabilityRule, {
      orgId,
      staffId: sourceStaffId,
      dayOfWeek: 1,
      startTime: "09:00",
      endTime: "17:00",
      isActive: true,
    });

    const activeOwnerRules = await t.run(async (ctx) => {
      const ownerMember = await ctx.db
        .query("staff_members")
        .withIndex("by_org_role", (q) =>
          q.eq("orgId", orgId).eq("role", "owner"),
        )
        .first();
      if (!ownerMember) throw new Error("Owner fixture is missing");
      return await ctx.db
        .query("availability_rules")
        .withIndex("by_staff", (q) => q.eq("staffId", ownerMember._id))
        .filter((q) =>
          q.and(
            q.eq(q.field("isActive"), true),
            q.eq(q.field("isDeleted"), false),
          ),
        )
        .collect();
    });
    for (const rule of activeOwnerRules) {
      await owner.mutation(api.availability.deleteAvailabilityRule, {
        orgId,
        ruleId: rule._id,
      });
    }

    expect(await t.run(async (ctx) => await ctx.db.get(orgId))).toMatchObject({
      listingStatus: "published",
      websiteStatus: "suspended",
    });

    await owner.mutation(api.availability.copyScheduleToAllStaff, {
      orgId,
      sourceStaffId,
    });

    expect(await t.run(async (ctx) => await ctx.db.get(orgId))).toMatchObject({
      listingStatus: "published",
      websiteStatus: "published",
    });
    expect(
      await t.query(api.publicSite.getBySlug, { slug: "atelier-one" }),
    ).not.toBeNull();
  });

  test("soft deletes media without blocking the public listing", async () => {
    const { owner, orgId } = await completeBeautySetup(t);
    await owner.mutation(api.listing.publishOrg, { orgId });
    const media = await owner.query(api.orgMedia.listByOrg, { orgId });

    await owner.mutation(api.orgMedia.removeMedia, {
      orgId,
      mediaId: media[0]._id,
    });

    const deletedMedia = await t.run(
      async (ctx) => await ctx.db.get(media[0]._id),
    );
    const org = await t.run(async (ctx) => await ctx.db.get(orgId));
    expect(deletedMedia?.isDeleted).toBe(true);
    expect(deletedMedia?.deletedAt).toEqual(expect.any(Number));
    expect(org?.listingStatus).toBe("published");
  });

  test("exposes real public availability and atomically rejects slot conflicts", async () => {
    const { owner, orgId, serviceId } = await completeBeautySetup(t);
    await owner.mutation(api.listing.publishOrg, { orgId });

    const nextMonday = new Date();
    const daysUntilMonday = (8 - nextMonday.getUTCDay()) % 7 || 7;
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
      }),
    ).rejects.toThrow("outside working hours or no longer available");

    const booking = await owner.mutation(
      api.publicBooking.createPublicBooking,
      {
        orgId,
        serviceId,
        staffId,
        startAt: slot.startAt,
        customerName: "Marketplace Customer",
        customerPhone: "+38970123456",
      },
    );
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
      }),
    ).rejects.toThrow("no longer available");
  });

  test("allows website-only guests to book and rejects a conflicting guest", async () => {
    const { owner, orgId, serviceId } = await completeBeautySetup(t);
    await owner.mutation(api.website.publish, { orgId });

    const nextMonday = new Date();
    const daysUntilMonday = (8 - nextMonday.getUTCDay()) % 7 || 7;
    nextMonday.setUTCDate(nextMonday.getUTCDate() + daysUntilMonday);
    const date = nextMonday.toISOString().slice(0, 10);
    const slots = await t.query(api.publicBooking.getPublicSlots, {
      orgId,
      serviceId,
      staffId: "any",
      date,
    });
    expect(slots.length).toBeGreaterThan(0);
    const slot = slots[0];
    const staffId = slot.availableStaffIds[0];

    const created = await createVerifiedGuestBooking(t, {
      orgId,
      serviceId,
      staffId,
      startAt: slot.startAt,
      customerName: " Website Guest ",
      customerPhone: "+389 70 123 456",
      customerEmail: " GUEST@EXAMPLE.COM ",
    });
    expect(created).toMatchObject({
      serviceName: "Signature Cut",
      startAt: slot.startAt,
      priceMinorUnits: 1800,
    });
    expect(
      await t.run(async (ctx) => await ctx.db.get(created.bookingId)),
    ).toMatchObject({ status: "confirmed", source: "web" });

    await expect(
      createVerifiedGuestBooking(t, {
        orgId,
        serviceId,
        staffId,
        startAt: slot.startAt,
        customerName: "Conflicting Website Guest",
        customerPhone: "+38970123457",
        customerEmail: "conflict@example.com",
      }),
    ).rejects.toThrow("no longer available");
  });

  test("includes the booking-window boundary and rejects the following date", async () => {
    const { owner, orgId, serviceId } = await completeBeautySetup(t);
    await owner.mutation(api.activation.saveHours, {
      openingHours: openingHours.map((hours) => ({
        ...hours,
        isClosed: false,
      })),
    });
    await owner.mutation(api.orgSettings.updateOrgSettings, {
      orgId,
      timezone: "Europe/Belgrade",
      currency: "MKD",
      locale: "mk-MK",
      slotDurationMins: 15,
      bookingWindowDays: 2,
      cancellationWindowHours: 24,
      bufferTimeMins: 0,
    });
    await owner.mutation(api.website.publish, { orgId });

    const today = dateInTimezone("Europe/Belgrade");
    const boundaryDate = addCalendarDays(today, 1);
    const outsideDate = addCalendarDays(today, 2);
    const boundarySlots = await t.query(api.publicBooking.getPublicSlots, {
      orgId,
      serviceId,
      staffId: "any",
      date: boundaryDate,
    });

    expect(boundarySlots.length).toBeGreaterThan(0);
    expect(
      await t.query(api.publicBooking.getPublicSlots, {
        orgId,
        serviceId,
        staffId: "any",
        date: outsideDate,
      }),
    ).toEqual([]);

    await expect(
      createVerifiedGuestBooking(t, {
        orgId,
        serviceId,
        staffId: boundarySlots[0].availableStaffIds[0],
        startAt: new Date(`${outsideDate}T09:00:00.000Z`).getTime(),
        customerName: "Outside Window",
        customerPhone: "+38970123458",
        customerEmail: "outside@example.com",
      }),
    ).rejects.toThrow("outside the allowed booking window");
  });

  test("returns no public slots for an explicit staff member from another organization", async () => {
    const { owner, orgId, serviceId } = await completeBeautySetup(t);
    await owner.mutation(api.website.publish, { orgId });

    const otherOwner = await createOwner(t, "owner-foreign-staff");
    const otherOrgId = await otherOwner.mutation(
      api.activation.startBeautyBusiness,
      { name: "Other Tenant", category: "beauty_salon" },
    );
    const foreignStaffId = await t.run(async (ctx) => {
      const staff = await ctx.db
        .query("staff_members")
        .withIndex("by_org", (q) => q.eq("orgId", otherOrgId))
        .first();
      if (!staff) throw new Error("Foreign staff fixture is missing");
      return staff._id;
    });

    const nextMonday = new Date();
    const daysUntilMonday = (8 - nextMonday.getUTCDay()) % 7 || 7;
    nextMonday.setUTCDate(nextMonday.getUTCDate() + daysUntilMonday);

    expect(
      await t.query(api.publicBooking.getPublicSlots, {
        orgId,
        serviceId,
        staffId: foreignStaffId,
        date: nextMonday.toISOString().slice(0, 10),
      }),
    ).toEqual([]);
  });

  test("keeps published hospitality records dormant across public discovery and booking", async () => {
    const { owner, orgId, serviceId } = await completeBeautySetup(t);
    await owner.mutation(api.listing.publishOrg, { orgId });

    const hospitalityOrgId = await t.run(
      async (ctx) =>
        await ctx.db.insert("orgs", {
          name: "Dormant Dining Room",
          slug: "dormant-dining-room",
          industry: "hospitality",
          city: "Skopje",
          listingStatus: "published",
          publishedAt: Date.now(),
          reviewCount: 0,
          averageRating: 0,
          plan: "free",
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
    const daysUntilMonday = (8 - nextMonday.getUTCDay()) % 7 || 7;
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
      }),
    ).rejects.toThrow("not currently accepting bookings");
  });

  test("protects staff booking actions and validates reschedule availability", async () => {
    const { owner, orgId, serviceId } = await completeBeautySetup(t);
    await owner.mutation(api.listing.publishOrg, { orgId });

    const nextMonday = new Date();
    const daysUntilMonday = (8 - nextMonday.getUTCDay()) % 7 || 7;
    nextMonday.setUTCDate(nextMonday.getUTCDate() + daysUntilMonday);
    const date = nextMonday.toISOString().slice(0, 10);
    const slots = await owner.query(api.publicBooking.getPublicSlots, {
      orgId,
      serviceId,
      staffId: "any",
      date,
    });
    const staffId = slots[0].availableStaffIds[0];
    const created = await owner.mutation(
      api.publicBooking.createPublicBooking,
      {
        orgId,
        serviceId,
        staffId,
        startAt: slots[0].startAt,
        customerName: "Lifecycle Customer",
        customerPhone: "+38970000222",
      },
    );

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

    await owner.mutation(api.bookings.completeBooking, {
      orgId,
      bookingId: created.bookingId,
    });
    expect(
      await t.run(async (ctx) => (await ctx.db.get(created.bookingId))?.status),
    ).toBe("completed");
  });

  test("allows owner to update and remove business logo", async () => {
    const t = createBackend();
    const { owner, orgId } = await completeBeautySetup(t);

    const storageId = await t.run(async (ctx) => {
      return await ctx.storage.store(
        new Blob(["logo-data"], { type: "image/png" }),
      );
    });

    const logoUrl = await owner.mutation(api.orgSettings.updateLogo, {
      orgId,
      storageId,
    });
    expect(logoUrl).toBeTruthy();

    await owner.mutation(api.website.publish, { orgId });

    const orgWithLogo = await t.run(async (ctx) => await ctx.db.get(orgId));
    expect(orgWithLogo?.logoUrl).toBe(logoUrl);

    await owner.mutation(api.orgSettings.removeLogo, { orgId });

    const orgWithoutLogo = await t.run(async (ctx) => await ctx.db.get(orgId));
    expect(orgWithoutLogo?.logoUrl).toBeUndefined();
    expect(orgWithoutLogo?.websiteStatus).toBe("suspended");
  });
});
