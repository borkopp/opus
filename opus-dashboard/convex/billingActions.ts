import { Polar } from "@polar-sh/sdk";
import type { Subscription } from "@polar-sh/sdk/models/components/subscription";
import type { Checkout } from "@polar-sh/sdk/models/components/checkout";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { action, internalAction } from "./_generated/server";
import {
  billingReturnUrl,
  billingCurrency,
  proTeamLimit,
  proTierForProduct,
  requirePolarConfig,
} from "./lib/polar";
import {
  parseBillingCurrency,
  type BillingCurrency,
} from "../../shared/billing-currency";
import { proPriceMinorUnits } from "../../shared/pro-pricing";

function client() {
  const config = requirePolarConfig();
  return new Polar({
    accessToken: config.accessToken,
    server: config.server,
    timeoutMs: 15_000,
    retryConfig: { strategy: "none" },
  });
}

function checkoutUsesTier(
  checkout: Checkout,
  tier: {
    productId: string;
    monthlyPriceMinorUnits: number;
    monthlyPriceEurMinorUnits: number;
  },
  currency: BillingCurrency,
) {
  const prices =
    checkout.prices?.[tier.productId] ?? checkout.product?.prices ?? [];
  const selectedPrices = prices.filter(
    (price) =>
      price.priceCurrency === currency &&
      !("isArchived" in price && price.isArchived),
  );
  // Compare the purchased catalog price. A tax-inclusive checkout's net amount
  // can differ after the customer supplies a billing address.
  return (
    checkout.productId === tier.productId &&
    checkout.currency === currency &&
    checkout.taxBehavior !== "exclusive" &&
    selectedPrices.length === 1 &&
    selectedPrices[0].amountType === "fixed" &&
    "priceAmount" in selectedPrices[0] &&
    selectedPrices[0].priceAmount === proPriceMinorUnits(tier, currency)
  );
}

async function readSubscriptions(
  polar: Polar,
  account: Doc<"billing_accounts">,
) {
  if (account.environment !== requirePolarConfig().server)
    throw new Error("Polar environment mismatch");
  const subscriptions: Subscription[] = [];
  let hasOpenSubscription = false;
  const open = (s: Subscription) =>
    !["canceled", "incomplete_expired"].includes(s.status);
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
      hasOpenSubscription ||= open(subscription);
      if (
        proTierForProduct(subscription.productId) &&
        parseBillingCurrency(subscription.currency.toLowerCase()) &&
        subscription.recurringInterval === "month" &&
        subscription.recurringIntervalCount === 1 &&
        Number.isSafeInteger(subscription.amount) &&
        subscription.amount > 0
      )
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
  subscriptions.sort(
    (a, b) =>
      Number(active(b)) - Number(active(a)) ||
      Number(open(b)) - Number(open(a)) ||
      b.createdAt.getTime() - a.createdAt.getTime(),
  );
  const current = subscriptions[0];
  const tier = current ? proTierForProduct(current.productId) : undefined;
  const pendingTier = current?.pendingUpdate?.productId
    ? proTierForProduct(current.pendingUpdate.productId)
    : undefined;
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
          productId: current.productId,
          teamLimit: tier!.teamLimit,
          ...(pendingTier && current.pendingUpdate
            ? {
                pendingChange: {
                  teamLimit: pendingTier.teamLimit,
                  appliesAt: current.pendingUpdate.appliesAt.getTime(),
                },
              }
            : {}),
        }
      : undefined,
    hasOpenSubscription,
  };
}

export const createCheckout = action({
  args: {
    teamLimit: v.optional(proTeamLimit),
    currency: v.optional(billingCurrency),
  },
  handler: async (
    ctx,
    { teamLimit = 4, currency = "mkd" },
  ): Promise<{ url: string }> => {
    const attemptId = crypto.randomUUID();
    const reservation = await ctx.runMutation(
      internal.billing.reserveCheckout,
      { attemptId, teamLimit },
    );
    try {
      const polar = client();
      const returnUrl = billingReturnUrl();
      const successUrl = new URL(returnUrl);
      successUrl.searchParams.set("checkout", "returned");
      successUrl.searchParams.set("currency", currency);
      successUrl.searchParams.set("team", String(teamLimit));
      const current = await readSubscriptions(polar, reservation.account);
      if (current.hasOpenSubscription) {
        await ctx.runMutation(internal.billing.requestSync, {
          orgId: reservation.orgId,
        });
        throw new ConvexError("SUBSCRIPTION_EXISTS");
      }
      const tiers = requirePolarConfig().tiers.filter(
        (tier): tier is typeof tier & { productId: string } =>
          Boolean(tier.productId),
      );
      const products = await Promise.all(
        tiers.map(async (tier) => {
          const product = await polar.products.get({ id: tier.productId });
          const selectedPrices = product.prices.filter(
            (price) =>
              price.priceCurrency === currency &&
              !("isArchived" in price && price.isArchived),
          );
          // Fail closed if the advertised package cannot be purchased at its
          // exact monthly price in the selected currency.
          if (
            !product.isRecurring ||
            product.isArchived ||
            product.recurringInterval !== "month" ||
            product.recurringIntervalCount !== 1 ||
            selectedPrices.length !== 1 ||
            selectedPrices[0].amountType !== "fixed" ||
            !("priceAmount" in selectedPrices[0]) ||
            selectedPrices[0].priceAmount !== proPriceMinorUnits(tier, currency)
          )
            throw new ConvexError("BILLING_UNAVAILABLE");
          return { tier, product };
        }),
      );
      const selected = products.find(
        ({ tier }) => tier.teamLimit === teamLimit,
      )!;
      const organization = await polar.organizations.get({
        id: selected.product.organizationId,
      });
      if (
        organization.subscriptionSettings.allowMultipleSubscriptions ||
        products.some(({ product }) =>
          product.prices.some(
            (price) =>
              price.priceCurrency === currency &&
              !price.isArchived &&
              (price.taxBehavior ?? organization.defaultTaxBehavior) !==
                "inclusive",
          ),
        ) ||
        products.some(
          ({ product }) =>
            product.organizationId !== selected.product.organizationId,
        )
      )
        throw new ConvexError("BILLING_UNAVAILABLE");
      if (
        reservation.account.checkoutId &&
        (reservation.account.checkoutExpiresAt ?? 0) > Date.now()
      ) {
        const checkout = await polar.checkouts.get({
          id: reservation.account.checkoutId,
        });
        if (checkout.status === "open") {
          if (checkoutUsesTier(checkout, reservation.tier, currency))
            return { url: checkout.url };
          // Reuse the payment session when a buyer changes package or currency.
          if (
            checkout.products.some(
              (product) => product.id === reservation.tier.productId,
            )
          ) {
            const updated = await polar.checkouts.update({
              id: checkout.id,
              checkoutUpdate: {
                productId: reservation.tier.productId,
                currency,
                successUrl: successUrl.toString(),
              },
            });
            if (!checkoutUsesTier(updated, reservation.tier, currency))
              throw new ConvexError("BILLING_UNAVAILABLE");
            await ctx.runMutation(internal.billing.finishCheckout, {
              orgId: reservation.orgId,
              attemptId,
              checkout: {
                id: updated.id,
                url: updated.url,
                expiresAt: updated.expiresAt.getTime(),
                productId: reservation.tier.productId,
                currency,
              },
            });
            return { url: updated.url };
          }
          throw new ConvexError("CHECKOUT_PACKAGE_LOCKED");
        }
        if (["confirmed", "succeeded"].includes(checkout.status)) {
          await ctx.runMutation(internal.billing.requestSync, {
            orgId: reservation.orgId,
          });
          throw new ConvexError("CHECKOUT_PENDING");
        }
      }
      const checkout = await polar.checkouts.create({
        products: [
          reservation.tier.productId,
          ...tiers
            .filter((tier) => tier.teamLimit !== teamLimit)
            .map((tier) => tier.productId),
        ],
        externalCustomerId: reservation.account.externalCustomerId,
        customerEmail: reservation.email,
        customerName: reservation.name,
        customerBillingName: reservation.name,
        isBusinessCustomer: true,
        allowTrial: false,
        allowDiscountCodes: false,
        // Use the website selection, independent of the Convex server's IP.
        currency,
        successUrl: successUrl.toString(),
        returnUrl,
      });
      if (!checkoutUsesTier(checkout, reservation.tier, currency))
        throw new ConvexError("BILLING_UNAVAILABLE");
      const saved = await ctx.runMutation(internal.billing.finishCheckout, {
        orgId: reservation.orgId,
        attemptId,
        checkout: {
          id: checkout.id,
          url: checkout.url,
          expiresAt: checkout.expiresAt.getTime(),
          productId: reservation.tier.productId,
          currency,
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
