import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { convexTest } from "convex-test";
import { makeFunctionReference } from "convex/server";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import type { StudioAnalytics } from "../../lib/studio-analytics";
import { convexModules } from "../../convex-test.setup";

const NOW = Date.UTC(2026, 9, 20, 12);
const MONTH = { startMonth: "2026-09", endMonth: "2026-09" };
const getDashboard = makeFunctionReference<
  "query",
  {
    startMonth: string;
    endMonth: string;
    staffId?: Id<"staff_members">;
    currency?: string;
  },
  StudioAnalytics
>("studioAnalytics:getDashboard");
const getReport = makeFunctionReference<
  "action",
  {
    startMonth: string;
    endMonth: string;
    staffId?: Id<"staff_members">;
    currency?: string;
  },
  StudioAnalytics
>("studioAnalytics:getReport");
const backend = () => convexTest(schema, convexModules);
type Backend = ReturnType<typeof backend>;

async function studio(t: Backend, subject = "analytics-owner") {
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
        noShowCount: 999,
        noShowRiskScore: 0,
        whatsappOptIn: false,
        marketingOptIn: false,
        isDeleted: false,
        createdAt: Date.UTC(2026, 0, 1),
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
        startAt: Date.UTC(2026, 8, 15, 10),
        endAt: Date.UTC(2026, 8, 15, 11),
        priceMinorUnits: 150000,
        currency: "MKD",
        status: "completed",
        source: "manual",
        surgePriceApplied: false,
        isDeleted: false,
        createdAt: NOW,
        updatedAt: NOW,
        ...extra,
      }),
    );
  return { owner, orgId, staffId, serviceId, addClient, visit };
}

describe("Pro studio analytics", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  test("builds complete monthly metrics from visits, with selected-currency values and prior-period returning clients", async () => {
    const t = backend();
    const s = await studio(t);
    const returning = await s.addClient("Ana");
    const firstTime = await s.addClient("Mia");
    const erased = await s.addClient("Erased", { isDeleted: true });
    await s.visit(returning, {
      startAt: Date.UTC(2026, 6, 31, 23, 59),
    });
    await s.visit(returning, { startAt: Date.UTC(2026, 7, 1) });
    await s.visit(returning, { startAt: Date.UTC(2026, 8, 1) });
    await s.visit(returning, { currency: "EUR", priceMinorUnits: 2500 });
    await s.visit(firstTime);
    await s.visit(firstTime, {
      startAt: Date.UTC(2026, 8, 30, 23, 59, 59, 999),
    });
    for (const status of [
      "confirmed",
      "checked_in",
      "cancelled",
      "no_show",
    ] as const)
      await s.visit(firstTime, { status });
    await s.visit(firstTime, { isDeleted: true });
    await s.visit(erased);
    await s.visit(returning, { startAt: Date.UTC(2026, 9, 1) });
    const data = await s.owner.query(getDashboard, MONTH);
    expect(data.summary).toEqual({
      totalAppointments: 8,
      completedVisits: 4,
      visitedClients: 2,
      newClients: 1,
      returningClients: 1,
      returningClientPercent: 50,
      appointmentValueMinorUnits: 450000,
      valuedVisits: 3,
      averageAppointmentValueMinorUnits: 150000,
      cancelledAppointments: 1,
      noShowAppointments: 1,
    });
    expect(data.previous.period).toEqual({
      startMonth: "2026-08",
      endMonth: "2026-08",
      startMs: Date.UTC(2026, 7, 1),
      endMs: Date.UTC(2026, 8, 1),
    });
    expect(data.previous.summary).toMatchObject({
      completedVisits: 1,
      visitedClients: 1,
      returningClients: 1,
      appointmentValueMinorUnits: 150000,
    });
    expect(data.currencies).toEqual(["EUR", "MKD"]);
    expect(data.trendGranularity).toBe("day");
    expect(data.trend).toHaveLength(30);
    expect(data.trend[0]).toMatchObject({
      key: "2026-09-01",
      completedVisits: 1,
      appointmentValueMinorUnits: 150000,
    });
    expect(data.trend[29]).toMatchObject({
      key: "2026-09-30",
      completedVisits: 1,
    });
    expect(data.statuses).toEqual([
      { status: "confirmed", count: 1 },
      { status: "checked_in", count: 1 },
      { status: "completed", count: 4 },
      { status: "cancelled", count: 1 },
      { status: "no_show", count: 1 },
    ]);
    expect(data.clients).toHaveLength(2);
    expect(
      data.clients.find((client) => client.id === returning),
    ).toMatchObject({
      name: "Ana",
      returning: true,
      visits: 2,
      firstVisitAt: Date.UTC(2026, 6, 31, 23, 59),
      appointmentValueMinorUnits: 150000,
    });
    expect(
      data.clients.find((client) => client.id === firstTime),
    ).toMatchObject({
      name: "Mia",
      returning: false,
      visits: 2,
      appointmentValueMinorUnits: 300000,
    });
    const eur = await s.owner.query(getDashboard, {
      ...MONTH,
      currency: "EUR",
    });
    expect(eur.summary).toMatchObject({
      completedVisits: 4,
      visitedClients: 2,
      appointmentValueMinorUnits: 2500,
      valuedVisits: 1,
      averageAppointmentValueMinorUnits: 2500,
    });
    expect(eur.previous.summary.appointmentValueMinorUnits).toBe(0);
  });

  test("enforces current plan, authenticated membership, beauty scope, and foreign filter rejection", async () => {
    const t = backend();
    const a = await studio(t, "analytics-a");
    const b = await studio(t, "analytics-b");
    await a.visit(await a.addClient("Alice"));
    await b.visit(await b.addClient("Bob"));
    await expect(t.query(getDashboard, MONTH)).rejects.toThrow(
      "Unauthenticated",
    );
    expect(
      (await a.owner.query(getDashboard, MONTH)).clients.map((c) => c.name),
    ).toEqual(["Alice"]);
    await expect(
      a.owner.query(getDashboard, { ...MONTH, staffId: b.staffId }),
    ).rejects.toThrow("Choose a staff member from this studio");
    await t.run((ctx) => ctx.db.patch(a.orgId, { plan: "free" }));
    await expect(a.owner.query(getDashboard, MONTH)).rejects.toThrow(
      "requires the paid plan",
    );
    await t.run((ctx) =>
      ctx.db.patch(a.orgId, { plan: "paid", industry: "hospitality" }),
    );
    await expect(a.owner.query(getDashboard, MONTH)).rejects.toThrow(
      "Analytics are available for beauty studios",
    );
    await t.run((ctx) =>
      ctx.db.patch(a.orgId, { industry: "beauty_wellness" }),
    );
    await t.run((ctx) => ctx.db.patch(a.staffId, { isActive: false }));
    await expect(a.owner.query(getDashboard, MONTH)).rejects.toThrow(
      "Unauthorised",
    );
  });

  test("report actions refresh full data and reject a downgrade or revocation after a dashboard read", async () => {
    const t = backend();
    const s = await studio(t);
    const ana = await s.addClient("Ana");
    await s.visit(ana);
    const dashboard = await s.owner.query(getDashboard, MONTH);
    expect(dashboard.summary.completedVisits).toBe(1);
    const mia = await s.addClient("Mia");
    await s.visit(mia, { currency: "EUR", priceMinorUnits: 2500 });
    await s.visit(mia);
    const report = await s.owner.action(getReport, MONTH);
    expect(report).toEqual(await s.owner.query(getDashboard, MONTH));
    expect(report.summary.completedVisits).toBe(3);
    expect(report.clients.map((client) => client.name)).toEqual(["Mia", "Ana"]);
    expect(report.topServices).toEqual([
      { id: s.serviceId, name: "Gel manicure", completedVisits: 3 },
    ]);
    expect(report.currencies).toEqual(["EUR", "MKD"]);
    await t.run((ctx) => ctx.db.patch(s.orgId, { plan: "free" }));
    await expect(s.owner.action(getReport, MONTH)).rejects.toThrow(
      "requires the paid plan",
    );
    await t.run(async (ctx) => {
      await ctx.db.patch(s.orgId, { plan: "paid" });
      await ctx.db.patch(s.staffId, { isActive: false });
    });
    await expect(s.owner.action(getReport, MONTH)).rejects.toThrow(
      "Unauthorised",
    );
    await expect(t.action(getReport, MONTH)).rejects.toThrow("Unauthenticated");
  });

  test("allows ordinary studio staff but denies own-appointments-only access", async () => {
    const t = backend();
    const s = await studio(t);
    const staff = t.withIdentity({
      subject: "analyst-staff",
      email: "analyst-staff@example.com",
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
      (await staff.query(getDashboard, MONTH)).summary.completedVisits,
    ).toBe(0);
    await t.run((ctx) => ctx.db.patch(staffId, { bookingAccess: "own" }));
    await expect(staff.query(getDashboard, MONTH)).rejects.toThrow(
      "own appointments only",
    );
  });

  test("filters staff without resetting studio returning history or losing currency options", async () => {
    const t = backend();
    const s = await studio(t);
    const staffId = await t.run((ctx) =>
      ctx.db.insert("staff_members", {
        orgId: s.orgId,
        displayName: "Mia",
        specialties: [],
        role: "staff",
        isActive: true,
        isDeleted: false,
        createdAt: NOW,
        updatedAt: NOW,
      }),
    );
    const customer = await s.addClient("Ana");
    await s.visit(customer, { startAt: Date.UTC(2026, 7, 20) });
    await s.visit(customer, { currency: "EUR", priceMinorUnits: 2500 });
    await s.visit(customer, { staffId });
    const data = await s.owner.query(getDashboard, {
      ...MONTH,
      staffId,
      currency: "EUR",
    });
    expect(data.selectedStaffId).toBe(staffId);
    expect(data.summary).toMatchObject({
      completedVisits: 1,
      returningClients: 1,
      appointmentValueMinorUnits: 0,
      valuedVisits: 0,
    });
    expect(data.currencies).toEqual(["EUR", "MKD"]);
    expect(data.previous.summary.completedVisits).toBe(0);
  });

  test("validates month ranges and currencies, handles leap days, and supplies a full zero-filled empty period", async () => {
    const t = backend();
    const s = await studio(t);
    for (const invalid of [
      { startMonth: "2026-9", endMonth: "2026-09" },
      { startMonth: "2026-00", endMonth: "2026-09" },
      { startMonth: "2026-13", endMonth: "2026-13" },
      { startMonth: "1999-01", endMonth: "1999-01" },
      { startMonth: "2101-01", endMonth: "2101-01" },
      { startMonth: "2026-09", endMonth: "2026-08" },
      { startMonth: "2025-09", endMonth: "2026-09" },
    ])
      await expect(s.owner.query(getDashboard, invalid)).rejects.toThrow(
        "Choose",
      );
    await expect(
      s.owner.query(getDashboard, { ...MONTH, currency: "USD" }),
    ).rejects.toThrow("Choose an available currency");
    const empty = await s.owner.query(getDashboard, {
      startMonth: "2024-02",
      endMonth: "2024-02",
    });
    expect(empty.trend).toHaveLength(29);
    expect(empty.trend.every((point) => point.appointments === 0)).toBe(true);
    expect(empty.summary).toMatchObject({
      completedVisits: 0,
      visitedClients: 0,
      returningClientPercent: 0,
      averageAppointmentValueMinorUnits: 0,
    });
    expect(empty.clients).toEqual([]);
    expect(empty.topServices).toEqual([]);
    const annual = await s.owner.query(getDashboard, {
      startMonth: "2025-10",
      endMonth: "2026-09",
    });
    expect(annual.trendGranularity).toBe("month");
    expect(annual.trend).toHaveLength(12);
    expect(annual.previous.period).toMatchObject({
      startMonth: "2024-10",
      endMonth: "2025-09",
    });
  });

  test("uses the studio wall-clock month and excludes future completed visits", async () => {
    vi.setSystemTime(Date.UTC(2026, 8, 30, 22, 30));
    const t = backend();
    const s = await studio(t);
    const customer = await s.addClient("Ana");
    await s.visit(customer, { startAt: Date.UTC(2026, 9, 1, 0, 15) });
    await s.visit(customer, { startAt: Date.UTC(2026, 9, 1, 0, 45) });
    await s.visit(customer, {
      startAt: Date.UTC(2026, 9, 1, 0, 45),
      status: "confirmed",
    });
    const data = await s.owner.query(getDashboard, {
      startMonth: "2026-10",
      endMonth: "2026-10",
    });
    expect(data.timezone).toBe("Europe/Belgrade");
    expect(data.period.startMs).toBe(Date.UTC(2026, 9, 1));
    expect(data.summary.completedVisits).toBe(1);
    expect(data.summary.totalAppointments).toBe(2);
    expect(data.trend[0].completedVisits).toBe(1);
  });

  test("counts each bundled service once, retains historical labels, and never resolves another tenant's labels", async () => {
    const t = backend();
    const a = await studio(t, "services-a");
    const b = await studio(t, "services-b");
    const customer = await a.addClient("Ana");
    const retired = await t.run(async (ctx) => {
      const { _id, _creationTime, ...fields } = (await ctx.db.get(
        a.serviceId,
      ))!;
      void _id;
      void _creationTime;
      return ctx.db.insert("services", {
        ...fields,
        name: "Retired nail art",
        isDeleted: true,
      });
    });
    await a.visit(customer, {
      serviceIds: [a.serviceId, retired, b.serviceId, a.serviceId],
    });
    const data = await a.owner.query(getDashboard, MONTH);
    expect(data.topServices).toEqual([
      { id: a.serviceId, name: "Gel manicure", completedVisits: 1 },
      { id: retired, name: "Retired nail art", completedVisits: 1 },
    ]);
    expect(data.summary.appointmentValueMinorUnits).toBe(150000);
    expect(data.staff.some((member) => member.id === b.staffId)).toBe(false);
  });
});
