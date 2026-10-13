import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import { api } from "../../convex/_generated/api";
import schema from "../../convex/schema";
import { convexModules } from "../../convex-test.setup";

async function fixture() {
  const backend = convexTest(schema, convexModules);
  const owner = backend.withIdentity({
    subject: "review-owner",
    email: "owner@example.com",
    name: "Owner",
  });
  await owner.mutation(api.users.ensureUser);
  const { orgId } = await owner.mutation(api.activation.startBeautyBusiness, {
    name: "Review Studio",
    category: "beauty_salon",
  });
  const serviceId = await owner.mutation(api.activation.saveFirstService, {
    name: "Treatment",
    durationMins: 30,
    priceMinorUnits: 1000,
  });
  const client = backend.withIdentity({
    subject: "review-client",
    email: "client@example.com",
    emailVerified: true,
  });
  const ids = await backend.run(async (ctx) => {
    const now = Date.now();
    await ctx.db.patch(orgId, { websiteStatus: "published" });
    const opusUserId = await ctx.db.insert("opus_users", {
      authUserId: "review-client",
      name: "Public Name",
      email: "client@example.com",
      avatarUrl: "https://example.com/avatar.png",
      opusPoints: 0,
      tier: "bronze",
      marketingOptIn: false,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });
    const customerId = await ctx.db.insert("customers", {
      orgId,
      opusUserId,
      name: "Private CRM Name",
      totalVisits: 1,
      totalSpendMinorUnits: 1000,
      noShowCount: 0,
      noShowRiskScore: 0,
      whatsappOptIn: false,
      marketingOptIn: false,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });
    const staff = await ctx.db
      .query("staff_members")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .first();
    const bookingId = await ctx.db.insert("bookings", {
      orgId,
      customerId,
      opusUserId,
      staffId: staff!._id,
      serviceId,
      startAt: now - 3600000,
      endAt: now - 1800000,
      priceMinorUnits: 1000,
      currency: "MKD",
      surgePriceApplied: false,
      status: "completed",
      source: "web",
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });
    const reviewId = await ctx.db.insert("reviews", {
      orgId,
      opusUserId,
      customerId,
      bookingId,
      rating: 5,
      body: "Lovely visit",
      reply: "Thank you",
      repliedByStaffId: staff!._id,
      repliedAt: now,
      isPublished: true,
      publishedAt: now,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });
    return { opusUserId, bookingId, reviewId };
  });
  return { backend, owner, client, orgId, ...ids };
}

describe("review public boundary", () => {
  it("allows one live review after an older review was soft-deleted", async () => {
    const s = await fixture();
    await s.backend.run((ctx) =>
      ctx.db.patch(s.reviewId, {
        isDeleted: true,
        deletedAt: Date.now(),
      }),
    );
    await s.client.mutation(api.reviews.create, {
      bookingId: s.bookingId,
      rating: 4,
    });
    const appointments = await s.client.query(api.opusUsers.getMyBookings);
    expect(
      appointments.find((booking) => booking._id === s.bookingId)?.hasReview,
    ).toBe(true);
    await expect(
      s.client.mutation(api.reviews.create, {
        bookingId: s.bookingId,
        rating: 5,
      }),
    ).rejects.toThrow("already exists");
  });

  it.each([0, -1, 1.5, 101])(
    "rejects an invalid public result limit: %s",
    async (limit) => {
      const s = await fixture();
      await expect(
        s.backend.query(api.reviews.listByOrg, {
          orgId: s.orgId,
          limit,
        }),
      ).rejects.toThrow("Review limit");
    },
  );

  it("returns public review content without account, booking or CRM references", async () => {
    const s = await fixture();
    const rows = await s.backend.query(api.reviews.listByOrg, {
      orgId: s.orgId,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      rating: 5,
      body: "Lovely visit",
      reviewerName: "Public Name",
    });
    for (const field of [
      "opusUserId",
      "customerId",
      "bookingId",
      "reservationId",
      "repliedByStaffId",
    ])
      expect(rows[0]).not.toHaveProperty(field);
  });

  it.each(["hospitality", "unpublished", "deleted"] as const)(
    "hides reviews for %s organizations",
    async (state) => {
      const s = await fixture();
      await s.backend.run((ctx) =>
        ctx.db.patch(
          s.orgId,
          state === "hospitality"
            ? { industry: "hospitality" }
            : state === "deleted"
              ? { isDeleted: true, deletedAt: Date.now() }
              : { websiteStatus: "unpublished", listingStatus: "unpublished" },
        ),
      );
      expect(
        await s.backend.query(api.reviews.listByOrg, { orgId: s.orgId }),
      ).toEqual([]);
    },
  );

  it("does not return an erased reviewer's name or avatar", async () => {
    const s = await fixture();
    await s.backend.run((ctx) =>
      ctx.db.patch(s.opusUserId, { isDeleted: true }),
    );
    const rows = await s.backend.query(api.reviews.listByOrg, {
      orgId: s.orgId,
    });
    expect(rows[0].reviewerName).toBe("Anonymous");
    expect(rows[0].reviewerAvatarUrl).toBeUndefined();
  });

  it.each(["hospitality", "deleted_booking"] as const)(
    "rejects new reviews for %s",
    async (state) => {
      const s = await fixture();
      await s.backend.run(async (ctx) => {
        await ctx.db.patch(s.reviewId, {
          isDeleted: true,
          deletedAt: Date.now(),
        });
        if (state === "hospitality")
          await ctx.db.patch(s.orgId, { industry: "hospitality" });
        else
          await ctx.db.patch(s.bookingId, {
            isDeleted: true,
            deletedAt: Date.now(),
          });
      });
      await expect(
        s.client.mutation(api.reviews.create, {
          bookingId: s.bookingId,
          rating: 5,
        }),
      ).rejects.toThrow();
    },
  );

  it("records owner replies in the tenant audit log", async () => {
    const s = await fixture();
    await s.owner.mutation(api.reviews.reply, {
      orgId: s.orgId,
      reviewId: s.reviewId,
      reply: "Thank you again",
    });
    const audit = await s.backend.run((ctx) =>
      ctx.db
        .query("audit_log")
        .withIndex("by_org", (q) => q.eq("orgId", s.orgId))
        .collect(),
    );
    expect(
      audit.some(
        (row) =>
          row.action === "review.replied" && row.resourceId === s.reviewId,
      ),
    ).toBe(true);
  });
});
