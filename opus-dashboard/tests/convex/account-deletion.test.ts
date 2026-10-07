import { afterEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import { api, internal } from "../../convex/_generated/api";
import schema from "../../convex/schema";
import { convexModules } from "../../convex-test.setup";
import betterAuthTest from "@convex-dev/better-auth/test";
import { components } from "../../convex/_generated/api";
import { ensureCurrentOpusUser } from "../../convex/lib/opusUserAuth";
import { defaultPushPreferences } from "../../../shared/push-notifications";

const transport = vi.hoisted(() => vi.fn());
vi.mock("../../convex/lib/emailDelivery", () => ({
  deliverEmail: transport,
  emailFromForRoute: () => "OPUS <auth@example.invalid>",
  providerOrderForRoute: () => ["resend"],
}));
afterEach(() => {
  vi.useRealTimers();
  transport.mockReset();
});

describe("identity-scoped account deletion requests", () => {
  it("requires authentication and never accepts another user's identity", async () => {
    const backend = convexTest(schema, convexModules);
    await expect(
      backend.query(api.accountDeletion.getStatus, {}),
    ).rejects.toThrow("Unauthenticated");
    await expect(
      backend.mutation(api.accountDeletion.request, {
        confirmation: "delete-my-account",
      }),
    ).rejects.toThrow("Unauthenticated");
    const user = backend.withIdentity({
      subject: "requester",
      email: "requester@example.invalid",
    });
    await user.mutation(api.users.ensureUser, {});
    await expect(
      user.mutation(api.accountDeletion.request, {
        confirmation: "delete-my-account",
        userId: "someone-else",
      } as never),
    ).rejects.toThrow();
  });

  it("works without a studio, is idempotent, and keeps other accounts private", async () => {
    vi.useFakeTimers();
    const backend = convexTest(schema, convexModules);
    const user = backend.withIdentity({
      subject: "unassigned",
      email: "unassigned@example.invalid",
    });
    const other = backend.withIdentity({
      subject: "other",
      email: "other@example.invalid",
    });
    await user.mutation(api.users.ensureUser, {});
    await other.mutation(api.users.ensureUser, {});
    expect(await user.query(api.accountDeletion.getStatus, {})).toBeNull();
    const first = await user.mutation(api.accountDeletion.request, {
      confirmation: "delete-my-account",
    });
    expect(first!.dueAt - first!.requestedAt).toBe(30 * 86400000);
    expect(
      await user.mutation(api.accountDeletion.request, {
        confirmation: "delete-my-account",
      }),
    ).toEqual(first);
    expect(await other.query(api.accountDeletion.getStatus, {})).toBeNull();
    const pending = await backend.query(
      internal.accountDeletion.listPending,
      {},
    );
    expect(pending).toHaveLength(1);
    expect(pending[0].email).toBe("unassigned@example.invalid");
    transport.mockResolvedValue({ provider: "resend", attempts: [] });
    await backend.finishAllScheduledFunctions(vi.runAllTimers);
    expect(transport).toHaveBeenCalledTimes(1);
    expect(transport.mock.calls[0][0].to).toBe("hello@opus.mk");
    expect(
      (await backend.query(internal.accountDeletion.listPending, {}))[0]
        .notificationDelivered,
    ).toBe(true);
  });

  it("does not revoke staff, archive a studio, or change billing when a request is filed", async () => {
    vi.useFakeTimers();
    const backend = convexTest(schema, convexModules);
    const owner = backend.withIdentity({
      subject: "deletion-owner",
      email: "owner@example.invalid",
    });
    const userId = await owner.mutation(api.users.ensureUser, {});
    const { orgId } = await owner.mutation(api.activation.startBeautyBusiness, {
      name: "Deletion test studio",
      category: "hair_salon",
    });
    const before = await owner.query(api.mobile.bootstrap, {});
    await owner.mutation(api.accountDeletion.request, {
      confirmation: "delete-my-account",
    });
    expect(await owner.query(api.mobile.bootstrap, {})).toEqual(before);
    const audits = await backend.run((ctx) =>
      ctx.db
        .query("audit_log")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .collect(),
    );
    expect(
      audits.filter((row) => row.action === "account.deletion_requested"),
    ).toMatchObject([{ actorId: userId, resourceId: userId }]);
    transport.mockResolvedValue({ provider: "resend", attempts: [] });
    await backend.finishAllScheduledFunctions(vi.runAllTimers);
  });

  it("retains requests when notification delivery fails and never records a false success", async () => {
    vi.useFakeTimers();
    const backend = convexTest(schema, convexModules);
    const user = backend.withIdentity({
      subject: "delivery-failure",
      email: "failure@example.invalid",
    });
    const userId = await user.mutation(api.users.ensureUser, {});
    await user.mutation(api.accountDeletion.request, {
      confirmation: "delete-my-account",
    });
    transport.mockRejectedValue(new Error("Provider unavailable"));
    await expect(
      backend.action(internal.accountDeletion.notify, { userId, attempt: 5 }),
    ).rejects.toThrow("Provider unavailable");
    expect(
      (await backend.query(internal.accountDeletion.listPending, {}))[0]
        .notificationDelivered,
    ).toBe(false);
    expect(await user.query(api.accountDeletion.getStatus, {})).not.toBeNull();
    transport.mockResolvedValue({ provider: "resend", attempts: [] });
    await backend.finishAllScheduledFunctions(vi.runAllTimers);
  });
});

describe("operator account erasure", () => {
  async function setup() {
    const backend = convexTest(schema, convexModules);
    betterAuthTest.register(backend);
    const now = Date.now();
    const auth = await backend.mutation(components.betterAuth.adapter.create, {
      input: {
        model: "user",
        data: {
          name: "Account to erase",
          email: "erase@example.invalid",
          emailVerified: true,
          createdAt: now,
          updatedAt: now,
        },
      },
    });
    const identity = backend.withIdentity({
      subject: auth._id,
      email: auth.email,
      name: auth.name,
    });
    const userId = await identity.mutation(api.users.ensureUser, {});
    await identity.run((ctx) => ensureCurrentOpusUser(ctx));
    await backend.mutation(components.betterAuth.adapter.create, {
      input: {
        model: "session",
        data: {
          userId: auth._id,
          token: "erasure-test-session",
          expiresAt: now + 86400000,
          createdAt: now,
          updatedAt: now,
        },
      },
    });
    await backend.mutation(components.betterAuth.adapter.create, {
      input: {
        model: "account",
        data: {
          userId: auth._id,
          providerId: "credential",
          accountId: auth._id,
          createdAt: now,
          updatedAt: now,
        },
      },
    });
    await backend.mutation(components.betterAuth.adapter.create, {
      input: {
        model: "verification",
        data: {
          identifier: `sign-in-otp-${auth.email}`,
          value: "test-only",
          expiresAt: now + 300000,
          createdAt: now,
          updatedAt: now,
        },
      },
    });
    const other = backend.withIdentity({
      subject: "unrelated",
      email: "unrelated@example.invalid",
    });
    const otherId = await other.mutation(api.users.ensureUser, {});
    const args = {
      userId,
      businessDataReviewed: true as const,
      retentionReview:
        "Account data and retained studio records reviewed in the support case.",
    };
    return { backend, identity, auth, userId, other, otherId, args };
  }

  it("erases credentials and account PII, denies old tokens, and preserves unrelated users", async () => {
    vi.useFakeTimers();
    const { backend, identity, auth, userId, otherId, args } = await setup();
    // More than one adapter page must be revoked in the same erasure transaction.
    for (let i = 0; i < 101; i++)
      await backend.mutation(components.betterAuth.adapter.create, {
        input: {
          model: "session",
          data: {
            userId: auth._id,
            token: `paged-erasure-session-${i}`,
            expiresAt: Date.now() + 86400000,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        },
      });
    await expect(
      backend.mutation(internal.accountDeletion.erase, args),
    ).rejects.toThrow("no deletion request");
    await identity.mutation(api.accountDeletion.request, {
      confirmation: "delete-my-account",
    });
    transport.mockResolvedValue({ provider: "resend", attempts: [] });
    await backend.finishAllScheduledFunctions(vi.runAllTimers);
    expect(await backend.action(internal.accountDeletion.fulfil, args)).toEqual(
      { erased: true, confirmationDelivered: true },
    );
    expect(
      await backend.query(components.betterAuth.adapter.findOne, {
        model: "user",
        where: [{ field: "_id", value: auth._id }],
      }),
    ).toBeNull();
    for (const model of ["session", "account"] as const)
      expect(
        await backend.query(components.betterAuth.adapter.findOne, {
          model,
          where: [{ field: "userId", value: auth._id }],
        }),
      ).toBeNull();
    expect(
      await backend.query(components.betterAuth.adapter.findOne, {
        model: "verification",
        where: [{ field: "identifier", value: `sign-in-otp-${auth.email}` }],
      }),
    ).toBeNull();
    const deleted = await backend.run((ctx) => ctx.db.get(userId));
    expect(deleted).toMatchObject({
      name: "Deleted account",
      isDeleted: true,
      authUserId: auth._id,
    });
    expect(deleted!.email).not.toBe(auth.email);
    expect(
      await backend.query(internal.accountDeletion.listPending, {}),
    ).toEqual([]);
    expect((await backend.run((ctx) => ctx.db.get(otherId)))!.email).toBe(
      "unrelated@example.invalid",
    );
    await expect(identity.mutation(api.users.ensureUser, {})).rejects.toThrow(
      "Account unavailable",
    );
    await expect(
      identity.run((ctx) => ensureCurrentOpusUser(ctx)),
    ).rejects.toThrow("Account unavailable");
    await expect(identity.query(api.mobile.bootstrap, {})).rejects.toThrow(
      "Unauthorised",
    );
    expect(await backend.action(internal.accountDeletion.fulfil, args)).toEqual(
      { erased: true, confirmationDelivered: false },
    );
  });

  it("blocks orphaning the last studio owner, then anonymizes the former member after ownership transfer", async () => {
    vi.useFakeTimers();
    const { backend, identity, userId, otherId, args } = await setup();
    const { orgId } = await identity.mutation(
      api.activation.startBeautyBusiness,
      { name: "Retained studio", category: "hair_salon" },
    );
    await identity.mutation(api.accountDeletion.request, {
      confirmation: "delete-my-account",
    });
    await expect(
      backend.mutation(internal.accountDeletion.erase, args),
    ).rejects.toThrow("last owner");
    expect((await backend.run((ctx) => ctx.db.get(userId)))!.isDeleted).toBe(
      false,
    );
    const before = await backend.run((ctx) =>
      ctx.db
        .query("staff_members")
        .withIndex("by_org_user", (q) =>
          q.eq("orgId", orgId).eq("userId", userId),
        )
        .first(),
    );
    await backend.run((ctx) =>
      ctx.db.insert("staff_members", {
        orgId,
        userId: otherId,
        displayName: "Replacement owner",
        specialties: [],
        role: "owner",
        isActive: true,
        isDeleted: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );
    await backend.mutation(internal.accountDeletion.erase, args);
    const oldMember = await backend.run((ctx) =>
      ctx.db
        .query("staff_members")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .collect(),
    );
    expect(oldMember.find((m) => m._id === before!._id)).toMatchObject({
      displayName: "Deleted team member",
      isDeleted: true,
      isActive: false,
    });
    expect(oldMember.find((m) => m.userId === otherId)?.isDeleted).toBe(false);
    expect((await backend.run((ctx) => ctx.db.get(orgId)))!.isDeleted).toBe(
      false,
    );
    const audits = await backend.run((ctx) =>
      ctx.db
        .query("audit_log")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .collect(),
    );
    expect(
      audits.some(
        (row) => row.action === "account.deleted" && row.resourceId === userId,
      ),
    ).toBe(true);
    transport.mockResolvedValue({ provider: "resend", attempts: [] });
    await backend.finishAllScheduledFunctions(vi.runAllTimers);
  });

  it("clears push credentials and preferences and cancels queued pushes during erasure", async () => {
    vi.useFakeTimers();
    const { backend, identity, userId, otherId, args } = await setup();
    const { orgId } = await identity.mutation(
      api.activation.startBeautyBusiness,
      { name: "Push erasure studio", category: "hair_salon" },
    );
    const deviceId = await backend.run(async (ctx) => {
      await ctx.db.insert("staff_members", {
        orgId,
        userId: otherId,
        displayName: "Remaining owner",
        specialties: [],
        role: "owner",
        isActive: true,
        isDeleted: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      await ctx.db.insert("staff_notification_preferences", {
        orgId,
        userId,
        preferences: defaultPushPreferences(),
        isDeleted: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      return ctx.db.insert("staff_push_devices", {
        orgId,
        userId,
        authSessionId: "erasure-test-session",
        deviceId: "11111111-1111-4111-8111-111111111111",
        kind: "expo",
        expoToken: "ExpoPushToken[erase-test-token]",
        locale: "en",
        lastSeenAt: Date.now(),
        isDeleted: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });
    const notificationId = await backend.mutation(
      internal.notifications.scheduleNotification,
      {
        orgId,
        channel: "push",
        type: "staff_new_booking",
        recipientAddress: deviceId,
        templateData: {},
        scheduledFor: Date.now() + 3600000,
        pushDeviceId: deviceId,
        pushUserId: userId,
        pushEvent: "new_booking",
      },
    );
    await identity.mutation(api.accountDeletion.request, {
      confirmation: "delete-my-account",
    });
    await backend.mutation(internal.accountDeletion.erase, args);
    expect((await backend.run((ctx) => ctx.db.get(deviceId)))!).toMatchObject({
      isDeleted: true,
    });
    expect(
      (await backend.run((ctx) => ctx.db.get(deviceId)))!.expoToken,
    ).toBeUndefined();
    const preferences = await backend.run((ctx) =>
      ctx.db
        .query("staff_notification_preferences")
        .withIndex("by_org_user", (q) =>
          q.eq("orgId", orgId).eq("userId", userId),
        )
        .unique(),
    );
    expect(preferences!.isDeleted).toBe(true);
    expect(
      (await backend.run((ctx) => ctx.db.get(notificationId)))!.status,
    ).toBe("cancelled");
    transport.mockResolvedValue({ provider: "resend", attempts: [] });
    await backend.finishAllScheduledFunctions(vi.runAllTimers);
  });

  it("refuses a closed studio's last owner while its subscription is still open", async () => {
    vi.useFakeTimers();
    const { backend, identity, userId, args } = await setup();
    const { orgId } = await identity.mutation(
      api.activation.startBeautyBusiness,
      { name: "Closing studio", category: "hair_salon" },
    );
    await identity.mutation(api.accountDeletion.request, {
      confirmation: "delete-my-account",
    });
    const billingId = await backend.run(async (ctx) => {
      await ctx.db.patch(orgId, { isDeleted: true, deletedAt: Date.now() });
      return ctx.db.insert("billing_accounts", {
        orgId,
        externalCustomerId: "test-customer",
        environment: "production",
        productId: "test-product",
        managed: true,
        hasOpenSubscription: true,
        syncVersion: 0,
        syncedVersion: 0,
        isDeleted: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });
    await expect(
      backend.mutation(internal.accountDeletion.erase, args),
    ).rejects.toThrow("subscription");
    expect((await backend.run((ctx) => ctx.db.get(userId)))!.isDeleted).toBe(
      false,
    );
    await backend.run((ctx) =>
      ctx.db.patch(billingId, { hasOpenSubscription: false }),
    );
    await backend.mutation(internal.accountDeletion.erase, args);
    await backend.finishAllScheduledFunctions(vi.runAllTimers);
  });

  it("requires upcoming appointments to be resolved without modifying them during erasure", async () => {
    vi.useFakeTimers();
    const { backend, identity, userId, otherId, args } = await setup();
    const { orgId } = await identity.mutation(
      api.activation.startBeautyBusiness,
      { name: "Appointments studio", category: "hair_salon" },
    );
    const serviceId = await identity.mutation(api.activation.saveFirstService, {
      name: "Haircut",
      durationMins: 30,
      priceMinorUnits: 120000,
    });
    const bookingId = await backend.run(async (ctx) => {
      await ctx.db.insert("staff_members", {
        orgId,
        userId: otherId,
        displayName: "Remaining owner",
        specialties: [],
        role: "owner",
        isActive: true,
        isDeleted: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      const staff = await ctx.db
        .query("staff_members")
        .withIndex("by_org_user", (q) =>
          q.eq("orgId", orgId).eq("userId", userId),
        )
        .first();
      const customerId = await ctx.db.insert("customers", {
        orgId,
        name: "Retained client",
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
      const startAt = Date.now() + 2 * 86400000;
      return ctx.db.insert("bookings", {
        orgId,
        customerId,
        staffId: staff!._id,
        serviceId,
        startAt,
        endAt: startAt + 1800000,
        priceMinorUnits: 120000,
        currency: "MKD",
        surgePriceApplied: false,
        status: "confirmed",
        source: "manual",
        isDeleted: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });
    await identity.mutation(api.accountDeletion.request, {
      confirmation: "delete-my-account",
    });
    const before = await backend.run((ctx) => ctx.db.get(bookingId));
    await expect(
      backend.mutation(internal.accountDeletion.erase, args),
    ).rejects.toThrow("upcoming appointments");
    expect(await backend.run((ctx) => ctx.db.get(bookingId))).toEqual(before);
    expect((await backend.run((ctx) => ctx.db.get(userId)))!.isDeleted).toBe(
      false,
    );
    transport.mockResolvedValue({ provider: "resend", attempts: [] });
    await backend.finishAllScheduledFunctions(vi.runAllTimers);
  });
});
