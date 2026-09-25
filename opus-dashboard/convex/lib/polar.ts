import { ConvexError, v } from "convex/values";

export const polarSubscription = v.object({
  id: v.string(),
  status: v.string(),
  amount: v.number(),
  currency: v.string(),
  interval: v.string(),
  intervalCount: v.number(),
  currentPeriodEnd: v.number(),
  cancelAtPeriodEnd: v.boolean(),
});

export function polarConfig() {
  const server = process.env.POLAR_SERVER?.trim() || "sandbox";
  const accessToken = process.env.POLAR_ACCESS_TOKEN?.trim();
  const productId = process.env.POLAR_PRO_PRODUCT_ID?.trim();
  const webhookSecret = process.env.POLAR_WEBHOOK_SECRET?.trim();
  const validServer = server === "sandbox" || server === "production";
  return {
    server:
      server === "production" ? ("production" as const) : ("sandbox" as const),
    accessToken,
    productId,
    webhookSecret,
    configured: Boolean(
      validServer && accessToken && productId && webhookSecret,
    ),
    checkoutEnabled: process.env.POLAR_ENABLED === "true",
  };
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
