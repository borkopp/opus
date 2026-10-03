import { describe, expect, test } from "vitest";
import { convexTest } from "convex-test";
import betterAuthTest from "@convex-dev/better-auth/test";
import {
  makeFunctionReference,
  type GenericDatabaseWriter,
  type SystemDataModel,
} from "convex/server";
import { components } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import schema from "../../convex/schema";
import { convexModules } from "../../convex-test.setup";
import { OWNER_EMAIL } from "../../../shared/owner-access";
import type {
  OwnerActivityPage,
  OwnerOverview,
} from "../../../shared/owner-overview";
import type { Id } from "../../convex/_generated/dataModel";

const activity = makeFunctionReference<
  "query",
  {
    orgId: Id<"orgs">;
    kind: "bookings" | "audit" | "team";
    cursor: string | null;
    status: "all" | "confirmed" | "cancelled";
  },
  OwnerActivityPage
>("ownerActivity:page");

const overview = makeFunctionReference<
  "action",
  Record<string, never>,
  OwnerOverview
>("ownerAnalytics:overview");
const access = makeFunctionReference<
  "query",
  Record<string, never>,
  { email: string }
>("ownerAnalytics:access");
const createBackend = () => {
  const t = convexTest(schema, convexModules);
  betterAuthTest.register(t);
  return t;
};
type Backend = ReturnType<typeof createBackend>;

async function login(
  t: Backend,
  email = OWNER_EMAIL,
  verified = true,
  expired = false,
) {
  const user = await t.mutation(components.betterAuth.adapter.create, {
    input: {
      model: "user",
      data: {
        email,
        emailVerified: verified,
        name: "Test",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    },
  });
  const session = await t.mutation(components.betterAuth.adapter.create, {
    input: {
      model: "session",
      data: {
        userId: user._id,
        token: crypto.randomUUID(),
        expiresAt: Date.now() + (expired ? -1000 : 60_000),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    },
  });
  // Deliberately spoof the JWT email. The backend must use the auth record.
  return t.withIdentity({
    subject: user._id,
    sessionId: session._id,
    email: OWNER_EMAIL,
    emailVerified: true,
  });
}

async function org(t: Backend, name: string, extra: Partial<Doc<"orgs">> = {}) {
  return t.run((ctx) =>
    ctx.db.insert("orgs", {
      name,
      slug: name.toLowerCase(),
      industry: "beauty_wellness",
      plan: "free",
      listingStatus: "unpublished",
      reviewCount: 0,
      averageRating: 0,
      isDeleted: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...extra,
    }),
  );
}

describe("private platform-owner analytics", () => {
  test("rejects anonymous callers before reading data", async () => {
    const t = createBackend();
    await expect(t.action(overview, {})).rejects.toThrow(
      "Owner access required",
    );
    await expect(t.query(access, {})).rejects.toThrow("Owner access required");
  });

  test.each([
    ["studio-owner@example.com", true, false],
    [OWNER_EMAIL, false, false],
    [OWNER_EMAIL, true, true],
  ])(
    "rejects a different owner, unverified email or expired session: %s / %s / %s",
    async (email, verified, expired) => {
      const t = createBackend();
      const user = await login(t, email, verified, expired);
      await expect(user.action(overview, {})).rejects.toThrow(
        "Owner access required",
      );
      await expect(user.query(access, {})).rejects.toThrow(
        "Owner access required",
      );
    },
  );

  test("accepts the verified owner without requiring a studio membership", async () => {
    const t = createBackend();
    const owner = await login(t, OWNER_EMAIL.toUpperCase());
    await expect(owner.query(access, {})).resolves.toEqual({
      email: OWNER_EMAIL.toUpperCase(),
    });
    expect((await owner.action(overview, {})).totals).toMatchObject({
      businesses: 0,
      storedBytes: 0,
    });
  });

  test("reports true publication/plan state, deduplicates storage, excludes deleted and unclaimed imports", async () => {
    const t = createBackend();
    const owner = await login(t);
    const first = await org(t, "First", {
      plan: "paid",
      websiteStatus: "published",
    });
    const second = await org(t, "Second", {
      listingStatus: "published",
      websiteStatus: "suspended",
    });
    await org(t, "Legacy", { industry: "hospitality" });
    await org(t, "Deleted", { isDeleted: true });
    await org(t, "Imported", { source: "scraped", claimStatus: "unclaimed" });
    const file = await t.run((ctx) =>
      ctx.storage.store(
        new Blob([new Uint8Array(2000)], { type: "image/png" }),
      ),
    );
    await t.run(async (ctx) => {
      const url = (await ctx.storage.getUrl(file))!;
      await ctx.db.patch(first, { logoUrl: url });
      await ctx.db.patch(second, { logoUrl: url });
      const otherImage = await ctx.storage.store(
        new Blob([new Uint8Array(3000)], { type: "image/jpeg" }),
      );
      // convex-test 0.0.53 omits Blob MIME types from its storage metadata.
      // Supply realistic metadata in the fixture; production never writes it.
      const fixtureStorage =
        ctx.db as unknown as GenericDatabaseWriter<SystemDataModel>;
      await fixtureStorage.patch(file, { contentType: "image/png" });
      await fixtureStorage.patch(otherImage, { contentType: "image/jpeg" });
      await ctx.storage.store(
        new Blob([new Uint8Array(500)], { type: "text/plain" }),
      );
      await ctx.db.insert("org_media", {
        orgId: first,
        url,
        type: "gallery",
        sortOrder: 0,
        isDeleted: false,
        uploadedAt: Date.now(),
        updatedAt: Date.now(),
      });
      await ctx.db.insert("org_media", {
        orgId: first,
        url: "https://example.com/photo.jpg",
        type: "gallery",
        sortOrder: 1,
        isDeleted: false,
        uploadedAt: Date.now(),
        updatedAt: Date.now(),
      });
      await ctx.db.insert("org_media", {
        orgId: first,
        url: "https://example.com/deleted.jpg",
        type: "gallery",
        sortOrder: 2,
        isDeleted: true,
        uploadedAt: Date.now(),
        updatedAt: Date.now(),
      });
    });
    const result = await owner.action(overview, {});
    expect(result.totals).toMatchObject({
      businesses: 2,
      published: 1,
      suspended: 1,
      paid: 1,
      newBusinesses30d: 2,
      linkedImages: 1,
      linkedImageBytes: 2000,
      externalImages: 1,
      storedFiles: 3,
      storedBytes: 5500,
      storedImages: 2,
      storedImageBytes: 5000,
    });
    expect(result.businesses.find((row) => row.id === first)).toMatchObject({
      images: 1,
      imageBytes: 2000,
      externalImages: 1,
    });
    expect(result.businesses.find((row) => row.id === second)).toMatchObject({
      images: 1,
      imageBytes: 2000,
      websiteStatus: "suspended",
    });
  });

  test("paginates past 50 businesses and 200 tenant records without leaking other org records", async () => {
    const t = createBackend();
    const owner = await login(t);
    const first = await org(t, "First");
    const excluded = await org(t, "Excluded", { isDeleted: true });
    for (let i = 0; i < 51; i++) await org(t, `Business${i}`);
    await t.run(async (ctx) => {
      for (let i = 0; i < 205; i++) {
        await ctx.db.insert("customers", {
          orgId: first,
          name: `Customer ${i}`,
          phone: `+38970${i}`,
          totalVisits: 0,
          totalSpendMinorUnits: 0,
          noShowCount: 0,
          noShowRiskScore: 0,
          whatsappOptIn: false,
          marketingOptIn: false,
          isDeleted: i === 204,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
      await ctx.db.insert("customers", {
        orgId: excluded,
        name: "Excluded",
        phone: "+389700",
        totalVisits: 0,
        totalSpendMinorUnits: 0,
        noShowCount: 0,
        noShowRiskScore: 0,
        whatsappOptIn: false,
        marketingOptIn: false,
        isDeleted: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });
    const result = await owner.action(overview, {});
    expect(result.totals).toMatchObject({ businesses: 52, customers: 204 });
    expect(result.businesses.find((row) => row.id === first)?.customers).toBe(
      204,
    );
  });
});

async function activityFixture(t: Backend) {
  const orgId = await org(t, "Activity studio");
  return t.run(async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      name: "Owner Account",
      email: "studio@example.com",
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });
    const staffId = await ctx.db.insert("staff_members", {
      orgId,
      userId,
      displayName: "Ana",
      specialties: [],
      role: "owner",
      isActive: true,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });
    const customerId = await ctx.db.insert("customers", {
      orgId,
      name: "Elena",
      email: "elena@example.com",
      phone: "+38970123456",
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
    const serviceId = await ctx.db.insert("services", {
      orgId,
      name: "Manicure",
      durationMins: 30,
      priceMinorUnits: 120000,
      currency: "MKD",
      staffIds: [staffId],
      isOpusVisible: true,
      popularityScore: 0,
      isActive: true,
      isDeleted: false,
      sortOrder: 0,
      createdAt: now,
      updatedAt: now,
    });
    const booking = {
      orgId,
      customerId,
      staffId,
      serviceId,
      startAt: now + 3600000,
      endAt: now + 5400000,
      priceMinorUnits: 120000,
      currency: "MKD",
      surgePriceApplied: false,
      status: "confirmed" as const,
      source: "manual" as const,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    };
    const bookingId = await ctx.db.insert("bookings", booking);
    await ctx.db.insert("audit_log", {
      orgId,
      actorType: "staff",
      actorId: staffId,
      action: "booking.created",
      resourceType: "bookings",
      resourceId: bookingId,
      after: { status: "confirmed", token: "SECRET", providerKey: "PRIVATE" },
      createdAt: now,
    });
    return {
      orgId,
      staffId,
      userId,
      customerId,
      serviceId,
      bookingId,
      booking,
    };
  });
}

describe("owner business activity", () => {
  test.each(["bookings", "audit", "team"] as const)(
    "guards %s against anonymous and spoofed owners",
    async (kind) => {
      const t = createBackend();
      const { orgId } = await activityFixture(t);
      const args = { orgId, kind, cursor: null, status: "all" as const };
      await expect(t.query(activity, args)).rejects.toThrow(
        "Owner access required",
      );
      for (const [email, verified, expired] of [
        ["other@example.com", true, false],
        [OWNER_EMAIL, false, false],
        [OWNER_EMAIL, true, true],
      ] as const) {
        const isolated = createBackend();
        const isolatedFixture = await activityFixture(isolated);
        const user = await login(isolated, email, verified, expired);
        await expect(
          user.query(activity, { ...args, orgId: isolatedFixture.orgId }),
        ).rejects.toThrow("Owner access required");
      }
    },
  );
  test("rejects excluded business roots", async () => {
    const t = createBackend();
    const owner = await login(t);
    for (const extra of [
      { industry: "hospitality" as const },
      { isDeleted: true },
      { source: "scraped" as const, claimStatus: "unclaimed" as const },
    ]) {
      const orgId = await org(t, "Excluded", extra);
      await expect(
        owner.query(activity, {
          orgId,
          kind: "bookings",
          status: "all",
          cursor: null,
        }),
      ).rejects.toThrow("Business not available");
    }
  });
  test("resolves client and creator; sanitizes audit changes and foreign references", async () => {
    const t = createBackend();
    const owner = await login(t);
    const fixture = await activityFixture(t);
    const args = {
      orgId: fixture.orgId,
      kind: "bookings" as const,
      status: "all" as const,
      cursor: null,
    };
    const result = await owner.query(activity, args);
    expect(result.bookings).toHaveLength(1);
    expect(result.bookings[0]).toMatchObject({
      customer: { name: "Elena", email: "elena@example.com" },
      staff: "Ana",
      services: ["Manicure"],
      createdBy: "Ana",
      source: "manual",
      priceMinorUnits: 120000,
    });
    const audit = await owner.query(activity, { ...args, kind: "audit" });
    expect(audit.audit[0]).toMatchObject({
      actor: "Ana",
      changes: [{ field: "status", before: null, after: "confirmed" }],
    });
    expect(JSON.stringify(audit)).not.toMatch(/SECRET|PRIVATE/);
    const other = await activityFixture(t);
    await t.run(async (ctx) => {
      await ctx.db.patch(fixture.bookingId, {
        customerId: other.customerId,
        staffId: other.staffId,
        serviceId: other.serviceId,
      });
      await ctx.db.insert("audit_log", {
        orgId: fixture.orgId,
        actorType: "staff",
        actorId: other.staffId,
        action: "booking.updated",
        resourceType: "bookings",
        resourceId: fixture.bookingId,
        createdAt: Date.now(),
      });
    });
    const foreign = await owner.query(activity, args);
    expect(foreign.bookings[0]).toMatchObject({
      customer: { name: "Client unavailable", email: null, phone: null },
      staff: "Staff unavailable",
      services: ["Service unavailable"],
    });
    const foreignAudit = await owner.query(activity, {
      ...args,
      kind: "audit",
    });
    expect(foreignAudit.audit[0].actor).toBe("Staff · identity unavailable");
  });
  test("paginates bookings, filters status and keeps unknown creators honest", async () => {
    const t = createBackend();
    const owner = await login(t);
    const { orgId, booking } = await activityFixture(t);
    await t.run(async (ctx) => {
      for (let i = 0; i < 29; i++)
        await ctx.db.insert("bookings", {
          ...booking,
          status: "cancelled",
          isDeleted: i === 0,
        });
    });
    const args = {
      orgId,
      kind: "bookings" as const,
      status: "all" as const,
      cursor: null,
    };
    const first = await owner.query(activity, args);
    expect(first.isDone).toBe(false);
    expect(first.bookings[0].createdBy).toBe("Creator not recorded");
    const second = await owner.query(activity, {
      ...args,
      cursor: first.continueCursor,
    });
    expect(second.isDone).toBe(true);
    expect(first.bookings.length + second.bookings.length).toBe(29);
    expect(
      new Set([...first.bookings, ...second.bookings].map((row) => row.id))
        .size,
    ).toBe(29);
    const confirmed = await owner.query(activity, {
      ...args,
      status: "confirmed",
    });
    expect(confirmed.bookings).toHaveLength(1);
    expect(confirmed.bookings[0].status).toBe("confirmed");
  });
  test("uses retained session creation, never user updates, and returns no tokens", async () => {
    const t = createBackend();
    const owner = await login(t);
    const fixture = await activityFixture(t);
    const authUser = await t.mutation(components.betterAuth.adapter.create, {
      input: {
        model: "user",
        data: {
          name: "Ana",
          email: "ana@example.com",
          emailVerified: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      },
    });
    await t.run(async (ctx) => {
      await ctx.db.patch(fixture.userId, { authUserId: authUser._id });
      await ctx.db.insert("staff_members", {
        orgId: fixture.orgId,
        displayName: "Unlinked seat",
        role: "staff",
        specialties: [],
        isActive: false,
        isDeleted: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });
    const now = Date.now();
    for (const createdAt of [now - 86400000, now - 1000])
      await t.mutation(components.betterAuth.adapter.create, {
        input: {
          model: "session",
          data: {
            userId: authUser._id,
            token: `PRIVATE-${createdAt}`,
            createdAt,
            updatedAt: now,
            expiresAt: now + 60000,
          },
        },
      });
    const args = {
      orgId: fixture.orgId,
      kind: "team" as const,
      status: "all" as const,
      cursor: null,
    };
    const result = await owner.query(activity, args);
    expect(
      result.team.find((member) => member.id === fixture.staffId),
    ).toMatchObject({
      latestRetainedSignInAt: now - 1000,
      sessionExpiresAt: now + 60000,
      linkedAccount: true,
    });
    expect(
      result.team.find((member) => member.name === "Unlinked seat"),
    ).toMatchObject({
      latestRetainedSignInAt: null,
      linkedAccount: false,
      active: false,
    });
    expect(JSON.stringify(result)).not.toContain("PRIVATE");
    await t.mutation(components.betterAuth.adapter.deleteMany, {
      input: {
        model: "session",
        where: [{ field: "userId", operator: "eq", value: authUser._id }],
      },
      paginationOpts: { cursor: null, numItems: 25 },
    });
    const missing = await owner.query(activity, args);
    expect(
      missing.team.find((member) => member.id === fixture.staffId),
    ).toMatchObject({ latestRetainedSignInAt: null, linkedAccount: true });
  });
});
