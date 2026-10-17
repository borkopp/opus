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

  test.each([15, 30])(
    "filters slots and dates for all selected services using a %i-minute start interval",
    async (slotDurationMins) => {
      const owner = t.withIdentity(ownerIdentity);
      await owner.mutation(api.users.ensureUser);
      const { orgId } = await owner.mutation(
        api.activation.startBeautyBusiness,
        {
          name: "Duration Studio",
          category: "beauty_salon",
        },
      );
      const cutId = await owner.mutation(api.activation.saveFirstService, {
        name: "Cut",
        durationMins: 30,
        priceMinorUnits: 1_200,
      });
      await owner.mutation(api.activation.saveHours, {
        openingHours: openingHours.map((hours) => ({
          ...hours,
          open: "16:00",
          close: "18:00",
        })),
      });
      const date = nextMonthDate(10);
      const shortDate = nextMonthDate(11);
      const fixture = await t.run(async (ctx) => {
        const cut = await ctx.db.get(cutId);
        if (!cut) throw new Error("Fixture service is missing.");
        const staffId = cut.staffIds[0];
        const settings = await ctx.db
          .query("org_settings")
          .withIndex("by_org", (q) => q.eq("orgId", orgId))
          .first();
        if (!settings) throw new Error("Fixture settings are missing.");
        await ctx.db.patch(settings._id, {
          slotDurationMins,
          bufferTimeMins: 0,
        });
        const colorId = await ctx.db.insert("services", {
          orgId,
          name: "Color",
          durationMins: 60,
          priceMinorUnits: 2_400,
          currency: "MKD",
          staffIds: [staffId],
          isOpusVisible: true,
          popularityScore: 0,
          isActive: true,
          isDeleted: false,
          sortOrder: 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        await ctx.db.insert("availability_overrides", {
          orgId,
          staffId,
          date: shortDate,
          type: "custom_hours",
          startTime: "17:00",
          endTime: "18:00",
          isDeleted: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        return { staffId, colorId };
      });
      const serviceIds = [cutId, fixture.colorId];
      const quickSlots = await owner.query(api.slots.getQuickBookingSlots, {
        orgId,
        date,
        serviceIds,
      });
      expect(
        quickSlots.slots.map((slot) =>
          new Date(slot.startAt).toISOString().slice(11, 16),
        ),
      ).toEqual(
        slotDurationMins === 15
          ? ["16:00", "16:15", "16:30"]
          : ["16:00", "16:30"],
      );
      expect(quickSlots.slots.every((slot) => slot.durationMins === 90)).toBe(
        true,
      );
      const genericSlots = await owner.query(api.slots.getQuickBookingSlots, {
        orgId,
        date,
      });
      expect(genericSlots.slots.at(-1)?.durationMins).toBe(slotDurationMins);
      const duplicates = await owner.query(api.slots.getQuickBookingSlots, {
        orgId,
        date,
        serviceIds: [...serviceIds, cutId],
      });
      expect(duplicates).toEqual(quickSlots);

      const dates = await owner.query(api.slots.getQuickBookingAvailableDates, {
        orgId,
        month: date.slice(0, 7),
        serviceIds,
      });
      expect(dates.availableDates).toContain(date);
      expect(dates.availableDates).not.toContain(shortDate);
      const genericDates = await owner.query(
        api.slots.getQuickBookingAvailableDates,
        { orgId, month: date.slice(0, 7) },
      );
      expect(genericDates.availableDates).toContain(shortDate);
      expect(
        (
          await owner.query(api.slots.getQuickBookingSlots, {
            orgId,
            date: shortDate,
            serviceIds,
          })
        ).slots,
      ).toEqual([]);

      const lastSlot = quickSlots.slots.at(-1)!;
      const bookingId = await owner.mutation(api.bookings.createManualBooking, {
        orgId,
        staffId: fixture.staffId,
        serviceIds,
        customerName: "Duration Test",
        startAt: lastSlot.startAt,
      });
      const booking = await t.run((ctx) => ctx.db.get(bookingId));
      expect(booking?.endAt).toBe(new Date(`${date}T18:00:00Z`).getTime());
      expect(
        (
          await owner.query(api.slots.getQuickBookingSlots, {
            orgId,
            date,
            serviceIds,
          })
        ).slots,
      ).toEqual([]);
      await expect(
        owner.mutation(api.bookings.createManualBooking, {
          orgId,
          staffId: fixture.staffId,
          serviceIds,
          customerName: "Overlap Test",
          startAt: lastSlot.startAt,
        }),
      ).rejects.toThrow("no longer fit");

      await t.run((ctx) => ctx.db.patch(fixture.colorId, { staffIds: [] }));
      expect(
        (
          await owner.query(api.slots.getQuickBookingSlots, {
            orgId,
            date: nextMonthDate(12),
            serviceIds,
          })
        ).slots,
      ).toEqual([]);
      await t.run((ctx) => ctx.db.patch(fixture.colorId, { isActive: false }));
      await expect(
        owner.query(api.slots.getQuickBookingSlots, {
          orgId,
          date,
          serviceIds,
        }),
      ).rejects.toThrow("unavailable");
    },
  );

  test("creates a multi-service booking for a name-only customer and rejects overlap", async () => {
    const owner = t.withIdentity(ownerIdentity);
    await owner.mutation(api.users.ensureUser);
    const { orgId } = await owner.mutation(api.activation.startBeautyBusiness, {
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
