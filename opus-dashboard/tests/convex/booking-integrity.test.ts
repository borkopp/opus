import { afterEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import schema from "../../convex/schema";
import { convexModules } from "../../convex-test.setup";

const createBackend = () => convexTest(schema, convexModules);
type Backend = ReturnType<typeof createBackend>;

async function setup(t: Backend, identity = "booking-integrity-owner") {
  const owner = t.withIdentity({
    subject: identity,
    email: `${identity}@example.com`,
  });
  await owner.mutation(api.users.ensureUser);
  const { orgId } = await owner.mutation(api.activation.startBeautyBusiness, {
    name: "Booking Integrity Studio",
    category: "hair_salon",
  });
  const serviceId = await owner.mutation(api.activation.saveFirstService, {
    name: "Haircut",
    durationMins: 30,
    priceMinorUnits: 1_200,
  });
  await owner.mutation(api.activation.saveHours, {
    openingHours: Array.from({ length: 7 }, (_, dayOfWeek) => ({
      dayOfWeek,
      open: "09:00",
      close: "17:00",
      isClosed: false,
    })),
  });
  const fixture = await t.run(async (ctx) => {
    const service = await ctx.db.get(serviceId);
    const settings = await ctx.db
      .query("org_settings")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .first();
    if (!service || !settings) throw new Error("Missing booking fixture.");
    const customerId = await ctx.db.insert("customers", {
      orgId,
      name: "Test Client",
      email: "test-client@example.com",
      phone: "+38970123456",
      totalVisits: 0,
      totalSpendMinorUnits: 0,
      noShowCount: 0,
      noShowRiskScore: 0,
      whatsappOptIn: false,
      marketingOptIn: false,
      isDeleted: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return {
      staffId: service.staffIds[0],
      settingsId: settings._id,
      customerId,
    };
  });
  const nextWeek = new Date(Date.now() + 7 * 86_400_000);
  const date = nextWeek.toISOString().slice(0, 10);
  return { owner, orgId, serviceId, date, ...fixture };
}

afterEach(() => vi.useRealTimers());

describe("booking and schedule integrity", () => {
  it("never reveals another studio's hours or private time-off notes through a staff ID", async () => {
    const t = createBackend();
    const a = await setup(t);
    const b = await setup(t, "another-studio-owner");
    await b.owner.mutation(api.availabilityOverrides.createOverride, {
      orgId: b.orgId,
      staffId: b.staffId,
      date: b.date,
      type: "day_off",
      note: "Private staff information",
    });
    expect(
      await a.owner.query(api.availability.listAvailabilityRules, {
        orgId: a.orgId,
        staffId: b.staffId,
      }),
    ).toEqual([]);
    const weekly = await a.owner.query(api.availability.getWeeklySchedule, {
      orgId: a.orgId,
      staffId: b.staffId,
    });
    expect(weekly.every((day) => day.ruleId === null && !day.isActive)).toBe(
      true,
    );
    expect(
      await a.owner.query(api.availabilityOverrides.listOverrides, {
        orgId: a.orgId,
        staffId: b.staffId,
      }),
    ).toEqual([]);
    expect(
      await b.owner.query(api.availabilityOverrides.listOverrides, {
        orgId: b.orgId,
        staffId: b.staffId,
      }),
    ).toMatchObject([{ note: "Private staff information" }]);
  });

  it.each([
    { dayOfWeek: 1.5 },
    { startTime: "24:01" },
    { startTime: "17:00", endTime: "09:00" },
    { breaks: [{ startTime: "08:00", endTime: "10:00" }] },
    {
      breaks: [
        { startTime: "12:00", endTime: "13:00" },
        { startTime: "12:30", endTime: "13:30" },
      ],
    },
  ])("rejects malformed hours atomically: %j", async (patch) => {
    const t = createBackend();
    const s = await setup(t);
    await expect(
      s.owner.mutation(api.availability.setAvailabilityRule, {
        orgId: s.orgId,
        staffId: s.staffId,
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "17:00",
        isActive: true,
        ...patch,
      }),
    ).rejects.toThrow();
    const rules = await s.owner.query(api.availability.listAvailabilityRules, {
      orgId: s.orgId,
      staffId: s.staffId,
    });
    expect(rules).toHaveLength(7);
    expect(
      rules.every(
        (rule) => rule.startTime === "09:00" && rule.endTime === "17:00",
      ),
    ).toBe(true);
  });

  it("validates real override dates and complete custom hours, preserving 24:00 closing", async () => {
    const t = createBackend();
    const s = await setup(t);
    await expect(
      s.owner.mutation(api.availabilityOverrides.createOverride, {
        orgId: s.orgId,
        staffId: s.staffId,
        date: "2030-02-30",
        type: "day_off",
      }),
    ).rejects.toThrow("valid availability date");
    await expect(
      s.owner.mutation(api.availabilityOverrides.createOverride, {
        orgId: s.orgId,
        staffId: s.staffId,
        date: s.date,
        type: "custom_hours",
      }),
    ).rejects.toThrow("start and end");
    await expect(
      s.owner.mutation(api.availabilityOverrides.createOverride, {
        orgId: s.orgId,
        staffId: s.staffId,
        date: s.date,
        type: "custom_hours",
        startTime: "17:00",
        endTime: "09:00",
      }),
    ).rejects.toThrow("end after");
    await s.owner.mutation(api.availabilityOverrides.createOverride, {
      orgId: s.orgId,
      staffId: s.staffId,
      date: s.date,
      type: "custom_hours",
      startTime: "20:00",
      endTime: "24:00",
    });
    expect(
      await s.owner.query(api.availabilityOverrides.listOverrides, {
        orgId: s.orgId,
        staffId: s.staffId,
      }),
    ).toMatchObject([{ startTime: "20:00", endTime: "24:00" }]);
  });

  it("rejects seconds and invalid timestamps in manual creation and leaves a failed reschedule unchanged", async () => {
    const t = createBackend();
    const s = await setup(t);
    const startAt = Date.parse(`${s.date}T10:00:00Z`);
    const args = {
      orgId: s.orgId,
      staffId: s.staffId,
      serviceIds: [s.serviceId],
      customerName: "Test Client",
    };
    for (const invalidStart of [
      startAt + 30_000,
      startAt + 1,
      Number.NaN,
      8.64e15 + 1,
    ]) {
      await expect(
        s.owner.mutation(api.bookings.createManualBooking, {
          ...args,
          startAt: invalidStart,
        }),
      ).rejects.toThrow("valid booking time");
    }
    const bookingId = await s.owner.mutation(api.bookings.createManualBooking, {
      ...args,
      startAt,
    });
    await expect(
      s.owner.mutation(api.bookings.rescheduleBooking, {
        orgId: s.orgId,
        bookingId,
        newStartAt: startAt + 3_600_000 + 30_000,
      }),
    ).rejects.toThrow("whole minute");
    expect(await t.run((ctx) => ctx.db.get(bookingId))).toMatchObject({
      status: "confirmed",
      startAt,
    });
  });

  it("applies working hours, breaks, days off and buffers to the legacy booking mutation", async () => {
    const t = createBackend();
    const s = await setup(t);
    const dayOfWeek = new Date(`${s.date}T00:00:00Z`).getUTCDay();
    await s.owner.mutation(api.availability.setAvailabilityRule, {
      orgId: s.orgId,
      staffId: s.staffId,
      dayOfWeek,
      startTime: "09:00",
      endTime: "17:00",
      isActive: true,
      breaks: [{ startTime: "12:00", endTime: "13:00" }],
    });
    await t.run((ctx) => ctx.db.patch(s.settingsId, { bufferTimeMins: 15 }));
    const args = {
      orgId: s.orgId,
      staffId: s.staffId,
      serviceId: s.serviceId,
      customerId: s.customerId,
      source: "manual" as const,
    };
    for (const time of ["08:00", "12:00", "16:30"]) {
      await expect(
        s.owner.mutation(api.bookings.createBooking, {
          ...args,
          startAt: Date.parse(`${s.date}T${time}:00Z`),
        }),
      ).rejects.toThrow("no longer fit");
    }
    await s.owner.mutation(api.bookings.createBooking, {
      ...args,
      startAt: Date.parse(`${s.date}T10:00:00Z`),
    });
    // The new appointment's buffer must also fit before the existing appointment.
    await expect(
      s.owner.mutation(api.bookings.createBooking, {
        ...args,
        startAt: Date.parse(`${s.date}T09:30:00Z`),
      }),
    ).rejects.toThrow("no longer fit");
    await s.owner.mutation(api.availabilityOverrides.createOverride, {
      orgId: s.orgId,
      staffId: s.staffId,
      date: s.date,
      type: "day_off",
    });
    await expect(
      s.owner.mutation(api.bookings.createBooking, {
        ...args,
        startAt: Date.parse(`${s.date}T14:00:00Z`),
      }),
    ).rejects.toThrow("no longer fit");
  });

  it("saves advertised mobile slots when opening hours are offset from the manual calendar grid", async () => {
    const t = createBackend();
    const s = await setup(t);
    await t.run((ctx) =>
      ctx.db.patch(s.settingsId, {
        slotDurationMins: 30,
        quickBookingDurationMins: 30,
      }),
    );
    await s.owner.mutation(api.availability.setAvailabilityRule, {
      orgId: s.orgId,
      staffId: s.staffId,
      dayOfWeek: new Date(`${s.date}T00:00:00Z`).getUTCDay(),
      startTime: "09:15",
      endTime: "17:00",
      isActive: true,
    });
    const slots = await s.owner.query(api.mobile.slots, {
      staffId: s.staffId,
      serviceId: s.serviceId,
      date: s.date,
      refreshMinute: 0,
    });
    expect(slots[0].startAt).toBe(Date.parse(`${s.date}T09:15:00Z`));
    const bookingId = (await s.owner.mutation(api.mobile.createAppointment, {
      staffId: s.staffId,
      serviceId: s.serviceId,
      startAt: slots[0].startAt,
      customerName: "Mobile client",
    })) as Id<"bookings">;
    expect(await t.run((ctx) => ctx.db.get(bookingId))).toMatchObject({
      startAt: slots[0].startAt,
    });

    // Retain the existing calendar's whole-hour and half-hour booking choices.
    await s.owner.mutation(api.bookings.createManualBooking, {
      orgId: s.orgId,
      staffId: s.staffId,
      serviceIds: [s.serviceId],
      startAt: Date.parse(`${s.date}T10:00:00Z`),
      customerName: "Calendar client",
    });
    const movedId = await s.owner.mutation(api.bookings.rescheduleBooking, {
      orgId: s.orgId,
      bookingId,
      newStartAt: Date.parse(`${s.date}T11:15:00Z`),
    });
    expect(await t.run((ctx) => ctx.db.get(movedId))).toMatchObject({
      startAt: Date.parse(`${s.date}T11:15:00Z`),
    });
  });

  it("uses studio wall-clock now and respects disabled legacy surge rules", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2030-01-14T10:00:00Z"));
    const t = createBackend();
    const s = await setup(t);
    const args = {
      orgId: s.orgId,
      staffId: s.staffId,
      serviceId: s.serviceId,
      customerId: s.customerId,
      source: "manual" as const,
    };
    await expect(
      s.owner.mutation(api.bookings.createBooking, {
        ...args,
        startAt: Date.parse("2030-01-14T10:30:00Z"),
      }),
    ).rejects.toThrow("future");
    const startAt = Date.parse(`${s.date}T10:00:00Z`);
    await t.run((ctx) =>
      ctx.db.patch(s.settingsId, {
        surgePricingEnabled: false,
        surgeRules: [
          {
            dayOfWeek: new Date(startAt).getUTCDay(),
            startTime: "09:00",
            endTime: "17:00",
            multiplierPct: 50,
          },
        ],
      }),
    );
    const bookingId = await s.owner.mutation(api.bookings.createBooking, {
      ...args,
      startAt,
    });
    expect(await t.run((ctx) => ctx.db.get(bookingId))).toMatchObject({
      priceMinorUnits: 1_200,
      surgePriceApplied: false,
    });
  });

  it("completes legacy WhatsApp-preferred clients without queuing retired-channel follow-ups", async () => {
    const t = createBackend();
    const s = await setup(t);
    await t.run((ctx) =>
      ctx.db.patch(s.customerId, { preferredChannel: "whatsapp" }),
    );
    const bookingId = await s.owner.mutation(api.bookings.createBooking, {
      orgId: s.orgId,
      staffId: s.staffId,
      serviceId: s.serviceId,
      customerId: s.customerId,
      source: "manual",
      startAt: Date.parse(`${s.date}T10:00:00Z`),
    });
    await expect(
      s.owner.mutation(api.bookings.completeBooking, {
        orgId: s.orgId,
        bookingId,
      }),
    ).resolves.toBe(true);
    const notifications = await t.run((ctx) =>
      ctx.db
        .query("notifications")
        .withIndex("by_org", (q) => q.eq("orgId", s.orgId))
        .collect(),
    );
    expect(
      notifications.some(
        (item) => item.channel === "whatsapp" || item.type === "review_request",
      ),
    ).toBe(false);
    expect(await t.run((ctx) => ctx.db.get(bookingId))).toMatchObject({
      status: "completed",
    });
  });

  it("derives bounded no-show risk from this studio's resolved appointments for guest clients", async () => {
    const t = createBackend();
    const s = await setup(t);
    const other = await setup(t, "unrelated-attendance-owner");
    const bookingIds = await t.run(async (ctx) => {
      const startAt = Date.parse(`${s.date}T10:00:00Z`);
      const base = {
        orgId: s.orgId,
        staffId: s.staffId,
        serviceId: s.serviceId,
        customerId: s.customerId,
        startAt,
        endAt: startAt + 30 * 60_000,
        priceMinorUnits: 1_200,
        currency: "MKD",
        surgePriceApplied: false,
        source: "web" as const,
        isDeleted: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const first = await ctx.db.insert("bookings", {
        ...base,
        status: "confirmed",
      });
      const second = await ctx.db.insert("bookings", {
        ...base,
        status: "confirmed",
      });
      const third = await ctx.db.insert("bookings", {
        ...base,
        status: "confirmed",
      });
      await ctx.db.insert("bookings", { ...base, status: "completed" });
      await ctx.db.insert("bookings", { ...base, status: "completed" });
      await ctx.db.insert("bookings", { ...base, status: "cancelled" });
      await ctx.db.insert("bookings", {
        ...base,
        status: "no_show",
        isDeleted: true,
      });
      // Even an incorrectly linked historical foreign record cannot affect the score.
      await ctx.db.insert("bookings", {
        ...base,
        orgId: other.orgId,
        staffId: other.staffId,
        serviceId: other.serviceId,
        status: "no_show",
      });
      return { first, second, third };
    });
    await s.owner.mutation(api.bookings.markNoShow, {
      orgId: s.orgId,
      bookingId: bookingIds.first,
    });
    expect(await t.run((ctx) => ctx.db.get(s.customerId))).toMatchObject({
      totalVisits: 0,
      noShowCount: 1,
      noShowRiskScore: 1 / 3,
    });
    await s.owner.mutation(api.bookings.markNoShow, {
      orgId: s.orgId,
      bookingId: bookingIds.second,
    });
    expect(await t.run((ctx) => ctx.db.get(s.customerId))).toMatchObject({
      totalVisits: 0,
      noShowCount: 2,
      noShowRiskScore: 0.5,
    });
    await s.owner.mutation(api.bookings.completeBooking, {
      orgId: s.orgId,
      bookingId: bookingIds.third,
    });
    expect(await t.run((ctx) => ctx.db.get(s.customerId))).toMatchObject({
      totalVisits: 0,
      noShowCount: 2,
      noShowRiskScore: 0.4,
    });
  });
});
