import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { convexModules } from "../../convex-test.setup";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 8, 24, 12);
const search = {
  search: "",
  segment: "all" as const,
  sort: "recent" as const,
  page: 0,
};
const backend = () => convexTest(schema, convexModules);
type Backend = ReturnType<typeof backend>;

async function studio(t: Backend, subject = "client-owner") {
  const owner = t.withIdentity({ subject, email: `${subject}@example.com` });
  await owner.mutation(api.users.ensureUser);
  const { orgId } = await owner.mutation(api.activation.startBeautyBusiness, {
    name: subject,
    category: "beauty_salon",
  });
  const serviceId = await owner.mutation(api.activation.saveFirstService, {
    name: "Gel manicure",
    durationMins: 60,
    priceMinorUnits: 150000,
  });
  const staffId = await t.run(async (ctx) => {
    await ctx.db.patch(orgId, { plan: "paid" });
    return (await ctx.db
      .query("staff_members")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .first())!._id;
  });
  const addClient = (name: string, extra: Partial<Doc<"customers">> = {}) =>
    t.run((ctx) =>
      ctx.db.insert("customers", {
        orgId,
        name,
        totalVisits: 999,
        totalSpendMinorUnits: 999999999,
        lastVisitAt: NOW,
        noShowCount: 999,
        noShowRiskScore: 0,
        whatsappOptIn: false,
        marketingOptIn: false,
        isDeleted: false,
        createdAt: NOW - DAY * 90,
        updatedAt: NOW,
        ...extra,
      }),
    );
  const visit = (
    customerId: Id<"customers">,
    extra: Partial<Doc<"bookings">> = {},
  ) =>
    t.run((ctx) =>
      ctx.db.insert("bookings", {
        orgId,
        customerId,
        staffId,
        serviceId,
        startAt: NOW - DAY,
        endAt: NOW - DAY + 3_600_000,
        priceMinorUnits: 150000,
        currency: "MKD",
        status: "completed",
        source: "manual",
        surgePriceApplied: false,
        isDeleted: false,
        createdAt: NOW - DAY,
        updatedAt: NOW,
        ...extra,
      }),
    );
  return { owner, orgId, staffId, serviceId, addClient, visit };
}

describe("Pro client directory", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  test("counts actual completed visits, ignores legacy counters, and keeps currencies separate", async () => {
    const t = backend();
    const s = await studio(t);
    const customer = await s.addClient("Ana Petrova");
    await s.visit(customer, { startAt: NOW - DAY * 2 });
    await s.visit(customer, { currency: "EUR", priceMinorUnits: 2500 });
    await s.visit(customer, { status: "cancelled" });
    await s.visit(customer, { status: "no_show" });
    await s.visit(customer, { status: "checked_in" });
    await s.visit(customer, { isDeleted: true });
    await s.visit(customer, { startAt: NOW + DAY });
    await s.visit(customer, { startAt: NOW + DAY, status: "confirmed" });
    const erased = await s.addClient("Erased", { isDeleted: true });
    await s.visit(erased);
    const result = await s.owner.query(api.clients.getDirectory, search);
    expect(result.summary).toEqual({
      clients: 1,
      completedVisits: 2,
      returningClients: 1,
    });
    expect(result.clients[0]).toMatchObject({
      visits: 2,
      firstVisitAt: NOW - DAY * 2,
      lastVisitAt: NOW - DAY,
      completedValue: [
        { currency: "EUR", amountMinorUnits: 2500 },
        { currency: "MKD", amountMinorUnits: 150000 },
      ],
    });
    const profile = await s.owner.query(api.clients.getProfile, {
      customerId: customer,
    });
    expect(profile?.client).toEqual(result.clients[0]);
    expect(profile?.upcoming).toHaveLength(1);
    expect(profile).toMatchObject({
      cancelled: 1,
      noShows: 1,
      favouriteService: "Gel manicure",
    });
    expect(profile?.history).toHaveLength(6);
    expect(
      await s.owner.query(api.clients.getProfile, { customerId: erased }),
    ).toBeNull();
  });

  test("allows ordinary staff, derives their studio, and denies revoked membership", async () => {
    const t = backend();
    const s = await studio(t);
    const client = await s.addClient("Ana");
    await s.visit(client);
    const staff = t.withIdentity({
      subject: "client-staff",
      email: "staff@example.com",
    });
    const userId = await staff.mutation(api.users.ensureUser);
    const staffId = await t.run(async (ctx) => {
      await ctx.db.patch(userId, { activeOrgId: s.orgId });
      return ctx.db.insert("staff_members", {
        orgId: s.orgId,
        userId,
        displayName: "Mia",
        specialties: [],
        role: "staff",
        isActive: true,
        isDeleted: false,
        createdAt: NOW,
        updatedAt: NOW,
      });
    });
    expect(
      (await staff.query(api.clients.getDirectory, search)).clients[0].id,
    ).toBe(client);
    expect(
      (await staff.query(api.clients.getProfile, { customerId: client }))
        ?.client.visits,
    ).toBe(1);
    await t.run((ctx) => ctx.db.patch(staffId, { isActive: false }));
    await expect(staff.query(api.clients.getDirectory, search)).rejects.toThrow(
      "Unauthorised",
    );
    await expect(
      staff.query(api.clients.getProfile, { customerId: client }),
    ).rejects.toThrow("Unauthorised");
  });

  test("enforces authentication, plan downgrade, and tenant isolation on both queries", async () => {
    const t = backend();
    const a = await studio(t, "studio-a");
    const b = await studio(t, "studio-b");
    const ca = await a.addClient("Alice");
    const cb = await b.addClient("Bob");
    await a.visit(ca);
    await b.visit(cb);
    await expect(t.query(api.clients.getDirectory, search)).rejects.toThrow(
      "Unauthenticated",
    );
    await expect(
      t.query(api.clients.getProfile, { customerId: ca }),
    ).rejects.toThrow("Unauthenticated");
    expect(
      (await a.owner.query(api.clients.getDirectory, search)).clients.map(
        (client) => client.id,
      ),
    ).toEqual([ca]);
    expect(
      await a.owner.query(api.clients.getProfile, { customerId: cb }),
    ).toBeNull();
    await t.run((ctx) => ctx.db.patch(a.orgId, { plan: "free" }));
    await expect(
      a.owner.query(api.clients.getDirectory, search),
    ).rejects.toThrow("Client directory requires the paid plan");
    await expect(
      a.owner.query(api.clients.getProfile, { customerId: ca }),
    ).rejects.toThrow("Client directory requires the paid plan");
    // Basic booking contact lookup remains available on Free.
    expect(
      await a.owner.query(api.customers.getCustomer, {
        orgId: a.orgId,
        customerId: ca,
      }),
    ).toMatchObject({ name: "Alice" });
  });

  test("searches name, email and local-format phones with segments and stable pagination", async () => {
    const t = backend();
    const s = await studio(t);
    const ana = await s.addClient("Ана Петрова", {
      email: "ana@example.com",
      phone: "+38970123456",
    });
    await s.visit(ana);
    await s.visit(ana, { startAt: NOW - 2 * DAY });
    for (let i = 0; i < 23; i++)
      await s.addClient(`Client ${String(i).padStart(2, "0")}`);
    for (const term of [
      "петр ана",
      "ANA@EXAMPLE",
      "070 123 456",
      "+389 (70) 123-456",
    ]) {
      const result = await s.owner.query(api.clients.getDirectory, {
        ...search,
        search: term,
      });
      expect(result.clients.map((client) => client.id)).toEqual([ana]);
    }
    expect(
      (
        await s.owner.query(api.clients.getDirectory, {
          ...search,
          segment: "returning",
        })
      ).total,
    ).toBe(1);
    expect(
      (
        await s.owner.query(api.clients.getDirectory, {
          ...search,
          segment: "unvisited",
        })
      ).total,
    ).toBe(23);
    const first = await s.owner.query(api.clients.getDirectory, {
      ...search,
      sort: "visits",
    });
    const last = await s.owner.query(api.clients.getDirectory, {
      ...search,
      sort: "visits",
      page: 999,
    });
    expect(first.clients).toHaveLength(20);
    expect(first.clients[0].id).toBe(ana);
    expect(last.page).toBe(1);
    expect(last.clients).toHaveLength(4);
    expect(
      new Set([...first.clients, ...last.clients].map((client) => client.id))
        .size,
    ).toBe(24);
    const empty = await s.owner.query(api.clients.getDirectory, {
      ...search,
      search: "missing-client",
    });
    expect(empty.total).toBe(0);
    expect(empty.summary.clients).toBe(24);
    await expect(
      s.owner.query(api.clients.getDirectory, { ...search, page: -1 }),
    ).rejects.toThrow("Invalid client search");
    await expect(
      s.owner.query(api.clients.getDirectory, {
        ...search,
        search: "a".repeat(151),
      }),
    ).rejects.toThrow("Invalid client search");
  });

  test("uses tenant-scoped service and staff labels, including combined and retired services", async () => {
    const t = backend();
    const a = await studio(t, "labels-a");
    const b = await studio(t, "labels-b");
    const customer = await a.addClient("Ana");
    const secondService = await t.run(async (ctx) => {
      const { _id, _creationTime, ...fields } = (await ctx.db.get(
        a.serviceId,
      ))!;
      void _id;
      void _creationTime;
      return ctx.db.insert("services", {
        ...fields,
        name: "Nail art",
        isDeleted: true,
      });
    });
    await a.visit(customer, {
      serviceIds: [a.serviceId, secondService, b.serviceId, a.serviceId],
      staffId: b.staffId,
    });
    const result = await a.owner.query(api.clients.getProfile, {
      customerId: customer,
    });
    expect(result?.history[0].services).toEqual(["Gel manicure", "Nail art"]);
    expect(result?.history[0].staffName).toBe("");
  });
});
