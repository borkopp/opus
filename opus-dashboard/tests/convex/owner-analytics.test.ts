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
import type { OwnerOverview } from "../../../shared/owner-overview";

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
