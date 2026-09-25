import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { requireRole } from "./lib/auth";
import {
  externalCustomerIdForOrg,
  orgIdFromExternalCustomerId,
  polarConfig,
  polarSubscription,
  requirePolarConfig,
} from "./lib/polar";

async function accountForOrg(ctx: QueryCtx, orgId: Id<"orgs">) {
  const account = await ctx.db
    .query("billing_accounts")
    .withIndex("by_org", (q) => q.eq("orgId", orgId))
    .unique();
  return account && !account.isDeleted ? account : null;
}

async function queueSync(ctx: MutationCtx, account: Doc<"billing_accounts">) {
  const version = account.syncVersion + 1;
  await ctx.db.patch(account._id, {
    syncVersion: version,
    syncFailed: false,
    updatedAt: Date.now(),
  });
  await ctx.scheduler.runAfter(0, internal.billingActions.syncSubscription, {
    orgId: account.orgId,
    version,
    attempt: 0,
  });
}

export const getStatus = query({
  args: {},
  handler: async (ctx) => {
    const { org, staffMember } = await requireRole(ctx, undefined, "staff");
    const account = await accountForOrg(ctx, org._id);
    const config = polarConfig();
    const sameEnvironment = !account || account.environment === config.server;
    return {
      plan: org.plan,
      canManage: staffMember.role === "owner",
      checkoutAvailable:
        config.configured && config.checkoutEnabled && sameEnvironment,
      portalAvailable: Boolean(
        config.configured && sameEnvironment && account?.customerId,
      ),
      managed: account?.managed ?? false,
      subscription: account?.subscription ?? null,
      hasOpenSubscription: account?.hasOpenSubscription ?? false,
      syncing: Boolean(
        account &&
        account.syncVersion > account.syncedVersion &&
        !account.syncFailed,
      ),
      syncFailed: account?.syncFailed ?? false,
      lastSyncedAt: account?.lastSyncedAt ?? null,
    };
  },
});

export const getOwnerContext = internalQuery({
  args: {},
  handler: async (ctx) => {
    const { org, user } = await requireRole(ctx, undefined, "owner");
    return {
      orgId: org._id,
      plan: org.plan,
      email: user.email,
      name: org.name,
      account: await accountForOrg(ctx, org._id),
    };
  },
});

export const getAccount = internalQuery({
  args: { orgId: v.id("orgs") },
  handler: (ctx, { orgId }) => accountForOrg(ctx, orgId),
});

export const reserveCheckout = internalMutation({
  args: { attemptId: v.string() },
  handler: async (ctx, { attemptId }) => {
    const { org, user } = await requireRole(ctx, undefined, "owner");
    const config = requirePolarConfig();
    if (!config.checkoutEnabled) throw new ConvexError("BILLING_UNAVAILABLE");
    if (org.industry !== "beauty_wellness")
      throw new ConvexError("BILLING_UNAVAILABLE");
    if (org.plan === "paid") throw new ConvexError("ALREADY_PRO");
    let account = await accountForOrg(ctx, org._id);
    if (
      account &&
      (account.environment !== config.server ||
        account.productId !== config.productId)
    ) {
      throw new ConvexError("BILLING_UNAVAILABLE");
    }
    const now = Date.now();
    if ((account?.checkoutLockUntil ?? 0) > now)
      throw new ConvexError("CHECKOUT_BUSY");
    if (!account) {
      const id = await ctx.db.insert("billing_accounts", {
        orgId: org._id,
        externalCustomerId: externalCustomerIdForOrg(org._id),
        environment: config.server,
        productId: config.productId,
        managed: false,
        hasOpenSubscription: false,
        syncVersion: 0,
        syncedVersion: 0,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      });
      account = (await ctx.db.get(id))!;
      await ctx.db.insert("audit_log", {
        orgId: org._id,
        actorType: "user",
        actorId: user._id,
        action: "billing.account_created",
        resourceType: "billing_accounts",
        resourceId: id,
        after: { environment: config.server, productId: config.productId },
        createdAt: now,
      });
    }
    // Serialised reservation prevents multiple owners/tabs creating checkouts.
    await ctx.db.patch(account._id, {
      checkoutAttemptId: attemptId,
      checkoutLockUntil: now + 120_000,
      updatedAt: now,
    });
    return { account, orgId: org._id, email: user.email, name: org.name };
  },
});

export const finishCheckout = internalMutation({
  args: {
    orgId: v.id("orgs"),
    attemptId: v.string(),
    checkout: v.optional(
      v.object({ id: v.string(), url: v.string(), expiresAt: v.number() }),
    ),
  },
  handler: async (ctx, { orgId, attemptId, checkout }) => {
    const account = await accountForOrg(ctx, orgId);
    if (!account || account.checkoutAttemptId !== attemptId) return false;
    await ctx.db.patch(account._id, {
      checkoutAttemptId: undefined,
      checkoutLockUntil: undefined,
      ...(checkout
        ? {
            checkoutId: checkout.id,
            checkoutUrl: checkout.url,
            checkoutExpiresAt: checkout.expiresAt,
          }
        : {}),
      updatedAt: Date.now(),
    });
    if (checkout && checkout.id !== account.checkoutId)
      await ctx.db.insert("audit_log", {
        orgId,
        actorType: "system",
        action: "billing.checkout_created",
        resourceType: "billing_accounts",
        resourceId: account._id,
        after: { checkoutId: checkout.id },
        createdAt: Date.now(),
      });
    return true;
  },
});

export const requestSync = internalMutation({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, { orgId }) => {
    const account = await accountForOrg(ctx, orgId);
    if (account) await queueSync(ctx, account);
  },
});

export const requestOwnerSync = internalMutation({
  args: {},
  handler: async (ctx) => {
    const { org } = await requireRole(ctx, undefined, "owner");
    requirePolarConfig();
    const account = await accountForOrg(ctx, org._id);
    if (!account) return;
    // Rate limit refreshes without preventing a retry after a provider failure.
    if (
      account.syncVersion > account.syncedVersion &&
      !account.syncFailed &&
      Date.now() - account.updatedAt < 5_000
    )
      return;
    if (account.lastSyncedAt && Date.now() - account.lastSyncedAt < 5_000)
      return;
    await queueSync(ctx, account);
  },
});

export const recordWebhook = internalMutation({
  args: {
    externalCustomerId: v.string(),
    customerId: v.string(),
    eventId: v.string(),
    eventType: v.string(),
  },
  handler: async (ctx, args) => {
    const rawOrgId = orgIdFromExternalCustomerId(args.externalCustomerId);
    const orgId = rawOrgId ? ctx.db.normalizeId("orgs", rawOrgId) : null;
    if (!orgId) return;
    const account = await accountForOrg(ctx, orgId);
    if (
      !account ||
      account.externalCustomerId !== args.externalCustomerId ||
      account.environment !== polarConfig().server
    )
      return;
    if (account.customerId && account.customerId !== args.customerId) return;
    const org = await ctx.db.get(orgId);
    if (!org || org.isDeleted) return;
    const receipt = await ctx.db
      .query("billing_webhook_events")
      .withIndex("by_org_event", (q) =>
        q.eq("orgId", orgId).eq("eventId", args.eventId),
      )
      .unique();
    if (receipt) return;
    await ctx.db.insert("billing_webhook_events", {
      orgId,
      eventId: args.eventId,
      eventType: args.eventType,
      createdAt: Date.now(),
    });
    // Only a signed event for the server-created external customer can bind it.
    if (!account.customerId)
      await ctx.db.patch(account._id, { customerId: args.customerId });
    await queueSync(ctx, account);
  },
});

export const applySnapshot = internalMutation({
  args: {
    orgId: v.id("orgs"),
    version: v.number(),
    customerId: v.optional(v.string()),
    subscription: v.optional(polarSubscription),
    hasOpenSubscription: v.boolean(),
  },
  handler: async (ctx, args) => {
    const account = await accountForOrg(ctx, args.orgId);
    const org = await ctx.db.get(args.orgId);
    if (
      !account ||
      !org ||
      org.isDeleted ||
      account.syncVersion !== args.version ||
      account.syncedVersion >= args.version
    )
      return;
    if (account.environment !== polarConfig().server) return;
    if (
      account.customerId &&
      args.customerId &&
      account.customerId !== args.customerId
    )
      throw new Error("Polar customer mismatch");
    const now = Date.now();
    const subscription = args.subscription;
    const paid =
      subscription?.status === "active" && subscription.currentPeriodEnd > now;
    const managed = account.managed || Boolean(subscription);
    const plan = managed ? (paid ? "paid" : "free") : org.plan;
    await ctx.db.patch(account._id, {
      customerId: args.customerId ?? account.customerId,
      subscription,
      managed,
      hasOpenSubscription: args.hasOpenSubscription,
      syncedVersion: args.version,
      lastSyncedAt: now,
      syncFailed: false,
      updatedAt: now,
    });
    if (org.plan !== plan)
      await ctx.db.patch(org._id, { plan, updatedAt: now });
    if (
      org.plan !== plan ||
      JSON.stringify(account.subscription) !== JSON.stringify(subscription)
    ) {
      await ctx.db.insert("audit_log", {
        orgId: org._id,
        actorType: "system",
        actorId: "polar",
        action: "billing.subscription_synced",
        resourceType: "billing_accounts",
        resourceId: account._id,
        before: { plan: org.plan, subscription: account.subscription ?? null },
        after: { plan, subscription: subscription ?? null },
        createdAt: now,
      });
    }
    if (
      paid &&
      (account.subscription?.currentPeriodEnd !==
        subscription.currentPeriodEnd ||
        account.subscription?.status !== "active")
    ) {
      await ctx.scheduler.runAt(
        subscription.currentPeriodEnd + 1,
        internal.billing.expireAccess,
        { orgId: org._id, periodEnd: subscription.currentPeriodEnd },
      );
    }
  },
});

export const retrySync = internalMutation({
  args: { orgId: v.id("orgs"), version: v.number(), attempt: v.number() },
  handler: async (ctx, args) => {
    const account = await accountForOrg(ctx, args.orgId);
    if (
      !account ||
      account.syncVersion !== args.version ||
      account.syncedVersion >= args.version
    )
      return;
    if (args.attempt >= 8) {
      await ctx.db.patch(account._id, {
        syncFailed: true,
        updatedAt: Date.now(),
      });
      return;
    }
    await ctx.scheduler.runAfter(
      Math.min(30_000 * 2 ** args.attempt, 3_600_000),
      internal.billingActions.syncSubscription,
      { ...args, attempt: args.attempt + 1 },
    );
  },
});

export const expireAccess = internalMutation({
  args: { orgId: v.id("orgs"), periodEnd: v.number() },
  handler: async (ctx, { orgId, periodEnd }) => {
    const account = await accountForOrg(ctx, orgId);
    const org = await ctx.db.get(orgId);
    if (
      !account?.managed ||
      !org ||
      org.isDeleted ||
      account.environment !== polarConfig().server ||
      account.subscription?.currentPeriodEnd !== periodEnd ||
      periodEnd > Date.now()
    )
      return;
    // A missed webhook/provider outage cannot leave Pro enabled indefinitely.
    if (org.plan === "paid") {
      await ctx.db.patch(orgId, { plan: "free", updatedAt: Date.now() });
      await ctx.db.insert("audit_log", {
        orgId,
        actorType: "system",
        actorId: "polar",
        action: "billing.access_expired",
        resourceType: "orgs",
        resourceId: orgId,
        before: { plan: "paid" },
        after: { plan: "free" },
        createdAt: Date.now(),
      });
    }
    await queueSync(ctx, account);
  },
});
