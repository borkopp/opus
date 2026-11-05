import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import schema from "../../convex/schema";
import { convexModules } from "../../convex-test.setup";

async function studio(open: string) {
  const backend = convexTest(schema, convexModules);
  const owner = backend.withIdentity({
    subject: "mobile-slot-owner",
    email: "mobile-slot-owner@example.com",
  });
  await owner.mutation(api.users.ensureUser);
  const { orgId } = await owner.mutation(api.activation.startBeautyBusiness, {
    name: "Mobile Slot Studio",
    category: "hair_salon",
  });
  const serviceId = await owner.mutation(api.activation.saveFirstService, {
    name: "Haircut",
    durationMins: 30,
    priceMinorUnits: 120000,
  });
  await owner.mutation(api.activation.saveHours, {
    openingHours: Array.from({ length: 7 }, (_, dayOfWeek) => ({
      dayOfWeek,
      open,
      close: "17:00",
      isClosed: false,
    })),
  });
  await owner.mutation(api.orgSettings.updateOrgSettings, {
    orgId,
    timezone: "Europe/Skopje",
    slotDurationMins: 30,
    bufferTimeMins: 15,
  });
  const profile = await owner.query(api.users.getMyProfile);
  if (!profile?.staffId) throw new Error("Fixture staff member missing.");
  return { owner, orgId, serviceId, staffId: profile.staffId };
}

describe("mobile offered-slot alignment", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it.each([
    {
      scenario: "weekly hours starting at 09:15 in winter",
      now: "2026-11-05T08:00:00Z",
      date: "2026-11-05",
      override: false,
    },
    {
      scenario: "a date override starting at 09:15",
      now: "2026-11-05T08:00:00Z",
      date: "2026-11-05",
      override: true,
    },
    {
      scenario: "weekly hours starting at 09:15 during daylight saving time",
      now: "2026-07-02T07:00:00Z",
      date: "2026-07-02",
      override: false,
    },
  ])(
    "books the offered time for $scenario",
    async ({ now, date, override }) => {
      // Both instants are 09:00 in the studio. Booking timestamps retain 09:30
      // in their UTC fields regardless of the device/server timezone or DST.
      vi.setSystemTime(new Date(now));
      const { owner, orgId, serviceId, staffId } = await studio(
        override ? "09:00" : "09:15",
      );
      if (override)
        await owner.mutation(api.availabilityOverrides.createOverride, {
          orgId,
          staffId,
          date,
          type: "custom_hours",
          startTime: "09:15",
          endTime: "17:00",
        });

      const args = { staffId, serviceId, date, refreshMinute: 0 };
      const slots = await owner.query(api.mobile.slots, args);
      expect(slots.length).toBeGreaterThan(0);
      expect(slots[0].startAt).toBe(Date.parse(`${date}T09:30:00Z`));
      expect(slots.every((slot) => slot.startAt % (30 * 60_000) === 0)).toBe(
        true,
      );

      const bookingId = await owner.mutation(api.mobile.createAppointment, {
        staffId,
        serviceId,
        startAt: slots[0].startAt,
        customerName: "Mobile Client",
      });
      expect(
        await owner.query(api.mobile.getAppointment, {
          bookingId: bookingId as Id<"bookings">,
        }),
      ).toMatchObject({
        startAt: slots[0].startAt,
        endAt: slots[0].endAt,
        priceMinorUnits: slots[0].priceMinorUnits,
        status: "confirmed",
      });
      expect(
        (await owner.query(api.mobile.slots, args)).some(
          (slot) => slot.startAt === slots[0].startAt,
        ),
      ).toBe(false);
    },
  );
});
