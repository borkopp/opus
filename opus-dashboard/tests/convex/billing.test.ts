import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { Webhook } from "standardwebhooks";
import { convexTest } from "convex-test";
import { api, internal } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import schema from "../../convex/schema";
import { convexModules } from "../../convex-test.setup";
import { formatBillingDate } from "../../lib/billing";

const provider = vi.hoisted(() => ({
  list: vi.fn(),
  product: vi.fn(),
  organization: vi.fn(),
  checkout: vi.fn(),
  getCheckout: vi.fn(),
  portal: vi.fn(),
}));
vi.mock("@polar-sh/sdk", () => ({
  Polar: class {
    subscriptions = { list: provider.list };
    products = { get: provider.product };
    organizations = { get: provider.organization };
    checkouts = { create: provider.checkout, get: provider.getCheckout };
    customerSessions = { create: provider.portal };
  },
}));

const NOW = Date.parse("2026-09-25T10:00:00Z");
const END = NOW + 30 * 24 * 60 * 60 * 1000;
const SECRET = `whsec_${Buffer.from("a-long-test-webhook-secret").toString("base64")}`;
const createBackend = () => convexTest(schema, convexModules);
let t: ReturnType<typeof createBackend>;

async function studio(name = "owner") {
  const owner = t.withIdentity({
    subject: name,
    name: "Owner",
    email: `${name}@example.com`,
  });
  await owner.mutation(api.users.ensureUser);
  const { orgId } = await owner.mutation(api.activation.startBeautyBusiness, {
    name: `Studio ${name}`,
    category: "hair_salon",
  });
  return { owner, orgId };
}

function subscription(
  orgId: Id<"orgs">,
  overrides: Record<string, unknown> = {},
) {
  return {
    id: "sub-1",
    productId: "pro-monthly",
    customerId: `customer-${orgId}`,
    customer: { externalId: `opus:${orgId}` },
    status: "active",
    amount: 119000,
    currency: "mkd",
    recurringInterval: "month",
    recurringIntervalCount: 1,
    currentPeriodEnd: new Date(END),
    cancelAtPeriodEnd: false,
    createdAt: new Date(NOW),
    ...overrides,
  };
}

function subscriptions(items: ReturnType<typeof subscription>[]) {
  provider.list.mockResolvedValue({
    result: { items, pagination: { maxPage: 1 } },
  });
}

async function account(orgId: Id<"orgs">) {
  return t.query(internal.billing.getAccount, { orgId });
}

async function sync(orgId: Id<"orgs">) {
  await t.mutation(internal.billing.requestSync, { orgId });
  const current = await account(orgId);
  await t.action(internal.billingActions.syncSubscription, {
    orgId,
    version: current!.syncVersion,
    attempt: 0,
  });
}

async function sendWebhook(
  orgId: Id<"orgs">,
  options: {
    id?: string;
    type?: string;
    signingSecret?: string;
    legacy?: boolean;
    timestamp?: number;
    externalId?: string;
    customerId?: string;
  } = {},
) {
  const eventId = options.id ?? crypto.randomUUID();
  const type = options.type ?? "subscription.updated";
  const customer = {
    id: options.customerId ?? `customer-${orgId}`,
    external_id: options.externalId ?? `opus:${orgId}`,
  };
  const body = JSON.stringify({
    type,
    timestamp: new Date(NOW).toISOString(),
    data: type.startsWith("customer.") ? customer : { id: "sub-1", customer },
  });
  const at = new Date(options.timestamp ?? NOW);
  const signature = new Webhook(
    options.signingSecret ?? SECRET,
    options.legacy ? { format: "raw" } : undefined,
  ).sign(eventId, at, body);
  return t.fetch("/webhooks/polar", {
    method: "POST",
    body,
    headers: {
      "content-type": "application/json",
      "webhook-id": eventId,
      "webhook-timestamp": String(Math.floor(at.getTime() / 1000)),
      "webhook-signature": signature,
    },
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  vi.resetAllMocks();
  for (const [key, value] of Object.entries({
    POLAR_ENABLED: "true",
    POLAR_SERVER: "sandbox",
    POLAR_ACCESS_TOKEN: "test-token",
    POLAR_PRO_PRODUCT_ID: "pro-monthly",
    POLAR_WEBHOOK_SECRET: SECRET,
    SITE_URL: "http://localhost:3000",
    BETTER_AUTH_SECRET: "billing-test-auth-secret",
  }))
    vi.stubEnv(key, value);
  t = createBackend();
  subscriptions([]);
  provider.product.mockResolvedValue({
    isRecurring: true,
    isArchived: false,
    recurringInterval: "month",
    recurringIntervalCount: 1,
    prices: [{ amountType: "fixed", priceAmount: 119000 }],
  });
  provider.organization.mockResolvedValue({
    subscriptionSettings: { allowMultipleSubscriptions: false },
  });
  provider.checkout.mockResolvedValue({
    id: "checkout-1",
    url: "https://sandbox.polar.sh/checkout/test",
    expiresAt: new Date(NOW + 3600_000),
  });
  provider.getCheckout.mockResolvedValue({
    status: "open",
    url: "https://sandbox.polar.sh/checkout/test",
  });
  provider.portal.mockResolvedValue({
    customerPortalUrl: "https://sandbox.polar.sh/portal/session",
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("Polar subscription checkout", () => {
  test("checkout uses the owner's active studio and configured product without granting access", async () => {
    const { owner, orgId } = await studio();
    await expect(
      owner.action(api.billingActions.createCheckout),
    ).resolves.toEqual({ url: "https://sandbox.polar.sh/checkout/test" });
    expect(provider.checkout).toHaveBeenCalledWith(
      expect.objectContaining({
        products: ["pro-monthly"],
        externalCustomerId: `opus:${orgId}`,
        customerEmail: "owner@example.com",
        allowTrial: false,
        currency: "mkd",
        returnUrl: "http://localhost:3000/settings?tab=billing",
      }),
    );
    expect((await owner.query(api.billing.getStatus)).plan).toBe("free");
    expect((await account(orgId))?.checkoutId).toBe("checkout-1");
  });

  test("anonymous users, managers, and staff cannot create checkout, portal, or refresh billing", async () => {
    await expect(t.action(api.billingActions.createCheckout)).rejects.toThrow(
      "Unauthenticated",
    );
    const { owner, orgId } = await studio();
    for (const role of ["manager", "staff"] as const) {
      await t.run(async (ctx) => {
        const member = await ctx.db
          .query("staff_members")
          .withIndex("by_org", (q) => q.eq("orgId", orgId))
          .first();
        await ctx.db.patch(member!._id, { role });
      });
      for (const ref of [
        api.billingActions.createCheckout,
        api.billingActions.createPortal,
        api.billingActions.refresh,
      ]) {
        await expect(owner.action(ref, {})).rejects.toThrow("Unauthorised");
      }
    }
    expect(provider.checkout).not.toHaveBeenCalled();
  });

  test("a second click reuses an open checkout and concurrent requests are reserved", async () => {
    const { owner, orgId } = await studio();
    await owner.action(api.billingActions.createCheckout);
    await owner.action(api.billingActions.createCheckout);
    expect(provider.checkout).toHaveBeenCalledTimes(1);
    await owner.mutation(internal.billing.reserveCheckout, {
      attemptId: "reserved",
    });
    await expect(
      owner.action(api.billingActions.createCheckout),
    ).rejects.toThrow("CHECKOUT_BUSY");
    expect((await account(orgId))?.checkoutAttemptId).toBe("reserved");
  });

  test("a completed checkout awaiting reconciliation cannot create another charge", async () => {
    const { owner } = await studio();
    await owner.action(api.billingActions.createCheckout);
    provider.getCheckout.mockResolvedValue({ status: "succeeded" });
    await expect(
      owner.action(api.billingActions.createCheckout),
    ).rejects.toThrow("CHECKOUT_PENDING");
    expect(provider.checkout).toHaveBeenCalledTimes(1);
  });

  test("a past-due subscription routes back to billing instead of selling a duplicate", async () => {
    const { owner, orgId } = await studio();
    subscriptions([subscription(orgId, { status: "past_due" })]);
    await expect(
      owner.action(api.billingActions.createCheckout),
    ).rejects.toThrow("SUBSCRIPTION_EXISTS");
    expect(provider.checkout).not.toHaveBeenCalled();
  });

  test("requires Polar's duplicate-subscription protection", async () => {
    const { owner } = await studio();
    provider.organization.mockResolvedValue({
      subscriptionSettings: { allowMultipleSubscriptions: true },
    });
    await expect(
      owner.action(api.billingActions.createCheckout),
    ).rejects.toThrow("BILLING_UNAVAILABLE");
    expect(provider.checkout).not.toHaveBeenCalled();
  });

  test.each([
    { isRecurring: false },
    { isArchived: true },
    { recurringInterval: "year" },
    { prices: [{ amountType: "metered_unit", priceAmount: 1 }] },
    { prices: [{ amountType: "free" }] },
  ])("rejects misconfigured subscription products: %j", async (changes) => {
    const { owner } = await studio();
    provider.product.mockResolvedValue({
      isRecurring: true,
      isArchived: false,
      recurringInterval: "month",
      recurringIntervalCount: 1,
      prices: [{ amountType: "fixed", priceAmount: 119000 }],
      ...changes,
    });
    await expect(
      owner.action(api.billingActions.createCheckout),
    ).rejects.toThrow("BILLING_UNAVAILABLE");
    expect(provider.checkout).not.toHaveBeenCalled();
  });

  test("fails closed when unconfigured and releases the reservation after a provider error", async () => {
    const { owner, orgId } = await studio();
    vi.stubEnv("POLAR_ENABLED", "false");
    expect((await owner.query(api.billing.getStatus)).checkoutAvailable).toBe(
      false,
    );
    await expect(
      owner.action(api.billingActions.createCheckout),
    ).rejects.toThrow("BILLING_UNAVAILABLE");
    vi.stubEnv("POLAR_ENABLED", "true");
    provider.checkout.mockRejectedValue(new Error("provider unavailable"));
    await expect(
      owner.action(api.billingActions.createCheckout),
    ).rejects.toThrow("BILLING_UNAVAILABLE");
    expect((await account(orgId))?.checkoutAttemptId).toBeUndefined();
  });

  test("a manually enabled Pro studio keeps its plan and is not sold a second plan", async () => {
    const { owner, orgId } = await studio();
    await t.run((ctx) => ctx.db.patch(orgId, { plan: "paid" }));
    await expect(
      owner.action(api.billingActions.createCheckout),
    ).rejects.toThrow("ALREADY_PRO");
    await owner.action(api.billingActions.refresh);
    expect((await owner.query(api.billing.getStatus)).plan).toBe("paid");
  });
});

describe("subscription access reconciliation", () => {
  test("billing dates use Skopje time and bundled Macedonian month names", () => {
    const timestamp = Date.parse("2026-09-24T23:30:00Z");
    expect(formatBillingDate(timestamp, "mk-MK")).toBe("25 септ 2026");
    expect(formatBillingDate(timestamp, "en-GB")).toBe("25 Sep 2026");
  });

  test("turning off new checkout preserves reconciliation and portal access", async () => {
    const { owner, orgId } = await studio();
    await owner.action(api.billingActions.createCheckout);
    vi.stubEnv("POLAR_ENABLED", "false");
    subscriptions([subscription(orgId)]);
    await sync(orgId);
    expect(await owner.query(api.billing.getStatus)).toMatchObject({
      plan: "paid",
      checkoutAvailable: false,
      portalAvailable: true,
    });
    await expect(
      owner.action(api.billingActions.createPortal),
    ).resolves.toHaveProperty("url");
  });

  test("a stale queued job can be superseded by an owner refresh", async () => {
    const { owner, orgId } = await studio();
    await owner.action(api.billingActions.createCheckout);
    await owner.action(api.billingActions.refresh);
    const previous = (await account(orgId))!;
    vi.setSystemTime(NOW + 6_000);
    await owner.action(api.billingActions.refresh);
    expect((await account(orgId))?.syncVersion).toBe(previous.syncVersion + 1);
  });

  test("unchanged reconciliations do not duplicate subscription audit entries", async () => {
    const { owner, orgId } = await studio();
    await owner.action(api.billingActions.createCheckout);
    subscriptions([subscription(orgId)]);
    await sync(orgId);
    await sync(orgId);
    const audit = await t.run((ctx) =>
      ctx.db
        .query("audit_log")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .collect(),
    );
    expect(
      audit.filter((entry) => entry.action === "billing.subscription_synced"),
    ).toHaveLength(1);
  });

  test("verified provider state grants Pro, including after a delayed checkout return", async () => {
    const { owner, orgId } = await studio();
    await owner.action(api.billingActions.createCheckout);
    await owner.action(api.billingActions.refresh);
    expect((await owner.query(api.billing.getStatus)).plan).toBe("free");
    subscriptions([subscription(orgId)]);
    await sync(orgId);
    expect(await owner.query(api.billing.getStatus)).toMatchObject({
      plan: "paid",
      managed: true,
      portalAvailable: true,
      subscription: { amount: 119000, currentPeriodEnd: END },
    });
    await expect(
      owner.action(api.billingActions.createPortal),
    ).resolves.toEqual({ url: "https://sandbox.polar.sh/portal/session" });
    expect(provider.portal).toHaveBeenCalledWith({
      customerId: `customer-${orgId}`,
      returnUrl: "http://localhost:3000/settings?tab=billing",
    });
  });

  test("end-of-period cancellation preserves Pro; final revocation returns to Free", async () => {
    const { owner, orgId } = await studio();
    await owner.action(api.billingActions.createCheckout);
    subscriptions([subscription(orgId, { cancelAtPeriodEnd: true })]);
    await sync(orgId);
    expect((await owner.query(api.billing.getStatus)).plan).toBe("paid");
    subscriptions([
      subscription(orgId, { status: "canceled", cancelAtPeriodEnd: true }),
    ]);
    await sync(orgId);
    expect((await owner.query(api.billing.getStatus)).plan).toBe("free");
    const audit = await t.run((ctx) =>
      ctx.db
        .query("audit_log")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .collect(),
    );
    expect(
      audit.filter((entry) => entry.action === "billing.subscription_synced"),
    ).toHaveLength(2);
  });

  test.each([
    "past_due",
    "unpaid",
    "canceled",
    "paused",
    "incomplete",
    "trialing",
  ])("%s does not retain paid access", async (status) => {
    const { owner, orgId } = await studio();
    await owner.action(api.billingActions.createCheckout);
    subscriptions([subscription(orgId)]);
    await sync(orgId);
    subscriptions([subscription(orgId, { status })]);
    await sync(orgId);
    expect((await owner.query(api.billing.getStatus)).plan).toBe("free");
    await expect(
      owner.query(api.ai.conversations.listConversations, { orgId }),
    ).rejects.toThrow("requires the paid plan");
  });

  test("an unrelated product never grants Pro, and an old cancellation cannot revoke a newer active subscription", async () => {
    const { owner, orgId } = await studio();
    await owner.action(api.billingActions.createCheckout);
    subscriptions([subscription(orgId, { productId: "ai-credit-pack" })]);
    await sync(orgId);
    expect((await owner.query(api.billing.getStatus)).plan).toBe("free");
    subscriptions([
      subscription(orgId, { status: "canceled" }),
      subscription(orgId, { id: "sub-2" }),
    ]);
    await sync(orgId);
    expect(await owner.query(api.billing.getStatus)).toMatchObject({
      plan: "paid",
      subscription: { id: "sub-2" },
    });
  });

  test("a slow, stale reconciliation cannot restore access after a newer revocation", async () => {
    const { owner, orgId } = await studio();
    await owner.action(api.billingActions.createCheckout);
    subscriptions([subscription(orgId)]);
    await sync(orgId);
    const old = (await account(orgId))!;
    subscriptions([subscription(orgId, { status: "canceled" })]);
    await sync(orgId);
    await t.mutation(internal.billing.applySnapshot, {
      orgId,
      version: old.syncVersion,
      customerId: old.customerId,
      subscription: old.subscription,
      hasOpenSubscription: true,
    });
    expect((await owner.query(api.billing.getStatus)).plan).toBe("free");
  });

  test("a renewal extends access and invalidates the previous period's expiry job", async () => {
    const { owner, orgId } = await studio();
    await owner.action(api.billingActions.createCheckout);
    subscriptions([subscription(orgId)]);
    await sync(orgId);
    subscriptions([
      subscription(orgId, { currentPeriodEnd: new Date(END + 30 * 86400_000) }),
    ]);
    await sync(orgId);
    vi.setSystemTime(END + 10);
    await t.mutation(internal.billing.expireAccess, { orgId, periodEnd: END });
    expect((await owner.query(api.billing.getStatus)).plan).toBe("paid");
  });

  test("missed events cannot leave access enabled after the last confirmed period", async () => {
    const { owner, orgId } = await studio();
    await owner.action(api.billingActions.createCheckout);
    subscriptions([subscription(orgId)]);
    await sync(orgId);
    vi.setSystemTime(END + 10);
    await t.mutation(internal.billing.expireAccess, { orgId, periodEnd: END });
    expect((await owner.query(api.billing.getStatus)).plan).toBe("free");
  });

  test("provider outages preserve the last confirmed state, queue retries, and expose exhausted retries", async () => {
    const { owner, orgId } = await studio();
    await owner.action(api.billingActions.createCheckout);
    subscriptions([subscription(orgId)]);
    await sync(orgId);
    provider.list.mockRejectedValue(new Error("network error"));
    await sync(orgId);
    expect((await owner.query(api.billing.getStatus)).plan).toBe("paid");
    const current = (await account(orgId))!;
    await t.action(internal.billingActions.syncSubscription, {
      orgId,
      version: current.syncVersion,
      attempt: 8,
    });
    expect((await owner.query(api.billing.getStatus)).syncFailed).toBe(true);
  });

  test("customer and environment mismatches cannot activate the wrong studio", async () => {
    const one = await studio("one");
    const two = await studio("two");
    await one.owner.action(api.billingActions.createCheckout);
    subscriptions([subscription(two.orgId)]);
    await sync(one.orgId);
    expect((await one.owner.query(api.billing.getStatus)).plan).toBe("free");
    expect((await two.owner.query(api.billing.getStatus)).plan).toBe("free");
    vi.stubEnv("POLAR_SERVER", "production");
    await expect(
      one.owner.action(api.billingActions.createCheckout),
    ).rejects.toThrow("BILLING_UNAVAILABLE");
  });
});

describe("signed Polar webhooks", () => {
  test("rejects invalid signatures and stale deliveries without mutating access", async () => {
    const { owner, orgId } = await studio();
    await owner.action(api.billingActions.createCheckout);
    expect(
      (
        await sendWebhook(orgId, {
          signingSecret: `whsec_${Buffer.from("wrong-secret").toString("base64")}`,
        })
      ).status,
    ).toBe(401);
    expect(
      (await sendWebhook(orgId, { timestamp: NOW - 301_000 })).status,
    ).toBe(401);
    expect((await account(orgId))?.syncVersion).toBe(0);
  });

  test.each([false, true])(
    "verifies signatures (legacy=%s), persists once, and schedules authoritative reconciliation",
    async (legacy) => {
      const { owner, orgId } = await studio();
      await owner.action(api.billingActions.createCheckout);
      expect((await sendWebhook(orgId, { id: "event-1", legacy })).status).toBe(
        200,
      );
      expect((await sendWebhook(orgId, { id: "event-1", legacy })).status).toBe(
        200,
      );
      expect((await account(orgId))?.syncVersion).toBe(1);
      // Even a signed 'active' event cannot itself grant access.
      expect((await owner.query(api.billing.getStatus)).plan).toBe("free");
      subscriptions([subscription(orgId)]);
      await t.action(internal.billingActions.syncSubscription, {
        orgId,
        version: 1,
        attempt: 0,
      });
      expect((await owner.query(api.billing.getStatus)).plan).toBe("paid");
      const receipts = await t.run((ctx) =>
        ctx.db
          .query("billing_webhook_events")
          .withIndex("by_org", (q) => q.eq("orgId", orgId))
          .collect(),
      );
      expect(receipts).toHaveLength(1);
    },
  );

  test("customer state and refund events reconcile current subscription state, including partial refunds", async () => {
    const { owner, orgId } = await studio();
    await owner.action(api.billingActions.createCheckout);
    subscriptions([subscription(orgId)]);
    expect(
      (await sendWebhook(orgId, { type: "customer.state_changed" })).status,
    ).toBe(200);
    await sync(orgId);
    expect((await sendWebhook(orgId, { type: "order.refunded" })).status).toBe(
      200,
    );
    await sync(orgId);
    expect((await owner.query(api.billing.getStatus)).plan).toBe("paid");
  });

  test("unknown tenants and mismatched provider customers are ignored", async () => {
    const { owner, orgId } = await studio();
    await owner.action(api.billingActions.createCheckout);
    expect(
      (await sendWebhook(orgId, { externalId: "opus:not-a-convex-id" })).status,
    ).toBe(200);
    expect((await account(orgId))?.syncVersion).toBe(0);
    await sendWebhook(orgId);
    expect(
      (await sendWebhook(orgId, { customerId: "different-customer" })).status,
    ).toBe(200);
    expect((await account(orgId))?.syncVersion).toBe(1);
  });
});
