import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { convexTest } from "convex-test";
import betterAuthTest from "@convex-dev/better-auth/test";
import { makeFunctionReference } from "convex/server";
import schema from "../../convex/schema";
import { convexModules } from "../../convex-test.setup";
import { api, components, internal } from "../../convex/_generated/api";
import { OWNER_EMAIL } from "../../../shared/owner-access";
import type {
  OrganizationCleanupPreview,
  AssistantAllowance,
} from "../../../shared/owner-controls";
import type { Id } from "../../convex/_generated/dataModel";
import { CLEANUP_TABLES } from "../../convex/lib/ownerCleanup";
import { usageMonth } from "../../convex/analyst/limits";

const prepare = makeFunctionReference<
  "mutation",
  { orgId: Id<"orgs"> },
  OrganizationCleanupPreview
>("ownerCleanup:prepare");
const execute = makeFunctionReference<
  "mutation",
  { orgId: Id<"orgs">; confirmationId: string; slug: string },
  { deleted: boolean }
>("ownerCleanup:execute");
const allowance = makeFunctionReference<
  "query",
  { orgId: Id<"orgs"> },
  AssistantAllowance
>("ownerAssistant:get");
const update = makeFunctionReference<
  "mutation",
  {
    orgId: Id<"orgs">;
    operation: "reset" | "defaults" | "custom";
    limit?: number;
    deepLimit?: number;
  },
  AssistantAllowance
>("ownerAssistant:update");
function backend() {
  const t = convexTest(schema, convexModules);
  betterAuthTest.register(t);
  return t;
}
type Backend = ReturnType<typeof backend>;
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
        name: "Account",
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
        expiresAt: Date.now() + (expired ? -1 : 3_600_000),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    },
  });
  return {
    client: t.withIdentity({
      subject: user._id,
      sessionId: session._id,
      email: OWNER_EMAIL,
      emailVerified: true,
    }),
    user,
    session,
  };
}
async function fixture(t: Backend) {
  return t.run(async (ctx) => {
    const now = Date.now();
    const base = { isDeleted: false, createdAt: now, updatedAt: now };
    const org = {
      industry: "beauty_wellness" as const,
      plan: "paid" as const,
      listingStatus: "unpublished" as const,
      websiteStatus: "published" as const,
      reviewCount: 0,
      averageRating: 0,
      ...base,
    };
    const orgId = await ctx.db.insert("orgs", {
      ...org,
      name: "Test studio",
      slug: "test-studio",
    });
    const otherId = await ctx.db.insert("orgs", {
      ...org,
      name: "Real studio",
      slug: "real-studio",
    });
    const userId = await ctx.db.insert("users", {
      ...base,
      authUserId: "studio-client",
      email: "client@example.com",
      name: "Client and studio owner",
      activeOrgId: orgId,
    });
    const opusUserId = await ctx.db.insert("opus_users", {
      ...base,
      authUserId: "studio-client",
      email: "client@example.com",
      name: "Client",
      opusPoints: 1,
      tier: "bronze",
      marketingOptIn: false,
    });
    const staff = {
      ...base,
      orgId,
      userId,
      displayName: "Ana",
      specialties: [],
      role: "owner" as const,
      isActive: true,
    };
    const staffId = await ctx.db.insert("staff_members", staff);
    const unusedStaff = await ctx.db.insert("staff_members", {
      ...staff,
      userId: undefined,
      displayName: "Test seat",
    });
    const otherStaff = await ctx.db.insert("staff_members", {
      ...staff,
      orgId: otherId,
    });
    const service = {
      ...base,
      orgId,
      name: "Haircut",
      durationMins: 30,
      priceMinorUnits: 50000,
      currency: "MKD",
      staffIds: [staffId],
      isOpusVisible: true,
      popularityScore: 0,
      isActive: true,
      sortOrder: 0,
    };
    const serviceId = await ctx.db.insert("services", service);
    const unusedService = await ctx.db.insert("services", {
      ...service,
      name: "Test service",
    });
    const customer = {
      ...base,
      orgId,
      name: "Client",
      email: "client@example.com",
      totalVisits: 1,
      totalSpendMinorUnits: 50000,
      noShowCount: 0,
      noShowRiskScore: 0,
      whatsappOptIn: false,
      marketingOptIn: false,
    };
    const customerId = await ctx.db.insert("customers", {
      ...customer,
      opusUserId,
    });
    const guestId = await ctx.db.insert("customers", {
      ...customer,
      name: "Test guest",
      email: "test@example.com",
    });
    const otherCustomer = await ctx.db.insert("customers", {
      ...customer,
      orgId: otherId,
      opusUserId,
    });
    const booking = {
      ...base,
      orgId,
      customerId,
      staffId,
      serviceId,
      opusUserId,
      startAt: now + 86_400_000,
      endAt: now + 88_200_000,
      priceMinorUnits: 50000,
      currency: "MKD",
      surgePriceApplied: false,
      status: "confirmed" as const,
      source: "web" as const,
    };
    const bookingId = await ctx.db.insert("bookings", booking);
    const historyId = await ctx.db.insert("bookings", {
      ...booking,
      startAt: now - 86_400_000,
      endAt: now - 84_600_000,
      status: "completed",
    });
    const guestBooking = await ctx.db.insert("bookings", {
      ...booking,
      customerId: guestId,
      opusUserId: undefined,
    });
    const otherBooking = await ctx.db.insert("bookings", {
      ...booking,
      orgId: otherId,
      customerId: otherCustomer,
      staffId: otherStaff,
    });
    const jobId = await ctx.scheduler.runAfter(
      86_400_000,
      internal.bookings.completeScheduledBooking,
      {
        orgId,
        bookingId,
        expectedEndAt: booking.endAt,
        scheduledFor: booking.endAt,
      },
    );
    await ctx.db.patch(bookingId, {
      autoCompletionJobId: jobId,
      autoCompletionScheduledFor: booking.endAt,
    });
    const image = await ctx.storage.store(
      new Blob(["studio image"], { type: "image/png" }),
    );
    const sharedImage = await ctx.storage.store(
      new Blob(["shared image"], { type: "image/png" }),
    );
    const clientImage = await ctx.storage.store(
      new Blob(["client image"], { type: "image/png" }),
    );
    const detachedImage = await ctx.storage.store(
      new Blob(["unknown owner"], { type: "image/png" }),
    );
    for (const [i, id] of [image, sharedImage, clientImage].entries())
      await ctx.db.insert("org_media", {
        orgId,
        url: (await ctx.storage.getUrl(id))!,
        type: "gallery",
        sortOrder: i,
        isDeleted: false,
        uploadedAt: now,
        updatedAt: now,
      });
    await ctx.db.patch(otherId, {
      logoUrl: (await ctx.storage.getUrl(sharedImage))!,
    });
    await ctx.db.patch(opusUserId, {
      avatarUrl: (await ctx.storage.getUrl(clientImage))!,
    });
    const auditId = await ctx.db.insert("audit_log", {
      orgId,
      actorType: "system",
      actorId: "fixture",
      action: "fixture.created",
      resourceType: "orgs",
      resourceId: orgId,
      createdAt: now,
    });
    await ctx.db.insert("notifications", {
      orgId,
      channel: "email",
      type: "booking_reminder",
      recipientAddress: "client@example.com",
      templateData: {},
      status: "pending",
      scheduledFor: now + 86_400_000,
      createdAt: now,
    });
    await ctx.db.insert("customer_notes", {
      orgId,
      customerId,
      authorStaffId: staffId,
      note: "Private note",
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });
    return {
      orgId,
      otherId,
      userId,
      opusUserId,
      staffId,
      unusedStaff,
      otherStaff,
      serviceId,
      unusedService,
      customerId,
      guestId,
      bookingId,
      historyId,
      guestBooking,
      otherBooking,
      jobId,
      image,
      sharedImage,
      clientImage,
      detachedImage,
      auditId,
    };
  });
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-22T12:00:00Z"));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});
const confirmation = (p: OrganizationCleanupPreview) => ({
  orgId: p.orgId as Id<"orgs">,
  confirmationId: p.confirmationId,
  slug: p.slug,
});

describe("owner organization cleanup", () => {
  test("every tenant table has an explicit cleanup policy", () => {
    const global = [
      "orgs",
      "users",
      "opus_users",
      "marketplace_conversations",
      "marketplace_messages",
      "owner_cleanup_confirmations",
    ];
    expect(
      Object.keys(schema.tables)
        .filter((t) => !global.includes(t))
        .sort(),
    ).toEqual(Object.keys(CLEANUP_TABLES).sort());
  });
  test.each([
    ["different@example.com", true, false],
    [OWNER_EMAIL, false, false],
    [OWNER_EMAIL, true, true],
  ] as const)(
    "denies forged, unverified and expired owner identities: %s %s %s",
    async (email, verified, expired) => {
      const t = backend(),
        f = await fixture(t),
        { client } = await login(t, email, verified, expired);
      await expect(
        client.mutation(prepare, { orgId: f.orgId }),
      ).rejects.toThrow("Owner access required");
      await expect(client.query(allowance, { orgId: f.orgId })).rejects.toThrow(
        "Owner access required",
      );
      await expect(
        client.mutation(update, { orgId: f.orgId, operation: "reset" }),
      ).rejects.toThrow("Owner access required");
      await expect(
        client.mutation(execute, {
          orgId: f.orgId,
          confirmationId: "fake",
          slug: "test-studio",
        }),
      ).rejects.toThrow();
    },
  );
  test("anonymous callers cannot inspect or delete a studio", async () => {
    const t = backend(),
      f = await fixture(t);
    await expect(t.mutation(prepare, { orgId: f.orgId })).rejects.toThrow(
      "Owner access required",
    );
  });
  test("accurate impact, early-submit/slug guards, isolated deletion, preserved client history and retry receipt", async () => {
    const t = backend(),
      f = await fixture(t),
      { client: owner } = await login(t);
    const client = t.withIdentity({ subject: "studio-client" });
    const before = await t.run(async (ctx) => ({
      account: await ctx.db.get(f.opusUserId),
      other: await ctx.db.get(f.otherId),
      staff: await ctx.db.get(f.otherStaff),
      booking: await ctx.db.get(f.otherBooking),
      audit: await ctx.db.get(f.auditId),
    }));
    const preview = await owner.mutation(prepare, { orgId: f.orgId });
    expect(preview.blockers).toEqual([]);
    expect(preview.remove.find((r) => r.key === "bookings")?.count).toBe(1);
    expect(preview.remove.find((r) => r.key === "files")?.count).toBe(1);
    expect(preview.retain.find((r) => r.key === "bookings")?.count).toBe(2);
    expect(preview.retain.find((r) => r.key === "sharedFiles")?.count).toBe(2);
    await expect(
      owner.mutation(execute, confirmation(preview)),
    ).rejects.toThrow("too soon");
    vi.advanceTimersByTime(5_001);
    await expect(
      owner.mutation(execute, { ...confirmation(preview), slug: "wrong" }),
    ).rejects.toThrow("exact studio slug");
    await owner.mutation(execute, confirmation(preview));
    const state = await t.run(async (ctx) => ({
      org: await ctx.db.get(f.orgId),
      account: await ctx.db.get(f.opusUserId),
      user: await ctx.db.get(f.userId),
      other: await ctx.db.get(f.otherId),
      staff: await ctx.db.get(f.otherStaff),
      booking: await ctx.db.get(f.otherBooking),
      audit: await ctx.db.get(f.auditId),
      removed: await Promise.all(
        [f.guestBooking, f.guestId, f.unusedStaff, f.unusedService].map((id) =>
          ctx.db.get(id),
        ),
      ),
      files: await Promise.all(
        [f.image, f.sharedImage, f.clientImage, f.detachedImage].map((id) =>
          ctx.storage.getUrl(id),
        ),
      ),
      job: await ctx.db.system.get(f.jobId),
      notes: await ctx.db
        .query("customer_notes")
        .withIndex("by_org", (q) => q.eq("orgId", f.orgId))
        .collect(),
      notifications: await ctx.db
        .query("notifications")
        .withIndex("by_org", (q) => q.eq("orgId", f.orgId))
        .collect(),
    }));
    expect(state.org).toMatchObject({
      isDeleted: true,
      websiteStatus: "unpublished",
    });
    expect(state.org?.logoUrl).toBeUndefined();
    expect(state.account).toEqual(before.account);
    expect(state.user).toMatchObject({
      isDeleted: false,
      email: "client@example.com",
    });
    expect(state.user?.activeOrgId).toBeUndefined();
    expect(state.other).toEqual(before.other);
    expect(state.staff).toEqual(before.staff);
    expect(state.booking).toEqual(before.booking);
    expect(state.audit).toEqual(before.audit);
    expect(state.removed).toEqual([null, null, null, null]);
    expect(state.files[0]).toBeNull();
    expect(state.files.slice(1).every(Boolean)).toBe(true);
    expect(state.job?.state.kind).toBe("canceled");
    expect(state.notes).toEqual([]);
    expect(state.notifications).toEqual([]);
    const history = await client.query(api.opusUsers.getMyBookings, {});
    expect(history.find((b) => b._id === f.bookingId)).toMatchObject({
      status: "cancelled",
      isUpcoming: false,
      canCancel: false,
      studioRemoved: true,
      serviceName: "Haircut",
      staffName: "Ana",
    });
    expect(history.find((b) => b._id === f.historyId)?.status).toBe(
      "completed",
    );
    await expect(
      client.mutation(api.reviews.create, {
        bookingId: f.historyId,
        rating: 5,
      }),
    ).rejects.toThrow("no longer available");
    await expect(
      t.mutation(internal.notifications.scheduleNotification, {
        orgId: f.orgId,
        channel: "email",
        type: "booking_reminder",
        recipientAddress: "client@example.com",
        templateData: {},
      }),
    ).rejects.toThrow("Organization unavailable");
    await t.mutation(internal.dashboardNotifications.create, {
      orgId: f.orgId,
      type: "new_booking",
      title: "Delayed event",
      body: "Delayed event",
      bookingId: f.bookingId,
    });
    await t.mutation(internal.marketplace.embeddingsHelpers.upsertEmbedding, {
      orgId: f.orgId,
      entityType: "org",
      entityId: f.orgId,
      text: "Stale studio",
      sourceHash: "old",
      embedding: Array(1536).fill(0),
      industry: "beauty_wellness",
      isPublished: true,
    });
    for (const table of [
      "notifications",
      "dashboard_notifications",
      "marketplace_embeddings",
      "reviews",
    ] as const) {
      expect(
        await t.run((ctx) =>
          ctx.db
            .query(table)
            .withIndex("by_org", (q) => q.eq("orgId", f.orgId))
            .collect(),
        ),
      ).toEqual([]);
    }
    await expect(
      owner.mutation(execute, confirmation(preview)),
    ).resolves.toEqual({ deleted: true });
  });
  test("rejects a stale record manifest, expired ticket, or different selected org", async () => {
    const t = backend(),
      f = await fixture(t),
      { client } = await login(t);
    const p = await client.mutation(prepare, { orgId: f.orgId });
    vi.advanceTimersByTime(5_001);
    await expect(
      client.mutation(execute, { ...confirmation(p), orgId: f.otherId }),
    ).rejects.toThrow("invalid");
    await t.run((ctx) =>
      ctx.db.patch(f.bookingId, { staffNote: "Changed after review" }),
    );
    await expect(client.mutation(execute, confirmation(p))).rejects.toThrow(
      "data changed",
    );
    vi.advanceTimersByTime(600_000);
    await expect(client.mutation(execute, confirmation(p))).rejects.toThrow(
      "expired",
    );
    expect(await t.run((ctx) => ctx.db.get(f.guestBooking))).not.toBeNull();
  });
  test("protects shared files attached after the preview", async () => {
    const t = backend(),
      f = await fixture(t),
      { client } = await login(t);
    const p = await client.mutation(prepare, { orgId: f.orgId });
    await t.run(async (ctx) =>
      ctx.db.patch(f.otherId, {
        logoUrl: (await ctx.storage.getUrl(f.image))!,
      }),
    );
    vi.advanceTimersByTime(5_001);
    await expect(client.mutation(execute, confirmation(p))).rejects.toThrow(
      "data changed",
    );
    expect(await t.run((ctx) => ctx.storage.getUrl(f.image))).not.toBeNull();
  });
  test("protects URL aliases and sign-in avatars not yet mirrored to a client profile", async () => {
    const t = backend(),
      f = await fixture(t),
      { client } = await login(t);
    const url = (await t.run((ctx) => ctx.storage.getUrl(f.image)))!;
    const alias = await t.run((ctx) =>
      ctx.db.insert("org_media", {
        orgId: f.otherId,
        url: `${url}?version=2`,
        type: "gallery",
        sortOrder: 0,
        isDeleted: false,
        uploadedAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );
    let p = await client.mutation(prepare, { orgId: f.orgId });
    expect(p.remove.find((r) => r.key === "files")?.count).toBe(0);
    await t.run((ctx) =>
      ctx.db.patch(alias, { url: "https://example.com/other.png" }),
    );
    const auth = await t.mutation(components.betterAuth.adapter.create, {
      input: {
        model: "user",
        data: {
          email: "new-client@example.com",
          emailVerified: true,
          name: "New client",
          image: url,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      },
    });
    p = await client.mutation(prepare, { orgId: f.orgId });
    expect(p.remove.find((r) => r.key === "files")?.count).toBe(0);
    vi.advanceTimersByTime(5_001);
    await client.mutation(execute, confirmation(p));
    expect(
      await t.query(components.betterAuth.adapter.findOne, {
        model: "user",
        where: [{ field: "_id", value: auth._id }],
      }),
    ).toMatchObject({ image: url, email: "new-client@example.com" });
    expect(await t.run((ctx) => ctx.storage.getUrl(f.image))).not.toBeNull();
  });
  test("open subscriptions block both preview and execution", async () => {
    const t = backend(),
      f = await fixture(t),
      { client } = await login(t);
    await t.run((ctx) =>
      ctx.db.insert("billing_accounts", {
        orgId: f.orgId,
        externalCustomerId: "test",
        environment: "production",
        productId: "test",
        managed: true,
        hasOpenSubscription: true,
        syncVersion: 0,
        syncedVersion: 0,
        isDeleted: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );
    const p = await client.mutation(prepare, { orgId: f.orgId });
    expect(p.blockers.join()).toContain("Polar");
    vi.advanceTimersByTime(5_001);
    await expect(client.mutation(execute, confirmation(p))).rejects.toThrow(
      "Polar",
    );
    expect((await t.run((ctx) => ctx.db.get(f.orgId)))?.isDeleted).toBe(false);
  });
  test("revoking the session invalidates an already prepared confirmation", async () => {
    const t = backend(),
      f = await fixture(t),
      { client, session } = await login(t);
    const p = await client.mutation(prepare, { orgId: f.orgId });
    await t.mutation(components.betterAuth.adapter.deleteOne, {
      input: {
        model: "session",
        where: [{ field: "_id", value: session._id }],
      },
    });
    vi.advanceTimersByTime(5_001);
    await expect(client.mutation(execute, confirmation(p))).rejects.toThrow(
      "Owner access required",
    );
  });
  test("a confirmation cannot be used by a different session of the same owner", async () => {
    const t = backend(),
      f = await fixture(t),
      { client, user } = await login(t);
    const p = await client.mutation(prepare, { orgId: f.orgId });
    const session = await t.mutation(components.betterAuth.adapter.create, {
      input: {
        model: "session",
        data: {
          userId: user._id,
          token: "another-session",
          expiresAt: Date.now() + 3_600_000,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      },
    });
    vi.advanceTimersByTime(5_001);
    await expect(
      t
        .withIdentity({ subject: user._id, sessionId: session._id })
        .mutation(execute, confirmation(p)),
    ).rejects.toThrow("invalid");
  });
  test("rejects non-beauty and unclaimed imported roots", async () => {
    const t = backend(),
      f = await fixture(t),
      { client } = await login(t);
    await t.run((ctx) => ctx.db.patch(f.orgId, { industry: "hospitality" }));
    await expect(client.mutation(prepare, { orgId: f.orgId })).rejects.toThrow(
      "not available",
    );
    await t.run((ctx) =>
      ctx.db.patch(f.orgId, {
        industry: "beauty_wellness",
        source: "scraped",
        claimStatus: "unclaimed",
      }),
    );
    await expect(
      client.mutation(update, { orgId: f.orgId, operation: "reset" }),
    ).rejects.toThrow("not available");
  });
  test("oversized cleanup fails before creating a confirmation or changing records", async () => {
    const t = backend(),
      f = await fixture(t),
      { client } = await login(t);
    await t.run(async (ctx) => {
      for (let i = 0; i < 2_001; i++)
        await ctx.db.insert("saved_replies", {
          orgId: f.orgId,
          title: "Test",
          body: "Test",
          language: "en",
          updatedBy: f.staffId,
          isDeleted: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
    });
    await expect(client.mutation(prepare, { orgId: f.orgId })).rejects.toThrow(
      "safe cleanup size",
    );
    expect((await t.run((ctx) => ctx.db.get(f.orgId)))?.isDeleted).toBe(false);
    expect(
      await t.run((ctx) =>
        ctx.db
          .query("owner_cleanup_confirmations")
          .withIndex("by_org", (q) => q.eq("orgId", f.orgId))
          .collect(),
      ),
    ).toEqual([]);
  });
});

describe("owner AI allowance controls", () => {
  test("custom limits feed assistant admission; reset preserves spend and history; defaults restore plan policy", async () => {
    const t = backend(),
      f = await fixture(t),
      { client } = await login(t);
    const studio = t.withIdentity({ subject: "studio-client" });
    await t.run((ctx) =>
      ctx.db.insert("analyst_usage", {
        orgId: f.orgId,
        monthStartMs: usageMonth(Date.now()).startMs,
        answers: 200,
        deepAnswers: 20,
        spentMicroUsd: 3_000_000,
        reservedMicroUsd: 0,
        updatedAt: Date.now(),
      }),
    );
    expect(
      (await studio.query(api.analyst.conversations.getAccess, {})).remaining,
    ).toBe(0);
    await client.mutation(update, {
      orgId: f.orgId,
      operation: "custom",
      limit: 450,
      deepLimit: 30,
    });
    const reset = await client.mutation(update, {
      orgId: f.orgId,
      operation: "reset",
    });
    expect(reset).toMatchObject({
      limit: 450,
      deepLimit: 30,
      used: 0,
      deepUsed: 0,
      budgetUsedMicroUsd: 0,
    });
    expect(
      await studio.query(api.analyst.conversations.getAccess, {}),
    ).toMatchObject({
      remaining: 450,
      deepRemaining: 30,
      budgetAvailable: true,
    });
    const usage = await t.run((ctx) =>
      ctx.db
        .query("analyst_usage")
        .withIndex("by_org", (q) => q.eq("orgId", f.orgId))
        .first(),
    );
    expect(usage).toMatchObject({
      spentMicroUsd: 3_000_000,
      resetSpentMicroUsd: 3_000_000,
    });
    await client.mutation(update, {
      orgId: f.orgId,
      operation: "custom",
      limit: 0,
      deepLimit: 0,
    });
    vi.stubEnv("BUSINESS_ANALYST_ENABLED", "true");
    vi.stubEnv("BUSINESS_ANALYST_OPENAI_API_KEY", "test");
    await expect(
      studio.mutation(api.analyst.conversations.send, {
        question: "Test",
        depth: "standard",
        language: "en",
        requestId: "owner-limit-test-0001",
      }),
    ).rejects.toThrow("ANALYST_ALLOWANCE_REACHED");
    expect(
      await client.mutation(update, { orgId: f.orgId, operation: "defaults" }),
    ).toMatchObject({ limit: 200, deepLimit: 20, custom: false, used: 0 });
  });
  test("validates bounds, protects Free detailed access and rejects resets while a reservation is active", async () => {
    const t = backend(),
      f = await fixture(t),
      { client } = await login(t);
    for (const [limit, deepLimit] of [
      [-1, 0],
      [1.5, 0],
      [1, 2],
      [10001, 0],
    ])
      await expect(
        client.mutation(update, {
          orgId: f.orgId,
          operation: "custom",
          limit,
          deepLimit,
        }),
      ).rejects.toThrow("whole-number");
    await t.run((ctx) => ctx.db.patch(f.orgId, { plan: "free" }));
    await expect(
      client.mutation(update, {
        orgId: f.orgId,
        operation: "custom",
        limit: 10,
        deepLimit: 1,
      }),
    ).rejects.toThrow("require Pro");
    await expect(
      client.mutation(update, {
        orgId: f.orgId,
        operation: "custom",
        limit: 10,
        deepLimit: 0,
      }),
    ).resolves.toMatchObject({ limit: 10, deepLimit: 0 });
    await t.run((ctx) =>
      ctx.db.insert("analyst_usage", {
        orgId: f.orgId,
        monthStartMs: usageMonth(Date.now()).startMs,
        answers: 1,
        deepAnswers: 0,
        spentMicroUsd: 0,
        reservedMicroUsd: 30_000,
        updatedAt: Date.now(),
      }),
    );
    await expect(
      client.mutation(update, { orgId: f.orgId, operation: "reset" }),
    ).rejects.toThrow("finish");
  });
});
