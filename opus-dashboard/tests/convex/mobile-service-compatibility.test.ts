import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import schema from "../../convex/schema";
import { convexModules } from "../../convex-test.setup";
import {
  mobileServiceLabel,
  serviceAvailability,
} from "../../../opus-mobile/src/lib/services";

async function setup() {
  const backend = convexTest(schema, convexModules);
  const owner = backend.withIdentity({
    subject: "mobile-category-owner",
    email: "mobile-category-owner@example.com",
  });
  await owner.mutation(api.users.ensureUser);
  const { orgId } = await owner.mutation(api.activation.startBeautyBusiness, {
    name: "Category Studio",
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
      open: "09:00",
      close: "17:00",
      isClosed: false,
    })),
  });
  const categoryId = await owner.mutation(
    api.serviceCategories.createCategory,
    {
      orgId,
      name: "Women",
      sortOrder: 0,
    },
  );
  await owner.mutation(api.services.updateService, {
    orgId,
    serviceId,
    categoryId,
  });
  return { backend, owner, orgId, serviceId, categoryId };
}

describe("mobile service compatibility", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-05T08:00:00Z"));
  });
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("distinguishes same-name services before and after saving appointments without changing their identities", async () => {
    const { backend, owner, orgId, serviceId } = await setup();
    const initial = await owner.query(api.mobileManagement.list);
    const categoryId = await owner.mutation(
      api.serviceCategories.createCategory,
      {
        orgId,
        name: "Men",
        sortOrder: 1,
      },
    );
    const otherServiceId = await owner.mutation(api.services.createService, {
      orgId,
      name: "Haircut",
      durationMins: 30,
      priceMinorUnits: 120000,
      currency: "MKD",
      staffIds: [initial.callerId as Id<"staff_members">],
      categoryId,
      sortOrder: 1,
    });
    const studio = await owner.query(api.mobile.bootstrap);
    expect(studio.available).toBe(true);
    if (!studio.available) throw new Error("Studio unavailable");
    const management = await owner.query(api.mobileManagement.list);
    for (const services of [studio.services, management.services]) {
      expect(services.map((service) => service.id)).toEqual([
        serviceId,
        otherServiceId,
      ]);
      expect(services.map(mobileServiceLabel)).toEqual([
        "Haircut · Women",
        "Haircut · Men",
      ]);
      expect(services.every((service) => service.name === "Haircut")).toBe(
        true,
      );
    }
    // Existing backends omit the additive field.
    expect(mobileServiceLabel({ name: "Haircut" })).toBe("Haircut");

    const staffId = initial.callerId as Id<"staff_members">;
    const slots = await owner.query(api.mobile.slots, {
      serviceId,
      staffId,
      date: "2026-11-06",
      refreshMinute: 0,
    });
    const bookings = [];
    for (const [index, selectedServiceId] of [
      serviceId,
      otherServiceId,
    ].entries()) {
      bookings.push(
        await owner.mutation(api.mobile.createAppointment, {
          staffId,
          serviceId: selectedServiceId,
          startAt: slots[index * 4].startAt,
          customerName: "Returning client",
          customerEmail: "returning@example.com",
        }),
      );
    }
    vi.setSystemTime(new Date("2026-11-06T07:00:00Z"));
    const day = Date.UTC(2026, 10, 6);
    const calendar = await owner.query(api.mobile.calendar, { day });
    const overview = await owner.query(api.mobile.overview, {
      refreshMinute: 0,
    });
    for (const appointments of [calendar, overview.appointments]) {
      expect(
        appointments.map((appointment) => appointment.serviceName),
      ).toEqual(["Haircut · Women", "Haircut · Men"]);
      expect(appointments.map((appointment) => appointment.serviceIds)).toEqual(
        [[serviceId], [otherServiceId]],
      );
    }
    const appointment = await owner.query(api.mobile.getAppointment, {
      bookingId: bookings[0] as Id<"bookings">,
    });
    expect(appointment?.serviceName).toBe("Haircut · Women");
    const customerId = appointment!.customerId as Id<"customers">;
    expect(
      (await owner.query(api.clients.getProfile, { customerId }))?.upcoming.map(
        (booking) => booking.services,
      ),
    ).toEqual([["Haircut · Women"], ["Haircut · Men"]]);

    vi.setSystemTime(new Date("2026-11-06T08:45:00Z"));
    await owner.mutation(api.mobile.changeAppointmentStatus, {
      bookingId: bookings[0] as Id<"bookings">,
      status: "completed",
    });
    const profile = await owner.query(api.clients.getProfile, { customerId });
    expect(profile?.history[0].services).toEqual(["Haircut · Women"]);
    expect(profile?.upcoming[0].services).toEqual(["Haircut · Men"]);
    expect(profile?.favouriteService).toBe("Haircut · Women");
    expect((await backend.run((ctx) => ctx.db.get(serviceId)))?.name).toBe(
      "Haircut",
    );
  });

  it("does not expose deleted categories or categories belonging to another studio", async () => {
    const { backend, owner, orgId, serviceId, categoryId } = await setup();
    const management = await owner.query(api.mobileManagement.list);
    const staffId = management.callerId as Id<"staff_members">;
    const slots = await owner.query(api.mobile.slots, {
      serviceId,
      staffId,
      date: "2026-11-06",
      refreshMinute: 0,
    });
    const bookingId = (await owner.mutation(api.mobile.createAppointment, {
      serviceId,
      staffId,
      startAt: slots[0].startAt,
      customerName: "Client",
    })) as Id<"bookings">;
    vi.setSystemTime(new Date("2026-11-06T10:00:00Z"));
    await owner.mutation(api.mobile.changeAppointmentStatus, {
      bookingId,
      status: "completed",
    });
    const other = backend.withIdentity({
      subject: "other-category-owner",
      email: "other-category-owner@example.com",
    });
    await other.mutation(api.users.ensureUser);
    const { orgId: otherOrgId } = await other.mutation(
      api.activation.startBeautyBusiness,
      { name: "Other Category Studio", category: "hair_salon" },
    );
    const otherCategoryId = await other.mutation(
      api.serviceCategories.createCategory,
      { orgId: otherOrgId, name: "Private category", sortOrder: 0 },
    );
    await backend.run((ctx) =>
      ctx.db.patch(categoryId, { isDeleted: true, deletedAt: Date.now() }),
    );
    for (const referencedCategoryId of [
      categoryId,
      otherCategoryId,
      undefined,
    ]) {
      // An invalid legacy reference must never widen the category read scope.
      await backend.run((ctx) =>
        ctx.db.patch(serviceId, { categoryId: referencedCategoryId }),
      );
      const studio = await owner.query(api.mobile.bootstrap);
      if (!studio.available) throw new Error("Studio unavailable");
      expect(studio.orgId).toBe(orgId);
      const management = await owner.query(api.mobileManagement.list);
      for (const services of [studio.services, management.services]) {
        expect(services[0].categoryName).toBeUndefined();
        expect(mobileServiceLabel(services[0])).toBe("Haircut");
      }
      const appointment = await owner.query(api.mobile.getAppointment, {
        bookingId,
      });
      expect(appointment?.serviceName).toBe("Haircut");
      const calendar = await owner.query(api.mobile.calendar, {
        day: Date.UTC(2026, 10, 6),
      });
      expect(calendar[0].serviceName).toBe("Haircut");
      const overview = await owner.query(api.mobile.overview, {
        refreshMinute: 0,
      });
      expect(overview.appointments[0].serviceName).toBe("Haircut");
      const profile = await owner.query(api.clients.getProfile, {
        customerId: appointment!.customerId as Id<"customers">,
      });
      expect(profile?.history[0].services).toEqual(["Haircut"]);
      expect(profile?.favouriteService).toBe("Haircut");
    }
  });

  it.each([
    { isActive: true, isOpusVisible: false },
    { isActive: false, isOpusVisible: true },
    { isActive: true, isOpusVisible: true },
    { isActive: false, isOpusVisible: false },
  ])(
    "preserves independent booking flags on a price edit: %j",
    async (flags) => {
      const { backend, owner, orgId, serviceId, categoryId } = await setup();
      await owner.mutation(api.services.updateService, {
        orgId,
        serviceId,
        ...flags,
      });
      const management = await owner.query(api.mobileManagement.list);
      const initial = management.services.find(
        (service) => service.id === serviceId,
      )!;
      const availability = serviceAvailability(initial);
      await owner.mutation(api.mobileManagement.saveService, {
        serviceId,
        name: initial.name,
        description: initial.description,
        durationMins: initial.durationMins,
        priceMinorUnits: 125000,
        currency: initial.currency,
        staffIds: initial.staffIds as Id<"staff_members">[],
        ...availability,
      });
      expect(await backend.run((ctx) => ctx.db.get(serviceId))).toMatchObject({
        ...flags,
        categoryId,
        priceMinorUnits: 125000,
      });
      const studio = await owner.query(api.mobile.bootstrap);
      if (!studio.available) throw new Error("Studio unavailable");
      expect(studio.services.some((service) => service.id === serviceId)).toBe(
        flags.isActive,
      );
      const slots = owner.query(api.mobile.slots, {
        serviceId,
        staffId: initial.staffIds[0] as Id<"staff_members">,
        date: "2026-11-06",
        refreshMinute: 0,
      });
      if (flags.isActive) expect((await slots).length).toBeGreaterThan(0);
      else
        await expect(slots).rejects.toThrow(
          "Service not found or is inactive.",
        );
    },
  );
});
