import { ConvexError, v } from "convex/values";
import { PRO_TEAM_TIERS, type ProTeamLimit } from "../../../shared/pro-pricing";

export const proTeamLimit = v.union(
  v.literal(4),
  v.literal(5),
  v.literal(6),
  v.literal(8),
  v.literal(12),
);

export const billingCurrency = v.union(v.literal("mkd"), v.literal("eur"));

const productEnvironmentKeys = {
  4: "POLAR_PRO_PRODUCT_ID",
  5: "POLAR_PRO_5_PRODUCT_ID",
  6: "POLAR_PRO_6_PRODUCT_ID",
  8: "POLAR_PRO_8_PRODUCT_ID",
  12: "POLAR_PRO_12_PRODUCT_ID",
} as const;

export const polarSubscription = v.object({
  id: v.string(),
  status: v.string(),
  amount: v.number(),
  currency: v.string(),
  interval: v.string(),
  intervalCount: v.number(),
  currentPeriodEnd: v.number(),
  cancelAtPeriodEnd: v.boolean(),
  // Optional for stored subscriptions created before team packages existed.
  productId: v.optional(v.string()),
  teamLimit: v.optional(proTeamLimit),
  pendingChange: v.optional(
    v.object({
      teamLimit: proTeamLimit,
      appliesAt: v.number(),
    }),
  ),
});

export function polarConfig() {
  const server = process.env.POLAR_SERVER?.trim() || "sandbox";
  const accessToken = process.env.POLAR_ACCESS_TOKEN?.trim();
  const productId = process.env.POLAR_PRO_PRODUCT_ID?.trim();
  const webhookSecret = process.env.POLAR_WEBHOOK_SECRET?.trim();
  const validServer = server === "sandbox" || server === "production";
  const tiers = PRO_TEAM_TIERS.map((tier) => ({
    ...tier,
    productId: process.env[productEnvironmentKeys[tier.teamLimit]]?.trim(),
  }));
  const productIds = tiers.flatMap((tier) =>
    tier.productId ? [tier.productId] : [],
  );
  const distinctProducts = new Set(productIds).size === productIds.length;
  return {
    server:
      server === "production" ? ("production" as const) : ("sandbox" as const),
    accessToken,
    productId,
    webhookSecret,
    tiers,
    configured: Boolean(
      validServer &&
      distinctProducts &&
      accessToken &&
      productId &&
      webhookSecret,
    ),
    checkoutEnabled: process.env.POLAR_ENABLED === "true",
  };
}

/** Only server-configured provider products grant a team capacity. */
export function proTierForProduct(productId: string) {
  return polarConfig().tiers.find((tier) => tier.productId === productId);
}

export function requireProTier(teamLimit: ProTeamLimit) {
  const config = requirePolarConfig();
  const tier = config.tiers.find((tier) => tier.teamLimit === teamLimit);
  if (!tier?.productId) throw new ConvexError("BILLING_UNAVAILABLE");
  return { ...tier, productId: tier.productId };
}

export function requirePolarConfig() {
  const config = polarConfig();
  if (!config.configured || !config.accessToken || !config.productId) {
    throw new ConvexError("BILLING_UNAVAILABLE");
  }
  return {
    ...config,
    accessToken: config.accessToken,
    productId: config.productId,
  };
}

export function billingReturnUrl() {
  const value = process.env.SITE_URL?.trim();
  if (!value) throw new ConvexError("BILLING_UNAVAILABLE");
  const url = new URL(value);
  if (
    url.username ||
    url.password ||
    (url.protocol !== "https:" &&
      !(
        polarConfig().server === "sandbox" &&
        url.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(url.hostname)
      ))
  )
    throw new ConvexError("BILLING_UNAVAILABLE");
  return new URL("/settings?tab=billing", url.origin).toString();
}

export const externalCustomerIdForOrg = (orgId: string) => `opus:${orgId}`;

export function orgIdFromExternalCustomerId(externalId: string) {
  return externalId.startsWith("opus:") ? externalId.slice(5) : null;
}
