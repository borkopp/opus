import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import betterAuthTest from "@convex-dev/better-auth/test";
import { api, components } from "../../convex/_generated/api";
import schema from "../../convex/schema";
import { convexModules } from "../../convex-test.setup";
import { validateReservationSettings } from "../../convex/lib/hospitalitySettingsValidation";

const createBackend = () => {
  const backend = convexTest(schema, convexModules);
  betterAuthTest.register(backend);
  return backend;
};
type Backend = ReturnType<typeof createBackend>;
const rules = {
  timezone: "Europe/Skopje",
  defaultDurationMins: 90,
  minDurationMins: 15,
  maxDurationMins: 240,
  bufferMins: 15,
  slotIntervalMins: 15,
  bookingWindowDays: 60,
  minAdvanceBookingHours: 0,
  minPartySize: 1,
  maxPartySize: 8,
  cancellationWindowHours: 24,
  noShowGraceMins: 15,
  walkInsAccepted: true,
  reminderHoursBefore: [24, 2],
  servicePeriods: [
    {
      name: "Dinner",
      startTime: "18:00",
      endTime: "23:00",
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      endDayOffset: 0 as const,
    },
  ],
};
async function login(
  t: Backend,
  email = "venue-owner@example.test",
  verified = true,
  jwtEmail = email,
) {
  const authUser = await t.mutation(components.betterAuth.adapter.create, {
    input: {
      model: "user",
      data: {
        email,
        emailVerified: verified,
        name: "Venue owner",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    },
  });
  const session = await t.mutation(components.betterAuth.adapter.create, {
    input: {
      model: "session",
      data: {
        userId: authUser._id,
        token: crypto.randomUUID(),
        expiresAt: Date.now() + 3_600_000,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    },
  });
  const client = t.withIdentity({
    subject: authUser._id,
    sessionId: session._id,
    email: jwtEmail,
    emailVerified: true,
  });
  const userId = await client.mutation(api.users.ensureUser);
  return { client, userId };
}
async function venue(t: Backend, email = "venue-owner@example.test") {
  const account = await login(t, email);
  const orgId = await account.client.mutation(api.hospitality.startVenue, {
    name: "Evening café",
    venueType: "cafe",
  });
  return { ...account, orgId };
}
async function readyVenue(t: Backend, email = "venue-owner@example.test") {
  const account = await venue(t, email);
  await account.client.mutation(api.hospitality.saveProfile, {
    name: "Evening café",
    venueType: "cafe",
    address: "Main Street 10",
    city: "Skopje",
    phone: "+38970123456",
  });
  await account.client.mutation(api.hospitality.saveSettings, rules);
  const state = await account.client.query(api.hospitality.getWorkspace);
  const tableId = await account.client.mutation(api.hospitality.saveTable, {
    areaId: state.areas[0]._id,
    label: "T1",
    capacity: 4,
    minPartySize: 1,
    isActive: true,
  });
  return { ...account, tableId, areaId: state.areas[0]._id };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-12T10:00:00Z"));
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("verified hospitality owner setup", () => {
  it("requires actual account verification, not forged verified-email claims", async () => {
    const t = createBackend();
    const unverified = await login(t, "venue-owner@example.test", false);
    await expect(
      unverified.client.mutation(api.hospitality.startVenue, {
        name: "Blocked",
        venueType: "cafe",
      }),
    ).rejects.toThrow("unavailable");
    const forged = await login(
      t,
      "outsider@example.test",
      false,
      "second-owner@example.test",
    );
    await expect(
      forged.client.mutation(api.hospitality.startVenue, {
        name: "Blocked",
        venueType: "restaurant",
      }),
    ).rejects.toThrow("unavailable");
    expect(await t.run((ctx) => ctx.db.query("orgs").collect())).toHaveLength(
      0,
    );
  });

  it("creates only administrative membership, resumes creation, and requires real readiness before publication", async () => {
    const t = createBackend();
    const owner = await venue(t);
    expect(
      await owner.client.mutation(api.hospitality.startVenue, {
        name: "Do not duplicate",
        venueType: "restaurant",
      }),
    ).toBe(owner.orgId);
    const workspace = await owner.client.query(api.hospitality.getWorkspace);
    expect(workspace.settings?.schemaVersion).toBe(2);
    expect(workspace.readiness.ready).toBe(false);
    await expect(
      owner.client.mutation(api.hospitality.publish, { published: true }),
    ).rejects.toThrow("Complete setup");
    const resources = await t.run(async (ctx) => ({
      services: await ctx.db
        .query("services")
        .withIndex("by_org", (q) => q.eq("orgId", owner.orgId))
        .collect(),
      availability: await ctx.db
        .query("availability_rules")
        .withIndex("by_org", (q) => q.eq("orgId", owner.orgId))
        .collect(),
      staff: await ctx.db
        .query("staff_members")
        .withIndex("by_org", (q) => q.eq("orgId", owner.orgId))
        .collect(),
    }));
    expect(resources.services).toHaveLength(0);
    expect(resources.availability).toHaveLength(0);
    expect(resources.staff).toHaveLength(1);
    expect(resources.staff[0].role).toBe("owner");
  });

  it.each(["restaurant", "cafe"] as const)(
    "opens the %s dashboard after name and type without allowing public reservations",
    async (venueType) => {
      const t = createBackend();
      const owner = await login(t);
      expect(await owner.client.query(api.hospitality.getAccess)).toMatchObject(
        {
          hasVenue: false,
          onboardingComplete: false,
        },
      );
      const orgId = await owner.client.mutation(api.hospitality.startVenue, {
        name: "New venue",
        venueType,
      });
      expect(await owner.client.query(api.hospitality.getAccess)).toMatchObject(
        {
          available: true,
          hasVenue: true,
          onboardingComplete: true,
        },
      );
      const workspace = await owner.client.query(api.hospitality.getWorkspace);
      expect(workspace.org).toMatchObject({
        _id: orgId,
        name: "New venue",
        venueType,
        websiteStatus: "unpublished",
      });
      expect(workspace.org.websitePublishedAt).toBeUndefined();
      expect(workspace.settings?.servicePeriods).toEqual([]);
      expect(workspace.canReadReservations).toBe(true);
      expect(workspace.canCreateReservations).toBe(false);
      expect(workspace.tables).toEqual([]);
      expect(workspace.readiness.ready).toBe(false);
      const date = "2026-10-12";
      expect(
        await owner.client.query(api.reservations.listDay, { date }),
      ).toEqual([]);
      expect(
        await owner.client.query(api.reservations.getDaySummary, { date }),
      ).toEqual({
        reservations: 0,
        covers: 0,
        cancellations: 0,
        noShows: 0,
      });
      expect(
        await owner.client.query(api.reservations.getSlots, {
          date,
          partySize: 2,
        }),
      ).toEqual([]);
      await expect(
        owner.client.mutation(api.hospitality.publish, { published: true }),
      ).rejects.toThrow("Complete setup");
      const slug = workspace.org.slug;
      expect(
        await t.query(api.reservationPublic.getVenue, { slug }),
      ).toBeNull();
      expect(
        await t.query(api.reservationPublic.getSlots, {
          slug,
          date,
          partySize: 2,
        }),
      ).toEqual([]);
      await expect(
        t.action(api.reservationPublic.requestOtp, {
          slug,
          email: "guest@example.test",
        }),
      ).rejects.toThrow("unavailable");
      await expect(
        t.action(api.reservationPublic.confirm, {
          slug,
          date,
          startAt: Date.now() + 3_600_000,
          partySize: 2,
          name: "Guest",
          email: "guest@example.test",
          idempotencyKey: "unpublished-venue-request",
        }),
      ).rejects.toThrow("unavailable");
      expect(
        await t.run((ctx) =>
          ctx.db
            .query("notifications")
            .withIndex("by_org", (q) => q.eq("orgId", orgId))
            .collect(),
        ),
      ).toEqual([]);
      expect(
        await t.run((ctx) =>
          ctx.db
            .query("reservations")
            .withIndex("by_org", (q) => q.eq("orgId", orgId))
            .collect(),
        ),
      ).toEqual([]);
    },
  );

  it("allows staff reservations at an operational private venue before completing its public profile", async () => {
    const t = createBackend();
    const owner = await venue(t);
    await owner.client.mutation(api.hospitality.saveSettings, rules);
    const initial = await owner.client.query(api.hospitality.getWorkspace);
    await owner.client.mutation(api.hospitality.saveTable, {
      areaId: initial.areas[0]._id,
      label: "T1",
      capacity: 4,
      minPartySize: 1,
      isActive: true,
    });
    const workspace = await owner.client.query(api.hospitality.getWorkspace);
    expect(workspace).toMatchObject({
      canReadReservations: true,
      canCreateReservations: true,
      org: { websiteStatus: "unpublished" },
      readiness: { ready: false },
    });
    expect(
      workspace.readiness.requirements.filter((item) => !item.complete),
    ).toMatchObject([{ code: "profile" }]);
    const slots = await owner.client.query(api.reservations.getSlots, {
      date: "2026-10-13",
      partySize: 2,
    });
    expect(slots.length).toBeGreaterThan(0);
    const reservation = await owner.client.mutation(
      api.reservations.createManual,
      {
        requestId: "private-venue-phone",
        serviceDate: "2026-10-13",
        startAt: slots[0].startAt,
        partySize: 2,
        customerName: "Phone guest",
        customerPhone: "+38970123456",
        source: "phone",
      },
    );
    expect(reservation.status).toBe("confirmed");
    expect(
      await owner.client.query(api.reservations.listDay, {
        date: "2026-10-13",
      }),
    ).toMatchObject([{ _id: reservation._id, customerName: "Phone guest" }]);
    await expect(
      owner.client.mutation(api.hospitality.publish, { published: true }),
    ).rejects.toThrow("Complete setup");
    expect(
      await t.query(api.reservationPublic.getVenue, {
        slug: workspace.org.slug,
      }),
    ).toBeNull();
  });

  it.each(["hours", "tables"] as const)(
    "keeps staff reservation creation unavailable without usable %s",
    async (missing) => {
      const t = createBackend();
      const owner = await readyVenue(t);
      const slots = await owner.client.query(api.reservations.getSlots, {
        date: "2026-10-13",
        partySize: 2,
      });
      if (missing === "hours") {
        await owner.client.mutation(api.hospitality.saveSettings, {
          ...rules,
          servicePeriods: [],
        });
      } else {
        await owner.client.mutation(api.hospitality.removeResource, {
          kind: "table",
          id: owner.tableId,
        });
      }
      expect(
        await owner.client.query(api.hospitality.getWorkspace),
      ).toMatchObject({
        canReadReservations: true,
        canCreateReservations: false,
        readiness: { ready: false },
      });
      expect(
        await owner.client.query(api.reservations.getSlots, {
          date: "2026-10-13",
          partySize: 2,
        }),
      ).toEqual([]);
      await expect(
        owner.client.mutation(api.reservations.createManual, {
          requestId: `missing-${missing}-booking`,
          serviceDate: "2026-10-13",
          startAt: slots[0].startAt,
          partySize: 2,
          customerName: "Guest",
          source: "phone",
        }),
      ).rejects.toThrow("no longer available");
      await expect(
        owner.client.mutation(api.hospitality.publish, { published: true }),
      ).rejects.toThrow("Complete setup");
    },
  );

  it("keeps a legacy venue workspace accessible when reservation settings are missing", async () => {
    const t = createBackend();
    const owner = await login(t);
    await t.run(async (ctx) => {
      const now = Date.now();
      const orgId = await ctx.db.insert("orgs", {
        name: "Preserved café",
        slug: "preserved-cafe",
        industry: "hospitality",
        venueType: "cafe",
        plan: "free",
        listingStatus: "unpublished",
        reviewCount: 0,
        averageRating: 0,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.insert("staff_members", {
        orgId,
        userId: owner.userId,
        displayName: "Owner",
        specialties: [],
        role: "owner",
        isActive: true,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.patch(owner.userId, { activeOrgId: orgId });
    });
    expect(await owner.client.query(api.hospitality.getAccess)).toMatchObject({
      hasVenue: true,
      onboardingComplete: true,
    });
    expect(
      await owner.client.query(api.hospitality.getWorkspace),
    ).toMatchObject({
      settings: null,
      canReadReservations: false,
      canCreateReservations: false,
      readiness: { ready: false },
    });
    await expect(
      owner.client.query(api.reservations.listDay, { date: "2026-10-12" }),
    ).rejects.toThrow("setup is incomplete");
  });

  it.each([
    { name: "legacy schema", patch: { schemaVersion: undefined } },
    { name: "invalid timezone", patch: { timezone: "Invalid/Zone" } },
    { name: "invalid duration", patch: { defaultDurationMins: 0 } },
  ])(
    "keeps $name settings from mounting reservation reads",
    async ({ patch }) => {
      const t = createBackend();
      const owner = await venue(t);
      const initial = await owner.client.query(api.hospitality.getWorkspace);
      await t.run((ctx) => ctx.db.patch(initial.settings!._id, patch));
      expect(await owner.client.query(api.hospitality.getAccess)).toMatchObject(
        {
          hasVenue: true,
          onboardingComplete: true,
        },
      );
      expect(
        await owner.client.query(api.hospitality.getWorkspace),
      ).toMatchObject({
        canReadReservations: false,
        canCreateReservations: false,
        readiness: { ready: false },
      });
      await expect(
        owner.client.query(api.reservations.listDay, { date: "2026-10-12" }),
      ).rejects.toThrow();
      await expect(
        owner.client.mutation(api.hospitality.publish, { published: true }),
      ).rejects.toThrow("Complete setup");
    },
  );

  it("lets a verified beauty owner create a separate venue and switch back without converting beauty", async () => {
    const t = createBackend();
    const owner = await login(t);
    const beauty = await owner.client.mutation(
      api.activation.startBeautyBusiness,
      { name: "Original beauty", category: "hair_salon" },
    );
    expect(
      (await owner.client.query(api.hospitality.getAccess)).canCreate,
    ).toBe(true);
    const venueId = await owner.client.mutation(api.hospitality.startVenue, {
      name: "New restaurant",
      venueType: "restaurant",
    });
    expect(venueId).not.toBe(beauty.orgId);
    expect((await t.run((ctx) => ctx.db.get(beauty.orgId)))?.industry).toBe(
      "beauty_wellness",
    );
    expect(await owner.client.query(api.users.listMemberships)).toHaveLength(2);
    await owner.client.mutation(api.users.switchOrg, { orgId: beauty.orgId });
    expect((await owner.client.query(api.users.getMyProfile))?.industry).toBe(
      "beauty_wellness",
    );
    await owner.client.mutation(api.users.switchOrg, { orgId: venueId });
    expect(
      (await owner.client.query(api.hospitality.getWorkspace)).org._id,
    ).toBe(venueId);
  });

  it("publishes valid overnight service and suspends after removing its only usable table", async () => {
    const t = createBackend();
    const owner = await readyVenue(t);
    await owner.client.mutation(api.hospitality.saveSettings, {
      ...rules,
      servicePeriods: [
        {
          name: "Late dinner",
          startTime: "20:00",
          endTime: "02:00",
          endDayOffset: 1,
          daysOfWeek: [5, 6],
          lastSeatingTime: "00:15",
        },
      ],
    });
    await owner.client.mutation(api.hospitality.publish, { published: true });
    expect((await t.run((ctx) => ctx.db.get(owner.orgId)))?.websiteStatus).toBe(
      "published",
    );
    await owner.client.mutation(api.hospitality.removeResource, {
      kind: "table",
      id: owner.tableId,
    });
    expect((await t.run((ctx) => ctx.db.get(owner.orgId)))?.websiteStatus).toBe(
      "suspended",
    );
    expect((await t.run((ctx) => ctx.db.get(owner.tableId)))?.isDeleted).toBe(
      true,
    );
  });

  it("keeps host operations separate from owner and manager permissions", async () => {
    const t = createBackend();
    const owner = await readyVenue(t);
    const host = await login(t, "host@example.test");
    const staffId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("staff_members", {
        orgId: owner.orgId,
        userId: host.userId,
        displayName: "Host",
        specialties: [],
        role: "staff",
        bookingAccess: "own",
        isActive: true,
        isDeleted: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      await ctx.db.patch(host.userId, { activeOrgId: owner.orgId });
      return id;
    });
    expect((await host.client.query(api.hospitality.getWorkspace)).role).toBe(
      "staff",
    );
    expect(
      (await host.client.query(api.hospitality.getWorkspace))
        .canCreateReservations,
    ).toBe(true);
    expect(
      await host.client.query(api.reservations.listDay, { date: "2026-10-13" }),
    ).toEqual([]);
    await expect(
      host.client.mutation(api.hospitality.saveSettings, rules),
    ).rejects.toThrow("Unauthorised");
    await expect(
      host.client.mutation(api.hospitality.publish, { published: true }),
    ).rejects.toThrow("Unauthorised");
    await owner.client.mutation(api.hospitality.updateTeamMember, {
      staffId,
      role: "manager",
      isActive: true,
    });
    await host.client.mutation(api.hospitality.saveSettings, rules);
    await expect(
      host.client.mutation(api.hospitality.publish, { published: true }),
    ).rejects.toThrow("Unauthorised");
    await owner.client.mutation(api.hospitality.updateTeamMember, {
      staffId,
      role: "staff",
      isActive: false,
    });
    await expect(
      host.client.query(api.hospitality.getWorkspace),
    ).rejects.toThrow();
  });

  it("allows any verified account without pilot configuration and ignores retired flags", async () => {
    vi.stubEnv("HOSPITALITY_ENABLED", "false");
    vi.stubEnv("HOSPITALITY_NEW_BOOKINGS_ENABLED", "false");
    vi.stubEnv("HOSPITALITY_PILOT_EMAILS", "someone-else@example.test");
    const t = createBackend();
    const owner = await readyVenue(t, "new-signup@example.test");
    expect(
      (await t.run((ctx) => ctx.db.get(owner.orgId)))?.hospitalityPilotEnabled,
    ).toBeUndefined();
    expect(await owner.client.query(api.hospitality.getAccess)).toMatchObject({
      available: true,
      hasVenue: true,
      onboardingComplete: true,
    });
    await t.run((ctx) =>
      ctx.db.patch(owner.orgId, { hospitalityPilotEnabled: false }),
    );
    await owner.client.mutation(api.users.switchOrg, { orgId: owner.orgId });
    expect(
      (await owner.client.query(api.hospitality.getWorkspace)).readiness.ready,
    ).toBe(true);
    await owner.client.mutation(api.hospitality.publish, { published: true });
    expect(
      (await owner.client.query(api.hospitality.getAccess)).onboardingComplete,
    ).toBe(true);
    await owner.client.mutation(api.hospitality.publish, { published: false });
    expect(
      (await owner.client.query(api.hospitality.getAccess)).onboardingComplete,
    ).toBe(true);
  });

  it("rejects foreign resource IDs and impossible combinations without writes", async () => {
    const t = createBackend();
    const first = await readyVenue(t);
    const second = await readyVenue(t, "second-owner@example.test");
    await expect(
      first.client.mutation(api.hospitality.saveTable, {
        tableId: second.tableId,
        areaId: first.areaId,
        label: "Stolen",
        capacity: 2,
        minPartySize: 1,
        isActive: true,
      }),
    ).rejects.toThrow("unavailable");
    await expect(
      first.client.mutation(api.hospitality.saveCombination, {
        name: "Foreign",
        tableIds: [first.tableId, second.tableId],
        capacity: 8,
        minPartySize: 5,
        isActive: true,
      }),
    ).rejects.toThrow("same area");
    const another = await first.client.mutation(api.hospitality.saveTable, {
      areaId: first.areaId,
      label: "T2",
      capacity: 2,
      minPartySize: 1,
      isActive: true,
    });
    await expect(
      first.client.mutation(api.hospitality.saveCombination, {
        name: "Too large",
        tableIds: [first.tableId, another],
        capacity: 7,
        minPartySize: 5,
        isActive: true,
      }),
    ).rejects.toThrow("capacity");
    const combination = await first.client.mutation(
      api.hospitality.saveCombination,
      {
        name: "T1+T2",
        tableIds: [first.tableId, another],
        capacity: 6,
        minPartySize: 5,
        isActive: true,
      },
    );
    expect(
      (await t.run((ctx) => ctx.db.get(combination)))?.tableIds,
    ).toHaveLength(2);
  });

  it("protects future allocations from table removal, capacity changes, and intersecting closures", async () => {
    const t = createBackend();
    const owner = await readyVenue(t);
    const slots = await owner.client.query(api.reservations.getSlots, {
      date: "2026-10-13",
      partySize: 2,
    });
    const booking = await owner.client.mutation(api.reservations.createManual, {
      requestId: "protect-resource",
      serviceDate: "2026-10-13",
      startAt: slots[0].startAt,
      partySize: 2,
      customerName: "Guest",
      source: "phone",
    });
    await expect(
      owner.client.mutation(api.hospitality.removeResource, {
        kind: "table",
        id: owner.tableId,
      }),
    ).rejects.toThrow("existing reservations");
    await expect(
      owner.client.mutation(api.hospitality.saveTable, {
        tableId: owner.tableId,
        areaId: owner.areaId,
        label: "T1",
        capacity: 2,
        minPartySize: 1,
        isActive: true,
      }),
    ).rejects.toThrow("existing reservations");
    await expect(
      owner.client.mutation(api.hospitality.saveClosure, {
        tableIds: [],
        startAt: booking.startAt,
        endAt: booking.endAt,
        reason: "Closed",
      }),
    ).rejects.toThrow("conflicting reservations");
    await expect(
      owner.client.mutation(api.hospitality.saveClosure, {
        tableIds: [owner.tableId],
        startAt: booking.endAt,
        endAt: booking.endAt + 60_000,
        reason: "Conflicts with reset buffer",
      }),
    ).rejects.toThrow("conflicting reservations");
    expect(
      (
        await owner.client.query(api.reservations.listDay, {
          date: "2026-10-13",
        })
      )[0].status,
    ).toBe("confirmed");
  });

  it("requires reconfiguring active combinations before changing their physical tables", async () => {
    const t = createBackend();
    const owner = await readyVenue(t);
    const second = await owner.client.mutation(api.hospitality.saveTable, {
      areaId: owner.areaId,
      label: "T2",
      capacity: 2,
      minPartySize: 1,
      isActive: true,
    });
    const combo = await owner.client.mutation(api.hospitality.saveCombination, {
      name: "Together",
      tableIds: [owner.tableId, second],
      capacity: 6,
      minPartySize: 5,
      isActive: true,
    });
    await expect(
      owner.client.mutation(api.hospitality.saveTable, {
        tableId: second,
        areaId: owner.areaId,
        label: "T2",
        capacity: 1,
        minPartySize: 1,
        isActive: true,
      }),
    ).rejects.toThrow("combination");
    await expect(
      owner.client.mutation(api.hospitality.removeResource, {
        kind: "table",
        id: second,
      }),
    ).rejects.toThrow("combination");
    await owner.client.mutation(api.hospitality.saveCombination, {
      combinationId: combo,
      name: "Together",
      tableIds: [owner.tableId, second],
      capacity: 6,
      minPartySize: 5,
      isActive: false,
    });
    await owner.client.mutation(api.hospitality.saveTable, {
      tableId: second,
      areaId: owner.areaId,
      label: "T2",
      capacity: 2,
      minPartySize: 1,
      isActive: false,
    });
    expect((await t.run((ctx) => ctx.db.get(second)))?.status).toBe("inactive");
    await owner.client.mutation(api.hospitality.saveTable, {
      tableId: second,
      areaId: owner.areaId,
      label: "T2",
      capacity: 2,
      minPartySize: 1,
      isActive: true,
    });
    expect((await t.run((ctx) => ctx.db.get(second)))?.status).toBe(
      "available",
    );
  });

  it("rejects publication when preserved resources cannot form a valid allocation", async () => {
    const t = createBackend();
    const owner = await readyVenue(t);
    for (const capacity of [0, 1.5]) {
      await t.run((ctx) => ctx.db.patch(owner.tableId, { capacity }));
      expect(
        (await owner.client.query(api.hospitality.getWorkspace)).readiness
          .ready,
      ).toBe(false);
      expect(
        await owner.client.query(api.reservations.getSlots, {
          date: "2026-10-13",
          partySize: 1,
        }),
      ).toEqual([]);
    }
    await t.run((ctx) => ctx.db.patch(owner.tableId, { capacity: 4 }));
    await owner.client.mutation(api.hospitality.saveSettings, {
      ...rules,
      minPartySize: 5,
    });
    const second = await owner.client.mutation(api.hospitality.saveTable, {
      areaId: owner.areaId,
      label: "T2",
      capacity: 2,
      minPartySize: 1,
      isActive: true,
    });
    const combo = await owner.client.mutation(api.hospitality.saveCombination, {
      name: "Together",
      tableIds: [owner.tableId, second],
      capacity: 6,
      minPartySize: 5,
      isActive: true,
    });
    expect(
      (await owner.client.query(api.hospitality.getWorkspace)).readiness.ready,
    ).toBe(true);
    await t.run((ctx) =>
      ctx.db.patch(combo, { tableIds: [owner.tableId, owner.tableId] }),
    );
    expect(
      (await owner.client.query(api.hospitality.getWorkspace)).readiness.ready,
    ).toBe(false);
    await t.run((ctx) =>
      ctx.db.patch(combo, {
        tableIds: [owner.tableId, second],
        minPartySize: 7,
      }),
    );
    expect(
      (await owner.client.query(api.hospitality.getWorkspace)).readiness.ready,
    ).toBe(false);
    await expect(
      owner.client.mutation(api.hospitality.publish, { published: true }),
    ).rejects.toThrow("Complete setup");
  });

  it("rejects publication for incomplete v2 UTC metadata or missing current allocations", async () => {
    const t = createBackend();
    const owner = await readyVenue(t);
    const slots = await owner.client.query(api.reservations.getSlots, {
      date: "2026-10-13",
      partySize: 2,
    });
    const reservation = await owner.client.mutation(
      api.reservations.createManual,
      {
        requestId: "readiness-allocation",
        serviceDate: "2026-10-13",
        startAt: slots[0].startAt,
        partySize: 2,
        customerName: "Guest",
        source: "phone",
      },
    );
    expect(
      (await owner.client.query(api.hospitality.getWorkspace)).readiness.ready,
    ).toBe(true);
    await t.run((ctx) =>
      ctx.db.patch(reservation._id, { timeModel: undefined }),
    );
    expect(
      await owner.client.query(api.hospitality.getWorkspace),
    ).toMatchObject({
      canCreateReservations: false,
      readiness: { ready: false },
    });
    await expect(
      owner.client.mutation(api.reservations.createManual, {
        requestId: "blocked-by-legacy",
        serviceDate: "2026-10-13",
        startAt: slots[1].startAt,
        partySize: 2,
        customerName: "Guest",
        source: "phone",
      }),
    ).rejects.toThrow("Legacy reservations require review");
    await t.run(async (ctx) => {
      await ctx.db.patch(reservation._id, { timeModel: "utc" });
      const allocations = await ctx.db
        .query("reservation_allocations")
        .withIndex("by_org_active", (q) =>
          q.eq("orgId", owner.orgId).eq("isActive", true),
        )
        .collect();
      for (const allocation of allocations)
        await ctx.db.patch(allocation._id, { isActive: false });
    });
    expect(
      await owner.client.query(api.hospitality.getWorkspace),
    ).toMatchObject({
      canCreateReservations: false,
      readiness: { ready: false },
    });
    await expect(
      owner.client.query(api.reservations.getSlots, {
        date: "2026-10-13",
        partySize: 2,
      }),
    ).rejects.toThrow("allocation needs staff review");
    await expect(
      owner.client.mutation(api.hospitality.publish, { published: true }),
    ).rejects.toThrow("Complete setup");
  });
});

describe("hospitality weekly settings validation", () => {
  it("rejects Sunday overlap caused by Saturday overnight service", () => {
    expect(() =>
      validateReservationSettings({
        ...rules,
        servicePeriods: [
          {
            name: "Saturday",
            startTime: "20:00",
            endTime: "02:00",
            endDayOffset: 1,
            daysOfWeek: [6],
          },
          {
            name: "Sunday",
            startTime: "01:00",
            endTime: "05:00",
            daysOfWeek: [0],
          },
        ],
      }),
    ).toThrow("overlap");
  });
  it("rejects last seating without sufficient reset time and accepts midnight service", () => {
    expect(() =>
      validateReservationSettings({
        ...rules,
        servicePeriods: [
          {
            name: "Late",
            startTime: "20:00",
            endTime: "02:00",
            endDayOffset: 1,
            lastSeatingTime: "00:30",
            daysOfWeek: [5],
          },
        ],
      }),
    ).toThrow("Last seating");
    expect(() =>
      validateReservationSettings({
        ...rules,
        servicePeriods: [
          {
            name: "Late",
            startTime: "20:00",
            endTime: "02:00",
            endDayOffset: 1,
            lastSeatingTime: "00:15",
            daysOfWeek: [5],
          },
        ],
      }),
    ).not.toThrow();
  });
});
