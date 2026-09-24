import { afterEach, describe, expect, test, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import { convexModules } from "../../convex-test.setup";
import { DAY_MS } from "../../convex/lib/overviewMetrics";

describe("Clarity overview access and booking data", () => {
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });
  test("requires authentication and derives the current studio", async () => {
    vi.useFakeTimers();
    const t = convexTest(schema, convexModules);
    await expect(
      t.query(api.dashboardOverview.getOverview, { days: 7, refreshMinute: 0 }),
    ).rejects.toThrow("Unauthenticated");
    const alice = t.withIdentity({
      subject: "clarity-alice",
      email: "alice@example.com",
    });
    await alice.mutation(api.users.ensureUser);
    await alice.mutation(api.activation.startBeautyBusiness, {
      name: "Alice Studio",
      category: "beauty_salon",
    });
    const bob = t.withIdentity({
      subject: "clarity-bob",
      email: "bob@example.com",
    });
    await bob.mutation(api.users.ensureUser);
    await bob.mutation(api.activation.startBeautyBusiness, {
      name: "Bob Studio",
      category: "beauty_salon",
    });
    const a = await alice.query(api.dashboardOverview.getOverview, {
      days: 7,
      refreshMinute: 0,
    });
    const b = await bob.query(api.dashboardOverview.getOverview, {
      days: 30,
      refreshMinute: 0,
    });
    expect(a.orgName).toBe("Alice Studio");
    expect(b.orgName).toBe("Bob Studio");
    expect(a.staff.map((s) => s.id)).not.toEqual(b.staff.map((s) => s.id));
    expect(a.revenue.totalMinor).toBe(0);
    await expect(
      alice.query(api.dashboardOverview.getOverview, {
        days: 7,
        date: "2026-02-31",
        refreshMinute: 0,
      }),
    ).rejects.toThrow("Invalid appointment date");
  });
  test("populates combined services and can open a date outside the analytics window", async () => {
    vi.useFakeTimers();
    const t = convexTest(schema, convexModules);
    const owner = t.withIdentity({
      subject: "clarity-owner",
      email: "owner@example.com",
    });
    await owner.mutation(api.users.ensureUser);
    const { orgId } = await owner.mutation(api.activation.startBeautyBusiness, {
      name: "Clarity Studio",
      category: "beauty_salon",
    });
    const serviceId = await owner.mutation(api.activation.saveFirstService, {
      name: "Cut",
      durationMins: 30,
      priceMinorUnits: 120000,
    });
    await owner.mutation(api.activation.saveHours, {
      openingHours: Array.from({ length: 7 }, (_, dayOfWeek) => ({
        dayOfWeek,
        open: "09:00",
        close: "19:00",
        isClosed: false,
      })),
    });
    const base = await owner.query(api.dashboardOverview.getOverview, {
      days: 7,
      refreshMinute: 0,
    });
    const at = base.today + 14 * DAY_MS + 12 * 60 * 60 * 1000;
    const secondId = await t.run(async (ctx) => {
      const service = await ctx.db.get(serviceId);
      if (!service) throw new Error("Fixture missing");
      const { _id, _creationTime, ...fields } = service;
      void _id;
      void _creationTime;
      return ctx.db.insert("services", { ...fields, name: "Styling" });
    });
    const bookingId = await owner.mutation(api.bookings.createManualBooking, {
      orgId,
      staffId: base.staff[0].id,
      serviceIds: [serviceId, secondId],
      customerName: "Ana",
      startAt: at,
    });
    const result = await owner.query(api.dashboardOverview.getOverview, {
      days: 7,
      date: new Date(at).toISOString().slice(0, 10),
      refreshMinute: 0,
    });
    expect(result.schedule).toHaveLength(1);
    expect(result.schedule[0]).toMatchObject({
      id: bookingId,
      customerName: "Ana",
      serviceName: "Cut + Styling",
      priceMinorUnits: 240000,
    });
    expect(result.todayCount).toBe(0);
    expect(result.next).toBeNull();
    expect(result.revenue.totalMinor).toBe(0);
  });
});
