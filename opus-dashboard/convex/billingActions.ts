import { Polar } from "@polar-sh/sdk";
import type { Subscription } from "@polar-sh/sdk/models/components/subscription";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { action, internalAction } from "./_generated/server";
import { billingReturnUrl, requirePolarConfig } from "./lib/polar";

function client() {
  const config = requirePolarConfig();
  return new Polar({
    accessToken: config.accessToken,
    server: config.server,
    timeoutMs: 15_000,
    retryConfig: { strategy: "none" },
  });
}

async function readSubscriptions(
  polar: Polar,
  account: Doc<"billing_accounts">,
) {
  if (account.environment !== requirePolarConfig().server)
    throw new Error("Polar environment mismatch");
  const subscriptions: Subscription[] = [];
  // Include ended subscriptions so payment failures and cancellations remain
  // visible. Never silently truncate a customer's subscription history.
  for (let page = 1; ; page++) {
    const response = await polar.subscriptions.list({
      externalCustomerId: account.externalCustomerId,
      page,
      limit: 100,
    });
    for (const subscription of response.result.items) {
      if (
        subscription.customer.externalId !== account.externalCustomerId ||
        (account.customerId && subscription.customerId !== account.customerId)
      ) {
        throw new Error("Polar customer mismatch");
      }
      if (subscription.productId === account.productId)
        subscriptions.push(subscription);
    }
    if (page >= response.result.pagination.maxPage) break;
    if (page >= 20)
      throw new Error(
        "Polar subscription history exceeds reconciliation limit",
      );
  }
  const active = (s: Subscription) =>
    s.status === "active" && s.currentPeriodEnd.getTime() > Date.now();
  const open = (s: Subscription) =>
    !["canceled", "incomplete_expired"].includes(s.status);
  subscriptions.sort(
    (a, b) =>
      Number(active(b)) - Number(active(a)) ||
      Number(open(b)) - Number(open(a)) ||
      b.createdAt.getTime() - a.createdAt.getTime(),
  );
  const current = subscriptions[0];
  return {
    customerId: current?.customerId,
    subscription: current
      ? {
          id: current.id,
          status: current.status,
          amount: current.amount,
          currency: current.currency,
          interval: current.recurringInterval,
          intervalCount: current.recurringIntervalCount,
          currentPeriodEnd: current.currentPeriodEnd.getTime(),
          cancelAtPeriodEnd: current.cancelAtPeriodEnd,
        }
      : undefined,
    hasOpenSubscription: subscriptions.some(open),
  };
}

export const createCheckout = action({
  args: {},
  handler: async (ctx): Promise<{ url: string }> => {
    const attemptId = crypto.randomUUID();
    const reservation = await ctx.runMutation(
      internal.billing.reserveCheckout,
      { attemptId },
    );
    try {
      const polar = client();
      const returnUrl = billingReturnUrl();
      const current = await readSubscriptions(polar, reservation.account);
      if (current.hasOpenSubscription) {
        await ctx.runMutation(internal.billing.requestSync, {
          orgId: reservation.orgId,
        });
        throw new ConvexError("SUBSCRIPTION_EXISTS");
      }
      if (
        reservation.account.checkoutId &&
        (reservation.account.checkoutExpiresAt ?? 0) > Date.now()
      ) {
        const checkout = await polar.checkouts.get({
          id: reservation.account.checkoutId,
        });
        if (checkout.status === "open") return { url: checkout.url };
        if (["confirmed", "succeeded"].includes(checkout.status)) {
          await ctx.runMutation(internal.billing.requestSync, {
            orgId: reservation.orgId,
          });
          throw new ConvexError("CHECKOUT_PENDING");
        }
      }
      const product = await polar.products.get({
        id: reservation.account.productId,
      });
      // This integration only sells the existing monthly Pro subscription.
      // Misconfigured one-time, free, metered, or seat products fail closed.
      if (
        !product.isRecurring ||
        product.isArchived ||
        product.recurringInterval !== "month" ||
        product.recurringIntervalCount !== 1 ||
        !product.prices.length ||
        !product.prices.every(
          (price) =>
            price.amountType === "fixed" &&
            "priceAmount" in price &&
            price.priceAmount > 0,
        )
      ) {
        throw new ConvexError("BILLING_UNAVAILABLE");
      }
      const organization = await polar.organizations.get({
        id: product.organizationId,
      });
      // Local reservations cover simultaneous requests. Polar must also reject
      // duplicate subscriptions if a network timeout loses a checkout response.
      if (organization.subscriptionSettings.allowMultipleSubscriptions)
        throw new ConvexError("BILLING_UNAVAILABLE");
      const checkout = await polar.checkouts.create({
        products: [reservation.account.productId],
        externalCustomerId: reservation.account.externalCustomerId,
        customerEmail: reservation.email,
        customerName: reservation.name,
        customerBillingName: reservation.name,
        isBusinessCustomer: true,
        allowTrial: false,
        allowDiscountCodes: false,
        // Keep Macedonian pricing independent of the Convex server's IP.
        currency: "mkd",
        successUrl: `${returnUrl}&checkout=returned`,
        returnUrl,
      });
      const saved = await ctx.runMutation(internal.billing.finishCheckout, {
        orgId: reservation.orgId,
        attemptId,
        checkout: {
          id: checkout.id,
          url: checkout.url,
          expiresAt: checkout.expiresAt.getTime(),
        },
      });
      if (!saved) throw new ConvexError("CHECKOUT_PENDING");
      return { url: checkout.url };
    } catch (error) {
      if (error instanceof ConvexError) throw error;
      // Provider errors can contain tokens, customer data, or checkout secrets.
      console.error(
        "Polar checkout failed",
        error instanceof Error ? error.name : "UnknownError",
      );
      throw new ConvexError("BILLING_UNAVAILABLE");
    } finally {
      await ctx.runMutation(internal.billing.finishCheckout, {
        orgId: reservation.orgId,
        attemptId,
      });
    }
  },
});

export const createPortal = action({
  args: {},
  handler: async (ctx): Promise<{ url: string }> => {
    const { account } = await ctx.runQuery(
      internal.billing.getOwnerContext,
      {},
    );
    if (
      !account?.customerId ||
      account.environment !== requirePolarConfig().server
    )
      throw new ConvexError("BILLING_UNAVAILABLE");
    try {
      const session = await client().customerSessions.create({
        customerId: account.customerId,
        returnUrl: billingReturnUrl(),
      });
      return { url: session.customerPortalUrl };
    } catch {
      throw new ConvexError("BILLING_UNAVAILABLE");
    }
  },
});

export const refresh = action({
  args: {},
  handler: async (ctx): Promise<null> => {
    await ctx.runMutation(internal.billing.requestOwnerSync, {});
    return null;
  },
});

export const syncSubscription = internalAction({
  args: { orgId: v.id("orgs"), version: v.number(), attempt: v.number() },
  handler: async (ctx, args): Promise<null> => {
    const account = await ctx.runQuery(internal.billing.getAccount, {
      orgId: args.orgId,
    });
    if (
      !account ||
      account.syncVersion !== args.version ||
      account.syncedVersion >= args.version
    )
      return null;
    try {
      const snapshot = await readSubscriptions(client(), account);
      await ctx.runMutation(internal.billing.applySnapshot, {
        orgId: args.orgId,
        version: args.version,
        ...snapshot,
      });
    } catch (error) {
      console.error(
        "Polar reconciliation failed",
        error instanceof Error ? error.name : "UnknownError",
      );
      await ctx.runMutation(internal.billing.retrySync, args);
    }
    return null;
  },
});
