import { beforeEach, describe, expect, test } from "vitest";
import { convexTest } from "convex-test";
import { api } from "../../convex/_generated/api";
import schema from "../../convex/schema";
import { convexModules } from "../../convex-test.setup";

const createBackend = () => convexTest(schema, convexModules);

const ownerIdentity = {
  subject: "quick-booking-owner",
  email: "quick-booking-owner@example.com",
  name: "Quick Booking Owner",
};

const openingHours = Array.from({ length: 7 }, (_, dayOfWeek) => ({
  dayOfWeek,
  open: "09:00",
  close: "17:00",
  isClosed: false,
}));

function nextWeekDate() {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 7);
  return date.toISOString().slice(0, 10);
}

function nextMonthDate(dayOfMonth: number) {
  const date = new Date();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + 1);
  date.setUTCDate(dayOfMonth);
  return date.toISOString().slice(0, 10);
}

describe("manual quick booking", () => {
  let t: ReturnType<typeof createBackend>;

  beforeEach(() => {
    t = createBackend();
  });

  test("creates a multi-service booking for a name-only customer and rejects overlap", async () => {
    const owner = t.withIdentity(ownerIdentity);
    await owner.mutation(api.users.ensureUser);
    const orgId = await owner.mutation(api.activation.startBeautyBusiness, {
      name: "Quick Booking Studio",
      category: "beauty_salon",
    });
    const firstServiceId = await owner.mutation(
      api.activation.saveFirstService,
      {
        name: "Cut",
        durationMins: 30,
        priceMinorUnits: 1_200,
      },
    );
    await owner.mutation(api.activation.saveHours, { openingHours });

    const firstService = await t.run(
      async (ctx) => await ctx.db.get(firstServiceId),
    );
    const staffId = firstService?.staffIds[0];
    if (!staffId) throw new Error("Fixture staff member is missing.");

    const secondServiceId = await t.run(async (ctx) => {
      const now = Date.now();
      return await ctx.db.insert("services", {
        orgId,
        name: "Styling",
        durationMins: 15,
        priceMinorUnits: 600,
        currency: "MKD",
        staffIds: [staffId],
        isOpusVisible: true,
        popularityScore: 0,
        isActive: true,
        isDeleted: false,
        sortOrder: 1,
        createdAt: now,
        updatedAt: now,
      });
    });

    const availableDate = nextMonthDate(10);
    const dayOffDate = nextMonthDate(11);
    await t.run(async (ctx) => {
      const now = Date.now();
      await ctx.db.insert("availability_overrides", {
        orgId,
        staffId,
        date: dayOffDate,
        type: "day_off",
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      });
    });
    const dateAvailability = await owner.query(
      api.slots.getQuickBookingAvailableDates,
      {
        orgId,
        month: availableDate.slice(0, 7),
      },
    );
    expect(dateAvailability.availableDates).toContain(availableDate);
    expect(dateAvailability.availableDates).not.toContain(dayOffDate);

    const date = nextWeekDate();
    const quickSlots = await owner.query(api.slots.getQuickBookingSlots, {
      orgId,
      date,
    });
    const slot = quickSlots.slots.find(
      (candidate) => candidate.staffId === staffId,
    );
    expect(slot).toMatchObject({ durationMins: 30, isFallback: false });
    if (!slot) throw new Error("Fixture quick-booking slot is missing.");

    const bookingId = await owner.mutation(api.bookings.createManualBooking, {
      orgId,
      staffId,
      serviceIds: [firstServiceId, secondServiceId],
      customerName: "Ana Petrova",
      startAt: slot.startAt,
    });

    const booking = await t.run(async (ctx) => await ctx.db.get(bookingId));
    expect(booking).toMatchObject({
      orgId,
      staffId,
      serviceId: firstServiceId,
      serviceIds: [firstServiceId, secondServiceId],
      source: "manual",
      status: "confirmed",
      priceMinorUnits: 1_800,
    });
    expect((booking?.endAt ?? 0) - (booking?.startAt ?? 0)).toBe(45 * 60_000);

    const customer = booking
      ? await t.run(async (ctx) => await ctx.db.get(booking.customerId))
      : null;
    expect(customer).toMatchObject({
      name: "Ana Petrova",
      totalVisits: 1,
    });
    expect(customer?.email).toBeUndefined();
    expect(customer?.phone).toBeUndefined();

    const listed = await owner.query(api.bookings.listBookingsByOrg, { orgId });
    const listedBooking = listed.find(
      (candidate) => candidate._id === bookingId,
    );
    expect(listedBooking?.services.map((service) => service.name)).toEqual([
      "Cut",
      "Styling",
    ]);

    await expect(
      owner.mutation(api.bookings.createManualBooking, {
        orgId,
        staffId,
        serviceIds: [firstServiceId],
        customerName: "Elena Trajkovska",
        startAt: slot.startAt,
      }),
    ).rejects.toThrow("no longer fit");
  });
});
