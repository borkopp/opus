import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { Webhook } from "standardwebhooks";
import { convexTest } from "convex-test";
import { api, internal } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import schema from "../../convex/schema";
import { convexModules } from "../../convex-test.setup";
import { formatBillingDate } from "../../lib/billing";
import {
  PRO_TEAM_TIERS,
  proPriceMinorUnits,
} from "../../../shared/pro-pricing";
import {
  BILLING_CURRENCIES,
  type BillingCurrency,
} from "../../../shared/billing-currency";

const provider = vi.hoisted(() => ({
  list: vi.fn(),
  product: vi.fn(),
  organization: vi.fn(),
  checkout: vi.fn(),
  getCheckout: vi.fn(),
  updateCheckout: vi.fn(),
  portal: vi.fn(),
}));
vi.mock("@polar-sh/sdk", () => ({
  Polar: class {
    subscriptions = { list: provider.list };
    products = { get: provider.product };
    organizations = { get: provider.organization };
    checkouts = {
      create: provider.checkout,
      get: provider.getCheckout,
      update: provider.updateCheckout,
    };
    customerSessions = { create: provider.portal };
  },
}));

const NOW = Date.parse("2026-09-25T10:00:00Z");
const END = NOW + 30 * 24 * 60 * 60 * 1000;
const SECRET = `whsec_${Buffer.from("a-long-test-webhook-secret").toString("base64")}`;
const productIdForLimit = (limit: number) =>
  limit === 4 ? "pro-monthly" : `pro-monthly-${limit}`;
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
    amount: 149000,
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
    POLAR_PRO_5_PRODUCT_ID: "pro-monthly-5",
    POLAR_PRO_6_PRODUCT_ID: "pro-monthly-6",
    POLAR_PRO_8_PRODUCT_ID: "pro-monthly-8",
    POLAR_PRO_12_PRODUCT_ID: "pro-monthly-12",
    POLAR_WEBHOOK_SECRET: SECRET,
    SITE_URL: "http://localhost:3000",
    BETTER_AUTH_SECRET: "billing-test-auth-secret",
  }))
    vi.stubEnv(key, value);
  t = createBackend();
  subscriptions([]);
  provider.product.mockImplementation(({ id }: { id: string }) => {
    const tier = PRO_TEAM_TIERS.find(
      (tier) => productIdForLimit(tier.teamLimit) === id,
    )!;
    return {
      id,
      organizationId: "opus-provider-org",
      isRecurring: true,
      isArchived: false,
      recurringInterval: "month",
      recurringIntervalCount: 1,
      prices: [
        {
          amountType: "fixed",
          priceAmount: tier.monthlyPriceMinorUnits,
          priceCurrency: "mkd",
        },
        {
          amountType: "fixed",
          priceAmount: tier.monthlyPriceEurMinorUnits,
          priceCurrency: "eur",
        },
      ],
    };
  });
  provider.organization.mockResolvedValue({
    subscriptionSettings: { allowMultipleSubscriptions: false },
    defaultTaxBehavior: "inclusive",
  });
  const checkoutForProduct = (
    productId: string,
    currency: BillingCurrency = "mkd",
  ) => ({
    id: "checkout-1",
    status: "open",
    productId,
    amount: proPriceMinorUnits(
      PRO_TEAM_TIERS.find(
        (tier) => productIdForLimit(tier.teamLimit) === productId,
      )!,
      currency,
    ),
    currency,
    url: "https://sandbox.polar.sh/checkout/test",
    expiresAt: new Date(NOW + 3600_000),
    products: PRO_TEAM_TIERS.map((tier) => ({
      id: productIdForLimit(tier.teamLimit),
    })),
    prices: Object.fromEntries(
      PRO_TEAM_TIERS.map((tier) => [
        productIdForLimit(tier.teamLimit),
        [
          {
            amountType: "fixed",
            priceCurrency: "mkd",
            priceAmount: tier.monthlyPriceMinorUnits,
          },
          {
            amountType: "fixed",
            priceCurrency: "eur",
            priceAmount: tier.monthlyPriceEurMinorUnits,
          },
        ],
      ]),
    ),
  });
  provider.checkout.mockImplementation(
    ({
      products,
      currency,
    }: {
      products: string[];
      currency: BillingCurrency;
    }) => checkoutForProduct(products[0], currency),
  );
  provider.getCheckout.mockResolvedValue(checkoutForProduct("pro-monthly"));
  provider.updateCheckout.mockImplementation(
    ({
      checkoutUpdate,
    }: {
      checkoutUpdate: { productId: string; currency: BillingCurrency };
    }) => checkoutForProduct(checkoutUpdate.productId, checkoutUpdate.currency),
  );
  provider.portal.mockResolvedValue({
    customerPortalUrl: "https://sandbox.polar.sh/portal/session",
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("Polar subscription checkout", () => {
  test.each(
    PRO_TEAM_TIERS.flatMap((tier) =>
      BILLING_CURRENCIES.map((currency) => ({ ...tier, currency })),
    ),
  )(
    "opens the $teamLimit-member checkout in $currency and activates only after signed provider confirmation",
    async (tier) => {
      const { owner, orgId } = await studio();
      await owner.action(api.billingActions.createCheckout, {
        teamLimit: tier.teamLimit,
        currency: tier.currency,
      });
      expect(provider.checkout).toHaveBeenCalledWith(
        expect.objectContaining({ currency: tier.currency }),
      );
      expect((await owner.query(api.billing.getStatus)).plan).toBe("free");
      subscriptions([
        subscription(orgId, {
          productId: productIdForLimit(tier.teamLimit),
          currency: tier.currency,
          amount: proPriceMinorUnits(tier, tier.currency),
        }),
      ]);
      expect((await sendWebhook(orgId)).status).toBe(200);
      const state = await account(orgId);
      await t.action(internal.billingActions.syncSubscription, {
        orgId,
        version: state!.syncVersion,
        attempt: 0,
      });
      expect(await owner.query(api.billing.getStatus)).toMatchObject({
        plan: "paid",
        teamLimit: tier.teamLimit,
        subscription: {
          currency: tier.currency,
          amount: proPriceMinorUnits(tier, tier.currency),
        },
      });
    },
  );

  test("changing currency reuses checkout with the correct EUR price and return destination", async () => {
    const { owner, orgId } = await studio();
    await owner.action(api.billingActions.createCheckout, { currency: "mkd" });
    await owner.action(api.billingActions.createCheckout, { currency: "eur" });
    expect(provider.checkout).toHaveBeenCalledTimes(1);
    expect(provider.updateCheckout).toHaveBeenCalledWith({
      id: "checkout-1",
      checkoutUpdate: {
        productId: "pro-monthly",
        currency: "eur",
        successUrl:
          "http://localhost:3000/settings?tab=billing&checkout=returned&currency=eur&team=4",
      },
    });
    expect((await owner.query(api.billing.getStatus)).plan).toBe("free");
    const audits = await t.run((ctx) =>
      ctx.db
        .query("audit_log")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .collect(),
    );
    expect(
      audits.some(
        (entry) =>
          entry.action === "billing.checkout_created" &&
          entry.after?.currency === "eur",
      ),
    ).toBe(true);
  });

  test("rejects unsupported checkout currencies before contacting Polar", async () => {
    const { owner } = await studio();
    await expect(
      owner.action(api.billingActions.createCheckout, {
        currency: "usd",
      } as never),
    ).rejects.toThrow();
    expect(provider.checkout).not.toHaveBeenCalled();
  });

  test.each(["missing", "wrong", "duplicate", "exclusive"])(
    "refuses EUR checkout when its catalog price is %s",
    async (kind) => {
      const { owner } = await studio();
      const original = provider.product.getMockImplementation()!;
      provider.product.mockImplementation(async (args) => {
        const product = await original(args);
        const eur = {
          amountType: "fixed",
          priceCurrency: "eur",
          priceAmount: 2490,
          taxBehavior: "inclusive",
        };
        return {
          ...product,
          prices: [
            product.prices[0],
            ...(kind === "missing"
              ? []
              : kind === "duplicate"
                ? [eur, eur]
                : [
                    {
                      ...eur,
                      priceAmount: kind === "wrong" ? 1 : 2490,
                      taxBehavior:
                        kind === "exclusive" ? "exclusive" : "inclusive",
                    },
                  ]),
          ],
        };
      });
      await expect(
        owner.action(api.billingActions.createCheckout, { currency: "eur" }),
      ).rejects.toThrow("BILLING_UNAVAILABLE");
      expect(provider.checkout).not.toHaveBeenCalled();
    },
  );

  test("refuses a provider checkout that returns MKD after EUR was selected", async () => {
    const { owner } = await studio();
    provider.checkout.mockResolvedValue(await provider.getCheckout());
    await expect(
      owner.action(api.billingActions.createCheckout, { currency: "eur" }),
    ).rejects.toThrow("BILLING_UNAVAILABLE");
  });

  test("refuses a checkout whose tax is added above the advertised price", async () => {
    const { owner } = await studio();
    provider.checkout.mockResolvedValue({
      ...(await provider.getCheckout()),
      taxBehavior: "exclusive",
    });
    await expect(
      owner.action(api.billingActions.createCheckout, {}),
    ).rejects.toThrow("BILLING_UNAVAILABLE");
  });

  test("EUR renewal, scheduled cancellation and expiry preserve the Pro lifecycle", async () => {
    const { owner, orgId } = await studio();
    await owner.action(api.billingActions.createCheckout, { currency: "eur" });
    subscriptions([
      subscription(orgId, {
        currency: "eur",
        amount: 2490,
        cancelAtPeriodEnd: true,
      }),
    ]);
    await sync(orgId);
    expect((await owner.query(api.billing.getStatus)).plan).toBe("paid");
    const renewedEnd = END + 30 * 86400_000;
    subscriptions([
      subscription(orgId, {
        currency: "eur",
        amount: 2490,
        currentPeriodEnd: new Date(renewedEnd),
      }),
    ]);
    await sync(orgId);
    await t.mutation(internal.billing.expireAccess, { orgId, periodEnd: END });
    expect((await owner.query(api.billing.getStatus)).plan).toBe("paid");
    vi.setSystemTime(renewedEnd + 1);
    await t.mutation(internal.billing.expireAccess, {
      orgId,
      periodEnd: renewedEnd,
    });
    expect((await owner.query(api.billing.getStatus)).plan).toBe("free");
  });

  test.each(PRO_TEAM_TIERS)(
    "selects the $teamLimit-member product at the advertised price without granting capacity",
    async ({ teamLimit, monthlyPriceMinorUnits }) => {
      const { owner, orgId } = await studio();
      await owner.action(api.billingActions.createCheckout, { teamLimit });
      expect(provider.checkout).toHaveBeenCalledWith(
        expect.objectContaining({
          products: [
            productIdForLimit(teamLimit),
            ...PRO_TEAM_TIERS.filter(
              (tier) => tier.teamLimit !== teamLimit,
            ).map((tier) => productIdForLimit(tier.teamLimit)),
          ],
        }),
      );
      expect((await account(orgId))?.checkoutProductId).toBe(
        productIdForLimit(teamLimit),
      );
      expect(
        (await owner.query(api.staff.getStaffPlanStatus, {})).totalLimit,
      ).toBe(4);
      subscriptions([
        subscription(orgId, {
          productId: productIdForLimit(teamLimit),
          amount: monthlyPriceMinorUnits,
        }),
      ]);
      await sync(orgId);
      expect(await owner.query(api.billing.getStatus)).toMatchObject({
        plan: "paid",
        teamLimit,
      });
      expect(await owner.query(api.staff.getStaffPlanStatus, {})).toMatchObject(
        { totalLimit: teamLimit },
      );
    },
  );

  test("changing the selected package updates the same open checkout", async () => {
    const { owner, orgId } = await studio();
    await owner.action(api.billingActions.createCheckout, { teamLimit: 4 });
    await owner.action(api.billingActions.createCheckout, { teamLimit: 8 });
    expect(provider.checkout).toHaveBeenCalledTimes(1);
    expect(provider.updateCheckout).toHaveBeenCalledWith({
      id: "checkout-1",
      checkoutUpdate: {
        productId: "pro-monthly-8",
        currency: "mkd",
        successUrl:
          "http://localhost:3000/settings?tab=billing&checkout=returned&currency=mkd&team=8",
      },
    });
    expect((await account(orgId))?.checkoutProductId).toBe("pro-monthly-8");
    expect((await owner.query(api.billing.getStatus)).plan).toBe("free");
  });

  test("rejects arbitrary capacities and unavailable or duplicate product mappings", async () => {
    const { owner } = await studio();
    await expect(
      owner.action(api.billingActions.createCheckout, {
        teamLimit: 7,
      } as never),
    ).rejects.toThrow();
    vi.stubEnv("POLAR_PRO_8_PRODUCT_ID", "");
    await expect(
      owner.action(api.billingActions.createCheckout, { teamLimit: 8 }),
    ).rejects.toThrow("BILLING_UNAVAILABLE");
    vi.stubEnv("POLAR_PRO_8_PRODUCT_ID", "pro-monthly");
    await expect(
      owner.action(api.billingActions.createCheckout, { teamLimit: 8 }),
    ).rejects.toThrow("BILLING_UNAVAILABLE");
    expect(provider.checkout).not.toHaveBeenCalled();
  });

  test("refuses a package smaller than the current active team", async () => {
    const { owner, orgId } = await studio();
    await t.run(async (ctx) => {
      for (let i = 0; i < 5; i++)
        await ctx.db.insert("staff_members", {
          orgId,
          displayName: `Legacy ${i}`,
          role: "staff",
          specialties: [],
          isActive: true,
          isDeleted: false,
          createdAt: NOW,
          updatedAt: NOW,
        });
    });
    await expect(
      owner.action(api.billingActions.createCheckout, { teamLimit: 5 }),
    ).rejects.toThrow("TEAM_EXCEEDS_PACKAGE");
    expect(await owner.query(api.billing.getStatus)).toMatchObject({
      teamCount: 6,
      recommendedTeamLimit: 6,
    });
    await owner.action(api.billingActions.createCheckout, { teamLimit: 6 });
    expect(provider.checkout).toHaveBeenCalledTimes(1);
  });
  test("checkout uses the owner's active studio and configured product without granting access", async () => {
    const { owner, orgId } = await studio();
    await expect(
      owner.action(api.billingActions.createCheckout, {}),
    ).resolves.toEqual({ url: "https://sandbox.polar.sh/checkout/test" });
    expect(provider.checkout).toHaveBeenCalledWith(
      expect.objectContaining({
        products: PRO_TEAM_TIERS.map((tier) =>
          productIdForLimit(tier.teamLimit),
        ),
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
    await expect(
      t.action(api.billingActions.createCheckout, {}),
    ).rejects.toThrow("Unauthenticated");
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
    await owner.action(api.billingActions.createCheckout, {});
    await owner.action(api.billingActions.createCheckout, {});
    expect(provider.checkout).toHaveBeenCalledTimes(1);
    await owner.mutation(internal.billing.reserveCheckout, {
      attemptId: "reserved",
    });
    await expect(
      owner.action(api.billingActions.createCheckout, {}),
    ).rejects.toThrow("CHECKOUT_BUSY");
    expect((await account(orgId))?.checkoutAttemptId).toBe("reserved");
  });

  test("tax calculation does not prevent reusing a correctly priced checkout", async () => {
    const { owner } = await studio();
    await owner.action(api.billingActions.createCheckout, {});
    const existing = await provider.getCheckout();
    provider.getCheckout.mockResolvedValue({
      ...existing,
      prices: {
        ...existing.prices,
        "pro-monthly": [
          {
            ...existing.prices["pro-monthly"][0],
            isArchived: true,
            priceAmount: 119000,
          },
          ...existing.prices["pro-monthly"],
        ],
      },
      amount: 126271,
      netAmount: 126271,
      taxAmount: 22729,
      totalAmount: 149000,
      taxBehavior: "inclusive",
    });
    await expect(
      owner.action(api.billingActions.createCheckout, {}),
    ).resolves.toEqual({ url: "https://sandbox.polar.sh/checkout/test" });
    expect(provider.checkout).toHaveBeenCalledTimes(1);
    expect(provider.updateCheckout).not.toHaveBeenCalled();
  });

  test("a completed checkout awaiting reconciliation cannot create another charge", async () => {
    const { owner } = await studio();
    await owner.action(api.billingActions.createCheckout, {});
    provider.getCheckout.mockResolvedValue({ status: "succeeded" });
    await expect(
      owner.action(api.billingActions.createCheckout, {}),
    ).rejects.toThrow("CHECKOUT_PENDING");
    expect(provider.checkout).toHaveBeenCalledTimes(1);
  });

  test("a past-due subscription routes back to billing instead of selling a duplicate", async () => {
    const { owner, orgId } = await studio();
    subscriptions([subscription(orgId, { status: "past_due" })]);
    await expect(
      owner.action(api.billingActions.createCheckout, {}),
    ).rejects.toThrow("SUBSCRIPTION_EXISTS");
    expect(provider.checkout).not.toHaveBeenCalled();
  });

  test("requires Polar's duplicate-subscription protection", async () => {
    const { owner } = await studio();
    provider.organization.mockResolvedValue({
      subscriptionSettings: { allowMultipleSubscriptions: true },
    });
    await expect(
      owner.action(api.billingActions.createCheckout, {}),
    ).rejects.toThrow("BILLING_UNAVAILABLE");
    expect(provider.checkout).not.toHaveBeenCalled();
  });

  test.each([
    { isRecurring: false },
    { isArchived: true },
    { recurringInterval: "year" },
    { prices: [{ amountType: "metered_unit", priceAmount: 1 }] },
    { prices: [{ amountType: "free" }] },
    {
      prices: [
        { amountType: "fixed", priceAmount: 119000, priceCurrency: "mkd" },
      ],
    },
    {
      prices: [
        { amountType: "fixed", priceAmount: 149000, priceCurrency: "eur" },
      ],
    },
  ])("rejects misconfigured subscription products: %j", async (changes) => {
    const { owner } = await studio();
    provider.product.mockResolvedValue({
      isRecurring: true,
      isArchived: false,
      recurringInterval: "month",
      recurringIntervalCount: 1,
      prices: [
        { amountType: "fixed", priceAmount: 149000, priceCurrency: "mkd" },
      ],
      ...changes,
    });
    await expect(
      owner.action(api.billingActions.createCheckout, {}),
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
      owner.action(api.billingActions.createCheckout, {}),
    ).rejects.toThrow("BILLING_UNAVAILABLE");
    vi.stubEnv("POLAR_ENABLED", "true");
    provider.checkout.mockRejectedValue(new Error("provider unavailable"));
    await expect(
      owner.action(api.billingActions.createCheckout, {}),
    ).rejects.toThrow("BILLING_UNAVAILABLE");
    expect((await account(orgId))?.checkoutAttemptId).toBeUndefined();
  });

  test("a manually enabled Pro studio keeps its plan and is not sold a second plan", async () => {
    const { owner, orgId } = await studio();
    await t.run((ctx) => ctx.db.patch(orgId, { plan: "paid" }));
    await expect(
      owner.action(api.billingActions.createCheckout, {}),
    ).rejects.toThrow("ALREADY_PRO");
    await owner.action(api.billingActions.refresh);
    expect((await owner.query(api.billing.getStatus)).plan).toBe("paid");
  });
});

describe("subscription access reconciliation", () => {
  test("portal package changes update capacity only when applied, including scheduled downgrades", async () => {
    const { owner, orgId } = await studio();
    await owner.action(api.billingActions.createCheckout, { teamLimit: 12 });
    subscriptions([
      subscription(orgId, {
        productId: "pro-monthly-12",
        amount: 329000,
        pendingUpdate: { productId: "pro-monthly-5", appliesAt: new Date(END) },
      }),
    ]);
    await sync(orgId);
    expect(await owner.query(api.billing.getStatus)).toMatchObject({
      teamLimit: 12,
      subscription: { pendingChange: { teamLimit: 5, appliesAt: END } },
    });
    subscriptions([
      subscription(orgId, {
        productId: "pro-monthly-5",
        amount: 179000,
        currentPeriodEnd: new Date(END + 30 * 86400_000),
      }),
    ]);
    await sync(orgId);
    expect(await owner.query(api.staff.getStaffPlanStatus, {})).toMatchObject({
      totalLimit: 5,
    });
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

  test("capacity comes from the configured product, never a requested package or metadata", async () => {
    const { owner, orgId } = await studio();
    await owner.action(api.billingActions.createCheckout, { teamLimit: 12 });
    subscriptions([subscription(orgId, { metadata: { team_limit: 12 } })]);
    await sync(orgId);
    expect(
      (await owner.query(api.staff.getStaffPlanStatus, {})).totalLimit,
    ).toBe(4);
    subscriptions([
      subscription(orgId, {
        productId: "untrusted-product",
        amount: 329000,
        metadata: { team_limit: 12 },
      }),
    ]);
    await sync(orgId);
    expect((await owner.query(api.billing.getStatus)).plan).toBe("free");
  });

  test.each([
    { currency: "usd" },
    { recurringInterval: "year" },
    { recurringIntervalCount: 2 },
    { amount: 149000.5 },
    { amount: 0 },
  ])(
    "misconfigured provider subscriptions do not grant Pro: %j",
    async (changes) => {
      const { owner, orgId } = await studio();
      await owner.action(api.billingActions.createCheckout, {});
      subscriptions([subscription(orgId, changes)]);
      await sync(orgId);
      expect((await owner.query(api.billing.getStatus)).plan).toBe("free");
    },
  );
  test("billing dates use Skopje time and bundled Macedonian month names", () => {
    const timestamp = Date.parse("2026-09-24T23:30:00Z");
    expect(formatBillingDate(timestamp, "mk-MK")).toBe("25 септ 2026");
    expect(formatBillingDate(timestamp, "en-GB")).toBe("25 Sep 2026");
  });

  test("turning off new checkout preserves reconciliation and portal access", async () => {
    const { owner, orgId } = await studio();
    await owner.action(api.billingActions.createCheckout, {});
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
    await owner.action(api.billingActions.createCheckout, {});
    await owner.action(api.billingActions.refresh);
    const previous = (await account(orgId))!;
    vi.setSystemTime(NOW + 6_000);
    await owner.action(api.billingActions.refresh);
    expect((await account(orgId))?.syncVersion).toBe(previous.syncVersion + 1);
  });

  test("unchanged reconciliations do not duplicate subscription audit entries", async () => {
    const { owner, orgId } = await studio();
    await owner.action(api.billingActions.createCheckout, {});
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
    await owner.action(api.billingActions.createCheckout, {});
    await owner.action(api.billingActions.refresh);
    expect((await owner.query(api.billing.getStatus)).plan).toBe("free");
    subscriptions([subscription(orgId)]);
    await sync(orgId);
    expect(await owner.query(api.billing.getStatus)).toMatchObject({
      plan: "paid",
      managed: true,
      portalAvailable: true,
      subscription: { amount: 149000, currentPeriodEnd: END },
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
    await owner.action(api.billingActions.createCheckout, {});
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
    await owner.action(api.billingActions.createCheckout, {});
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
    await owner.action(api.billingActions.createCheckout, {});
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
    await owner.action(api.billingActions.createCheckout, {});
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
    await owner.action(api.billingActions.createCheckout, {});
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
    await owner.action(api.billingActions.createCheckout, {});
    subscriptions([subscription(orgId)]);
    await sync(orgId);
    vi.setSystemTime(END + 10);
    await t.mutation(internal.billing.expireAccess, { orgId, periodEnd: END });
    expect((await owner.query(api.billing.getStatus)).plan).toBe("free");
  });

  test("provider outages preserve the last confirmed state, queue retries, and expose exhausted retries", async () => {
    const { owner, orgId } = await studio();
    await owner.action(api.billingActions.createCheckout, {});
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
    await one.owner.action(api.billingActions.createCheckout, {});
    subscriptions([subscription(two.orgId)]);
    await sync(one.orgId);
    expect((await one.owner.query(api.billing.getStatus)).plan).toBe("free");
    expect((await two.owner.query(api.billing.getStatus)).plan).toBe("free");
    vi.stubEnv("POLAR_SERVER", "production");
    await expect(
      one.owner.action(api.billingActions.createCheckout, {}),
    ).rejects.toThrow("BILLING_UNAVAILABLE");
  });
});

describe("signed Polar webhooks", () => {
  test("rejects invalid signatures and stale deliveries without mutating access", async () => {
    const { owner, orgId } = await studio();
    await owner.action(api.billingActions.createCheckout, {});
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
      await owner.action(api.billingActions.createCheckout, {});
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
    await owner.action(api.billingActions.createCheckout, {});
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
    await owner.action(api.billingActions.createCheckout, {});
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
