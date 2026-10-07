import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import schema from "../../convex/schema";
import { convexModules } from "../../convex-test.setup";

async function setup() {
  const backend = convexTest(schema, convexModules);
  const owner = backend.withIdentity({
    subject: "mobile-owner",
    email: "mobile-owner@example.com",
  });
  await owner.mutation(api.users.ensureUser);
  const { orgId } = await owner.mutation(api.activation.startBeautyBusiness, {
    name: "Mobile Studio",
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
  const studio = await owner.query(api.mobile.bootstrap);
  if (!studio.available) throw new Error("Fixture studio missing.");
  const staffId = studio.team[0].id;
  const day = studio.today + 7 * 86_400_000;
  const slots = await owner.query(api.mobile.slots, {
    staffId: staffId as Id<"staff_members">,
    serviceId,
    date: new Date(day).toISOString().slice(0, 10),
    refreshMinute: 0,
  });
  return { backend, owner, orgId, serviceId, staffId, day, slots };
}

describe("mobile studio backend", () => {
  it("keeps the available-slot quote and saved price aligned when surge rules are disabled", async () => {
    const { backend, owner, orgId, serviceId, staffId, day } = await setup();
    await backend.run(async (ctx) => {
      const settings = await ctx.db
        .query("org_settings")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .first();
      await ctx.db.patch(settings!._id, {
        surgePricingEnabled: false,
        surgeRules: [
          {
            dayOfWeek: new Date(day).getUTCDay(),
            startTime: "09:00",
            endTime: "17:00",
            multiplierPct: 50,
          },
        ],
      });
    });
    const slots = await owner.query(api.mobile.slots, {
      staffId: staffId as Id<"staff_members">,
      serviceId,
      date: new Date(day).toISOString().slice(0, 10),
      refreshMinute: 0,
    });
    expect(slots[0].priceMinorUnits).toBe(120000);
    const bookingId = await owner.mutation(api.mobile.createAppointment, {
      staffId: staffId as Id<"staff_members">,
      serviceId,
      startAt: slots[0].startAt,
      customerName: "Quoted price client",
    });
    expect(
      (
        await owner.query(api.mobile.getAppointment, {
          bookingId: bookingId as Id<"bookings">,
        })
      )?.priceMinorUnits,
    ).toBe(slots[0].priceMinorUnits);
  });

  it("requires a current active studio membership and never accepts an orgId from the client", async () => {
    const { backend, owner, orgId, day } = await setup();
    await expect(backend.query(api.mobile.bootstrap)).rejects.toThrow(
      "Unauthenticated",
    );
    await expect(backend.query(api.mobile.calendar, { day })).rejects.toThrow(
      "Unauthenticated",
    );
    await expect(
      owner.query(api.mobile.calendar, { day, orgId } as { day: number }),
    ).rejects.toThrow();
    const other = backend.withIdentity({
      subject: "mobile-unassigned",
      email: "unassigned@example.com",
    });
    await other.mutation(api.users.ensureUser);
    expect((await other.query(api.mobile.bootstrap)).available).toBe(false);
    await expect(other.query(api.mobile.calendar, { day })).rejects.toThrow(
      "No active business",
    );
    await backend.run(async (ctx) => {
      const staff = await ctx.db
        .query("staff_members")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .first();
      await ctx.db.patch(staff!._id, { isActive: false });
    });
    expect((await owner.query(api.mobile.bootstrap)).available).toBe(false);
    await expect(owner.query(api.mobile.calendar, { day })).rejects.toThrow(
      "Unauthorised",
    );
  });

  it("books only available assigned services, rejects conflicts, and persists audited status changes", async () => {
    const { backend, owner, orgId, serviceId, staffId, day, slots } =
      await setup();
    expect(slots.length).toBeGreaterThan(0);
    const draft = {
      staffId: staffId as Id<"staff_members">,
      serviceId,
      startAt: slots[0].startAt,
      customerName: "Mobile client",
      customerEmail: "client@example.com",
    };
    const id = await owner.mutation(api.mobile.createAppointment, draft);
    const rows = await owner.query(api.mobile.calendar, { day });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id,
      customerName: "Mobile client",
      serviceName: "Haircut",
      currency: "MKD",
      priceMinorUnits: 120000,
      status: "confirmed",
    });
    await expect(
      owner.mutation(api.mobile.createAppointment, draft),
    ).rejects.toThrow("conflict");
    await owner.mutation(api.mobile.changeAppointmentStatus, {
      bookingId: id as Id<"bookings">,
      status: "completed",
    });
    expect(
      (
        await owner.query(api.mobile.getAppointment, {
          bookingId: id as Id<"bookings">,
        })
      )?.status,
    ).toBe("completed");
    await expect(
      owner.mutation(api.mobile.changeAppointmentStatus, {
        bookingId: id as Id<"bookings">,
        status: "cancelled",
      }),
    ).rejects.toThrow("terminal");
    const audits = await backend.run((ctx) =>
      ctx.db
        .query("audit_log")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .collect(),
    );
    const actions = audits.map((row) => row.action);
    expect(actions).toEqual(
      expect.arrayContaining(["booking.created", "booking.completed"]),
    );
    expect(actions).not.toContain("booking.checked_in");
  });

  it("rejects arrival writes and can complete a historical checked-in appointment", async () => {
    const { backend, owner, serviceId, staffId, slots } = await setup();
    const id = await owner.mutation(api.mobile.createAppointment, {
      staffId: staffId as Id<"staff_members">,
      serviceId,
      startAt: slots[0].startAt,
      customerName: "Existing client",
    });
    await expect(
      owner.mutation(api.mobile.changeAppointmentStatus, {
        bookingId: id as Id<"bookings">,
        status: "checked_in",
      } as never),
    ).rejects.toThrow();
    expect(
      (await backend.run((ctx) => ctx.db.get(id as Id<"bookings">)))?.status,
    ).toBe("confirmed");
    await backend.run((ctx) =>
      ctx.db.patch(id as Id<"bookings">, { status: "checked_in" }),
    );
    await owner.mutation(api.mobile.changeAppointmentStatus, {
      bookingId: id as Id<"bookings">,
      status: "completed",
    });
    expect(
      (
        await owner.query(api.mobile.getAppointment, {
          bookingId: id as Id<"bookings">,
        })
      )?.status,
    ).toBe("completed");
  });

  it("does not expose another studio's appointments or permit writes to them", async () => {
    const { backend, owner, serviceId, staffId, day, slots } = await setup();
    const id = await owner.mutation(api.mobile.createAppointment, {
      staffId: staffId as Id<"staff_members">,
      serviceId,
      startAt: slots[0].startAt,
      customerName: "Private client",
    });
    const other = backend.withIdentity({
      subject: "other-mobile-owner",
      email: "other-owner@example.com",
    });
    await other.mutation(api.users.ensureUser);
    await other.mutation(api.activation.startBeautyBusiness, {
      name: "Other Studio",
      category: "nail_salon",
    });
    expect(await other.query(api.mobile.calendar, { day })).toEqual([]);
    expect(
      await other.query(api.mobile.getAppointment, {
        bookingId: id as Id<"bookings">,
      }),
    ).toBeNull();
    await expect(
      other.mutation(api.mobile.changeAppointmentStatus, {
        bookingId: id as Id<"bookings">,
        status: "completed",
      }),
    ).rejects.toThrow("own appointments");
    expect(
      (await backend.run((ctx) => ctx.db.get(id as Id<"bookings">)))?.status,
    ).toBe("confirmed");
    await expect(
      other.mutation(api.mobile.createAppointment, {
        staffId: staffId as Id<"staff_members">,
        serviceId,
        startAt: slots[1].startAt,
        customerName: "Intruder",
      }),
    ).rejects.toThrow("Staff member not available");
    await expect(
      owner.query(api.clients.getDirectory, {
        search: "",
        page: 0,
        segment: "all",
        sort: "recent",
      }),
    ).rejects.toThrow("paid plan");
  });
  it("returns a bounded period with exclusive end, hides deleted/rescheduled rows and preserves cancellation history", async () => {
    const { backend, owner, staffId, serviceId, day, slots } = await setup();
    const first = await owner.mutation(api.mobile.createAppointment, {
      staffId: staffId as Id<"staff_members">,
      serviceId,
      startAt: slots[0].startAt,
      customerName: "Calendar client",
    });
    const ids = await backend.run(async (ctx) => {
      const source = await ctx.db.get(first as Id<"bookings">);
      if (!source) throw new Error("Fixture booking missing");
      const { _id, _creationTime, ...booking } = source;
      void _id;
      void _creationTime;
      const later = await ctx.db.insert("bookings", {
        ...booking,
        startAt: day + 2 * 86_400_000,
        endAt: day + 2 * 86_400_000 + 30 * 60_000,
      });
      const cancelled = await ctx.db.insert("bookings", {
        ...booking,
        startAt: day + 3 * 86_400_000,
        endAt: day + 3 * 86_400_000 + 30 * 60_000,
        status: "cancelled",
        cancellationReason: "Cancelled by customer",
      });
      await ctx.db.insert("bookings", {
        ...booking,
        startAt: day + 7 * 86_400_000,
        endAt: day + 7 * 86_400_000 + 30 * 60_000,
      });
      await ctx.db.insert("bookings", {
        ...booking,
        startAt: day + 86_400_000,
        endAt: day + 86_400_000 + 30 * 60_000,
        status: "cancelled",
        cancellationReason: "Rescheduled",
      });
      await ctx.db.insert("bookings", {
        ...booking,
        startAt: day + 4 * 86_400_000,
        endAt: day + 4 * 86_400_000 + 30 * 60_000,
        isDeleted: true,
        deletedAt: Date.now(),
      });
      return [first, later, cancelled];
    });
    expect(
      (
        await owner.query(api.mobile.calendar, {
          day,
          endDay: day + 7 * 86_400_000,
        })
      ).map((a) => a.id),
    ).toEqual(ids);
    expect(await owner.query(api.mobile.calendar, { day })).toHaveLength(1);
    const other = backend.withIdentity({
      subject: "period-other",
      email: "period-other@example.com",
    });
    await other.mutation(api.users.ensureUser);
    await other.mutation(api.activation.startBeautyBusiness, {
      name: "Other calendar",
      category: "nail_salon",
    });
    expect(
      await other.query(api.mobile.calendar, {
        day,
        endDay: day + 42 * 86_400_000,
      }),
    ).toEqual([]);
    await expect(backend.query(api.mobile.calendar, { day })).rejects.toThrow();
  });
  it("rejects invalid and unbounded calendar ranges", async () => {
    const { owner, day } = await setup();
    for (const args of [
      { day: day + 1 },
      { day, endDay: day },
      { day, endDay: day - 86_400_000 },
      { day, endDay: day + 43 * 86_400_000 },
      { day, endDay: day + 86_400_000 + 1 },
    ])
      await expect(owner.query(api.mobile.calendar, args)).rejects.toThrow(
        "valid calendar range",
      );
    expect(
      await owner.query(api.mobile.calendar, {
        day,
        endDay: day + 42 * 86_400_000,
      }),
    ).toEqual([]);
  });
});
