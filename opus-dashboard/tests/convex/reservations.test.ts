import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import { api, internal } from "../../convex/_generated/api";
import schema from "../../convex/schema";
import { convexModules } from "../../convex-test.setup";
import {
  availability,
  createReservation,
  changeReservation,
} from "../../convex/lib/reservationEngine";
import { localDateTimeInstants } from "../../convex/lib/reservationTime";
import type { Id } from "../../convex/_generated/dataModel";

const backend = () => convexTest(schema, convexModules);
type Backend = ReturnType<typeof backend>;
const DATE = "2026-10-14";
const instant = (time: string, date = DATE) =>
  localDateTimeInstants(date, time, "Europe/Skopje")[0];
let requestSequence = 0;

async function venue(t: Backend, key = "owner") {
  const owner = t.withIdentity({
    subject: key,
    email: `${key}@example.com`,
    emailVerified: true,
  });
  await owner.mutation(api.users.ensureUser);
  const { orgId } = await owner.mutation(api.activation.startBeautyBusiness, {
    name: `${key} venue`,
    category: "hair_salon",
  });
  const profile = await owner.query(api.users.getMyProfile);
  const rows = await t.run(async (ctx) => {
    await ctx.db.patch(orgId, {
      industry: "hospitality",
      venueType: "restaurant",
      websiteStatus: "published",
    });
    const settingsId = await ctx.db.insert("reservation_settings", {
      orgId,
      schemaVersion: 2,
      timezone: "Europe/Skopje",
      bookingWindowDays: 60,
      minAdvanceBookingHours: 1,
      minPartySize: 1,
      maxPartySize: 10,
      defaultDurationMins: 90,
      minDurationMins: 30,
      maxDurationMins: 180,
      bufferMins: 15,
      slotIntervalMins: 15,
      cancellationWindowHours: 24,
      noShowGraceMins: 15,
      servicePeriods: [
        {
          name: "Service",
          startTime: "09:00",
          endTime: "23:00",
          daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
        },
      ],
      walkInsAccepted: true,
      walkInBufferMins: 0,
      reminderHoursBefore: [24],
      updatedAt: Date.now(),
    });
    const areaId = await ctx.db.insert("floor_plans", {
      orgId,
      name: "Main room",
      canvasWidth: 100,
      canvasHeight: 100,
      isActive: true,
      isDeleted: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    const tableIds: Id<"tables">[] = [];
    for (const label of ["A", "B", "C"])
      tableIds.push(
        await ctx.db.insert("tables", {
          orgId,
          floorPlanId: areaId,
          label,
          capacity: 2,
          minCapacity: 1,
          x: 0,
          y: 0,
          width: 10,
          height: 10,
          rotation: 0,
          shape: "rectangle",
          status: "available",
          isActive: true,
          sortOrder: tableIds.length,
          isDeleted: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }),
      );
    const comboIds: Id<"table_combinations">[] = [];
    for (const members of [
      [tableIds[0], tableIds[1]],
      [tableIds[1], tableIds[2]],
    ])
      comboIds.push(
        await ctx.db.insert("table_combinations", {
          orgId,
          floorPlanId: areaId,
          name: members[0] === tableIds[0] ? "A + B" : "B + C",
          tableIds: members,
          minPartySize: 3,
          capacity: 4,
          revision: 1,
          isActive: true,
          isDeleted: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }),
      );
    return { settingsId, areaId, tableIds, comboIds };
  });
  return { t, owner, orgId, staffId: profile!.staffId!, ...rows };
}
type Venue = Awaited<ReturnType<typeof venue>>;
function draft(
  s: Venue,
  tableIds = s.tableIds.slice(0, 2),
  time = "12:00",
  partySize = 4,
) {
  return {
    requestId: `request-${++requestSequence}`,
    serviceDate: DATE,
    startAt: instant(time),
    partySize,
    customerName: "Reservation Guest",
    source: "manual" as const,
    tableIds,
  };
}
async function active(s: Venue) {
  return s.t.run((ctx) =>
    ctx.db
      .query("reservation_allocations")
      .withIndex("by_org_active", (q) =>
        q.eq("orgId", s.orgId).eq("isActive", true),
      )
      .collect(),
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-12T06:00:00Z"));
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("physical-table reservation allocation", () => {
  it("accepts ordinary restaurant/cafe organizations and rejects unsupported types, preserving beauty", async () => {
    const s = await venue(backend());
    vi.stubEnv("HOSPITALITY_ENABLED", "false");
    vi.stubEnv("HOSPITALITY_NEW_BOOKINGS_ENABLED", "false");
    await s.t.run((ctx) =>
      ctx.db.patch(s.orgId, { hospitalityPilotEnabled: false }),
    );
    expect(
      (
        await s.owner.query(api.reservations.getSlots, {
          date: DATE,
          partySize: 2,
        })
      ).length,
    ).toBeGreaterThan(0);
    for (const patch of [
      { venueType: "hotel" as const },
      {
        venueType: "restaurant" as const,
        industry: "beauty_wellness" as const,
      },
    ]) {
      await s.t.run((ctx) => ctx.db.patch(s.orgId, patch));
      await expect(
        s.owner.mutation(api.reservations.createManual, draft(s)),
      ).rejects.toThrow("unavailable");
    }
    expect(await active(s)).toEqual([]);
  });

  it("allocates complete explicit combinations atomically across overlapping requests", async () => {
    const s = await venue(backend());
    const results = await Promise.allSettled([
      s.owner.mutation(
        api.reservations.createManual,
        draft(s, s.tableIds.slice(0, 2)),
      ),
      s.owner.mutation(
        api.reservations.createManual,
        draft(s, s.tableIds.slice(1)),
      ),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
    const allocations = await active(s);
    expect(allocations).toHaveLength(2);
    expect(new Set(allocations.map((a) => a.reservationId)).size).toBe(1);
    const bookedIds = allocations.map((a) => a.tableId);
    const free = s.tableIds.find((id) => !bookedIds.includes(id))!;
    await s.owner.mutation(
      api.reservations.createManual,
      draft(s, [free], "12:00", 2),
    );
    await expect(
      s.owner.mutation(
        api.reservations.createManual,
        draft(s, [s.tableIds[1]], "12:00", 2),
      ),
    ).rejects.toThrow("no longer available");
  });

  it("never infers transitive or oversized combinations and enforces reset boundaries", async () => {
    const s = await venue(backend());
    for (const tableIds of [
      [s.tableIds[0], s.tableIds[2]],
      s.tableIds,
      [s.tableIds[0], s.tableIds[0]],
    ])
      await expect(
        s.owner.mutation(api.reservations.createManual, draft(s, tableIds)),
      ).rejects.toThrow();
    await s.owner.mutation(api.reservations.createManual, draft(s));
    await expect(
      s.owner.mutation(
        api.reservations.createManual,
        draft(s, s.tableIds.slice(1), "13:30"),
      ),
    ).rejects.toThrow("no longer available");
    await s.owner.mutation(
      api.reservations.createManual,
      draft(s, s.tableIds.slice(1), "13:45"),
    );
    expect(await active(s)).toHaveLength(4);
  });

  it("preserves original allocations when a full-set move fails and releases only removed tables on success", async () => {
    const s = await venue(backend());
    const first = await s.owner.mutation(
      api.reservations.createManual,
      draft(s),
    );
    const blocker = await s.owner.mutation(
      api.reservations.createManual,
      draft(s, [s.tableIds[2]], "12:00", 2),
    );
    const move = {
      reservationId: first._id,
      expectedRevision: 1,
      action: "move" as const,
      tableIds: s.tableIds.slice(1),
    };
    await expect(
      s.owner.mutation(api.reservations.change, move),
    ).rejects.toThrow("no longer available");
    expect(
      (await s.owner.query(api.reservations.listDay, { date: DATE })).find(
        (r) => r._id === first._id,
      ),
    ).toMatchObject({ revision: 1, tableIds: s.tableIds.slice(0, 2) });
    await s.owner.mutation(api.reservations.change, {
      reservationId: blocker._id,
      expectedRevision: 1,
      action: "cancel",
    });
    const moved = await s.owner.mutation(api.reservations.change, move);
    expect(moved._id).toBe(first._id);
    expect(moved.revision).toBe(2);
    expect(moved.tableIds?.slice().sort()).toEqual(s.tableIds.slice(1).sort());
    expect((await active(s)).map((a) => a.tableId).sort()).toEqual(
      s.tableIds.slice(1).sort(),
    );
    await expect(
      s.owner.mutation(api.reservations.change, move),
    ).rejects.toThrow("changed");
  });

  it("replays the identical request without duplicating allocations, customers, audit, or notifications", async () => {
    const s = await venue(backend()),
      input = draft(s);
    const first = await s.owner.mutation(api.reservations.createManual, input);
    const count = async () =>
      s.t.run(async (ctx) => ({
        customers: (
          await ctx.db
            .query("customers")
            .withIndex("by_org", (q) => q.eq("orgId", s.orgId))
            .collect()
        ).length,
        notifications: (
          await ctx.db
            .query("notifications")
            .withIndex("by_org", (q) => q.eq("orgId", s.orgId))
            .collect()
        ).length,
        audit: (
          await ctx.db
            .query("audit_log")
            .withIndex("by_org", (q) => q.eq("orgId", s.orgId))
            .collect()
        ).length,
      }));
    const before = await count();
    expect(
      (await s.owner.mutation(api.reservations.createManual, input))._id,
    ).toBe(first._id);
    expect(await count()).toEqual(before);
    expect(await active(s)).toHaveLength(2);
    await expect(
      s.owner.mutation(api.reservations.createManual, {
        ...input,
        partySize: 3,
      }),
    ).rejects.toThrow("already been used");
  });

  it("permits active restaurant staff independent of beauty-own access, but rejects foreign records and anonymous calls", async () => {
    const t = backend(),
      a = await venue(t),
      b = await venue(t, "other");
    const employee = t.withIdentity({
      subject: "employee",
      email: "employee@example.com",
      emailVerified: true,
    });
    const userId = await employee.mutation(api.users.ensureUser);
    await t.run(async (ctx) => {
      await ctx.db.insert("staff_members", {
        orgId: a.orgId,
        userId,
        displayName: "Host",
        role: "staff",
        bookingAccess: "own",
        specialties: [],
        isActive: true,
        isDeleted: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      await ctx.db.patch(userId, { activeOrgId: a.orgId });
    });
    const booking = await employee.mutation(
      api.reservations.createManual,
      draft(a),
    );
    expect(
      (await employee.query(api.reservations.listDay, { date: DATE }))[0]._id,
    ).toBe(booking._id);
    await expect(
      b.owner.mutation(api.reservations.change, {
        reservationId: booking._id,
        expectedRevision: 1,
        action: "cancel",
      }),
    ).rejects.toThrow("not found");
    await expect(
      employee.mutation(
        api.reservations.createManual,
        draft(a, b.tableIds.slice(0, 2)),
      ),
    ).rejects.toThrow("no longer available");
    await expect(
      t.query(api.reservations.listDay, { date: DATE }),
    ).rejects.toThrow("Unauthenticated");
  });

  it("blocks closures and unresolved legacy reservations rather than guessing their time model", async () => {
    const s = await venue(backend());
    await s.t.run((ctx) =>
      ctx.db.insert("reservation_closures", {
        orgId: s.orgId,
        tableIds: [s.tableIds[1]],
        startAt: instant("11:00"),
        endAt: instant("14:00"),
        reason: "Repairs",
        isDeleted: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );
    await expect(
      s.owner.mutation(api.reservations.createManual, draft(s)),
    ).rejects.toThrow("no longer available");
    const booked = await s.owner.mutation(
      api.reservations.createManual,
      draft(s, [s.tableIds[0]], "12:00", 2),
    );
    await s.t.run((ctx) =>
      ctx.db.patch(booked._id, {
        schemaVersion: undefined,
        timeModel: undefined,
      }),
    );
    await expect(
      s.owner.query(api.reservations.getSlots, { date: DATE, partySize: 2 }),
    ).rejects.toThrow("Legacy reservations require review");
  });

  it("supports walk-in arrival, seating, completion and reset with overruns never releasing capacity silently", async () => {
    const s = await venue(backend());
    vi.setSystemTime(instant("12:00"));
    let reservation = await s.owner.mutation(api.reservations.createManual, {
      ...draft(s),
      source: "walk_in",
    });
    const change = async (action: "arrive" | "seat" | "complete" | "ready") => {
      reservation = await s.owner.mutation(api.reservations.change, {
        reservationId: reservation._id,
        expectedRevision: reservation.revision!,
        action,
      });
    };
    await change("arrive");
    await change("seat");
    expect(reservation.status).toBe("seated");
    vi.setSystemTime(instant("13:46"));
    await expect(
      s.owner.mutation(
        api.reservations.createManual,
        draft(s, s.tableIds.slice(1), "14:00"),
      ),
    ).rejects.toThrow("no longer available");
    await change("complete");
    expect(reservation.status).toBe("completed");
    await expect(change("ready")).rejects.toThrow("cleaning buffer");
    vi.setSystemTime(instant("14:02"));
    await change("ready");
    expect(await active(s)).toEqual([]);
    await s.owner.mutation(
      api.reservations.createManual,
      draft(s, s.tableIds.slice(1), "14:15"),
    );
  });

  it("enforces no-show grace and customer cutoff while staff manage an unpublished venue", async () => {
    const s = await venue(backend());
    let booked = await s.owner.mutation(
      api.reservations.createManual,
      draft(s),
    );
    await expect(
      s.owner.mutation(api.reservations.change, {
        reservationId: booked._id,
        expectedRevision: 1,
        action: "no_show",
      }),
    ).rejects.toThrow("grace period");
    await s.t.run((ctx) =>
      ctx.db.patch(s.orgId, { websiteStatus: "unpublished" }),
    );
    expect(
      (
        await s.owner.query(api.reservations.getSlots, {
          date: DATE,
          partySize: 2,
        })
      ).length,
    ).toBeGreaterThan(0);
    booked = await s.owner.mutation(api.reservations.change, {
      reservationId: booked._id,
      expectedRevision: 1,
      action: "reschedule",
      startAt: instant("13:00"),
    });
    vi.setSystemTime(instant("13:14"));
    await expect(
      s.t.run(async (ctx) =>
        changeReservation(
          ctx,
          (await ctx.db.get(s.orgId))!,
          booked._id,
          { expectedRevision: booked.revision!, action: "cancel" },
          { type: "system" },
        ),
      ),
    ).rejects.toThrow("Online changes are closed");
    vi.setSystemTime(instant("13:15"));
    const noShow = await s.owner.mutation(api.reservations.change, {
      reservationId: booked._id,
      expectedRevision: booked.revision!,
      action: "no_show",
    });
    expect(noShow.status).toBe("no_show");
    expect(await active(s)).toEqual([]);
  });

  it("handles overnight operating dates and both DST folds without offering nonexistent local minutes", async () => {
    const s = await venue(backend());
    await s.t.run((ctx) =>
      ctx.db.patch(s.settingsId, {
        defaultDurationMins: 30,
        minDurationMins: 30,
        bufferMins: 0,
        servicePeriods: [
          {
            name: "Night",
            startTime: "22:00",
            endTime: "04:00",
            endDayOffset: 1,
            daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
          },
        ],
      }),
    );
    const overnight = await s.owner.query(api.reservations.getSlots, {
      date: DATE,
      partySize: 4,
    });
    const late = overnight.find(
      (slot) => slot.startAt === instant("01:00", "2026-10-15"),
    )!;
    expect(late.serviceDate).toBe(DATE);
    expect(late.label).toBe("2026-10-15 01:00");
    await s.owner.mutation(api.reservations.createManual, {
      ...draft(s),
      startAt: late.startAt,
    });
    vi.setSystemTime(new Date("2026-03-20T12:00:00Z"));
    const spring = await s.owner.query(api.reservations.getSlots, {
      date: "2026-03-28",
      partySize: 2,
    });
    expect(spring.some((slot) => slot.label.includes("02:"))).toBe(false);
    vi.setSystemTime(new Date("2026-10-20T12:00:00Z"));
    const autumn = await s.owner.query(api.reservations.getSlots, {
      date: "2026-10-24",
      partySize: 2,
    });
    const repeated = autumn.filter((slot) => slot.label.includes("02:30"));
    expect(repeated).toHaveLength(2);
    expect(repeated[1].startAt - repeated[0].startAt).toBe(3_600_000);
    expect(new Set(repeated.map((slot) => slot.label)).size).toBe(2);
    expect(
      localDateTimeInstants("2026-03-29", "02:30", "Europe/Skopje"),
    ).toEqual([]);
  });

  it("keeps public timing rules and private management secrets out of staff projections", async () => {
    const s = await venue(backend());
    const input = {
      ...draft(s),
      source: "web" as const,
      customerEmail: "guest@example.com",
      verifiedEmail: "guest@example.com",
      manageTokenHash: "private-hash",
      manageTokenCiphertext: "private-cipher",
      manageTokenExpiresAt: Date.now() + 86_400_000,
    };
    await s.t.run(async (ctx) =>
      createReservation(ctx, (await ctx.db.get(s.orgId))!, input, {
        type: "system",
      }),
    );
    const rows = await s.owner.query(api.reservations.listDay, { date: DATE });
    expect(JSON.stringify(rows)).not.toMatch(
      /private-hash|private-cipher|requestFingerprint|verifiedEmail/,
    );
    vi.setSystemTime(instant("11:30"));
    const slots = await s.t.run(async (ctx) =>
      availability(ctx, (await ctx.db.get(s.orgId))!, DATE, 2),
    );
    expect(slots.every((slot) => slot.startAt >= instant("12:30"))).toBe(true);
  });
  it("blocks hospitality access through beauty reads and writes", async () => {
    const s = await venue(backend());
    await expect(
      s.owner.query(api.services.listServices, { orgId: s.orgId }),
    ).rejects.toThrow();
    await expect(
      s.owner.query(api.bookings.listBookingsByOrg, { orgId: s.orgId }),
    ).rejects.toThrow();
    await expect(
      s.owner.mutation(api.services.createService, {
        orgId: s.orgId,
        name: "Wrong vertical",
        durationMins: 30,
        priceMinorUnits: 0,
        currency: "MKD",
        staffIds: [s.staffId],
        sortOrder: 0,
      }),
    ).rejects.toThrow();
    await expect(
      s.owner.mutation(api.bookings.createManualBooking, {
        orgId: s.orgId,
        staffId: s.staffId,
        serviceIds: [],
        customerName: "Wrong vertical",
        startAt: instant("12:00"),
      }),
    ).rejects.toThrow();
  });

  it("atomically moves a seated combination while keeping removed tables blocked until cleaning is released", async () => {
    const s = await venue(backend());
    let r = await s.owner.mutation(api.reservations.createManual, draft(s));
    vi.setSystemTime(instant("12:00"));
    r = await s.owner.mutation(api.reservations.change, {
      reservationId: r._id,
      expectedRevision: r.revision!,
      action: "seat",
    });
    const options = await s.owner.query(api.reservations.getMoveOptions, {
      reservationId: r._id,
    });
    expect(options.some((o) => o.tableIds.includes(s.tableIds[2]))).toBe(true);
    r = await s.owner.mutation(api.reservations.change, {
      reservationId: r._id,
      expectedRevision: r.revision!,
      action: "move",
      tableIds: s.tableIds.slice(1),
    });
    expect(r.tableIds).toEqual([...s.tableIds.slice(1)].sort());
    expect(
      (await active(s))
        .filter((a) => a.kind === "cleaning")
        .map((a) => a.tableId),
    ).toEqual([s.tableIds[0]]);
    const day = await s.owner.query(api.reservations.listDay, { date: DATE });
    expect(day[0].cleaningTableIds).toEqual([s.tableIds[0]]);
    await expect(
      s.owner.mutation(api.reservations.change, {
        reservationId: r._id,
        expectedRevision: r.revision!,
        action: "ready",
        tableIds: [s.tableIds[0]],
      }),
    ).rejects.toThrow("buffer");
    vi.setSystemTime(instant("12:16"));
    await expect(
      s.owner.mutation(
        api.reservations.createManual,
        draft(s, [s.tableIds[0]], "12:30", 2),
      ),
    ).rejects.toThrow("available");
    r = await s.owner.mutation(api.reservations.change, {
      reservationId: r._id,
      expectedRevision: r.revision!,
      action: "ready",
      tableIds: [s.tableIds[0]],
    });
    expect(r.status).toBe("seated");
    expect((await active(s)).map((a) => a.tableId).sort()).toEqual(
      [...s.tableIds.slice(1)].sort(),
    );
    await s.owner.mutation(
      api.reservations.createManual,
      draft(s, [s.tableIds[0]], "12:30", 2),
    );
    vi.setSystemTime(instant("12:20"));
    r = await s.owner.mutation(api.reservations.change, {
      reservationId: r._id,
      expectedRevision: r.revision!,
      action: "complete",
    });
    vi.setSystemTime(instant("12:36"));
    r = await s.owner.mutation(api.reservations.change, {
      reservationId: r._id,
      expectedRevision: r.revision!,
      action: "ready",
    });
    expect(r.cleaningCompletedAt).toBe(Date.now());
    expect((await active(s)).filter((a) => a.reservationId === r._id)).toEqual(
      [],
    );
  });

  it("enforces service hours and closures on seated duration extensions and preserves allocation on failure", async () => {
    const s = await venue(backend());
    let r = await s.owner.mutation(
      api.reservations.createManual,
      draft(s, undefined, "20:30"),
    );
    vi.setSystemTime(instant("20:30"));
    r = await s.owner.mutation(api.reservations.change, {
      reservationId: r._id,
      expectedRevision: r.revision!,
      action: "seat",
    });
    const before = await active(s);
    await expect(
      s.owner.mutation(api.reservations.change, {
        reservationId: r._id,
        expectedRevision: r.revision!,
        action: "duration",
        durationMins: 180,
      }),
    ).rejects.toThrow("service hours");
    await s.t.run((ctx) =>
      ctx.db.insert("reservation_closures", {
        orgId: s.orgId,
        tableIds: [s.tableIds[0]],
        startAt: instant("22:15"),
        endAt: instant("23:00"),
        reason: "Closed",
        isDeleted: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );
    await expect(
      s.owner.mutation(api.reservations.change, {
        reservationId: r._id,
        expectedRevision: r.revision!,
        action: "duration",
        durationMins: 120,
      }),
    ).rejects.toThrow("closed");
    expect(await active(s)).toEqual(before);
  });

  it("rejects far-future seating and customer changes after arrival, while early completion keeps valid cleaning intervals", async () => {
    const s = await venue(backend());
    let r = await s.owner.mutation(api.reservations.createManual, draft(s));
    await expect(
      s.owner.mutation(api.reservations.change, {
        reservationId: r._id,
        expectedRevision: r.revision!,
        action: "seat",
      }),
    ).rejects.toThrow("current");
    r = await s.owner.mutation(api.reservations.change, {
      reservationId: r._id,
      expectedRevision: r.revision!,
      action: "arrive",
    });
    for (const action of ["cancel", "reschedule"] as const)
      await expect(
        s.t.run(async (ctx) =>
          changeReservation(
            ctx,
            (await ctx.db.get(s.orgId))!,
            r._id,
            {
              expectedRevision: r.revision!,
              action,
              startAt: instant("13:00"),
            },
            { type: "system" },
          ),
        ),
      ).rejects.toThrow("Online changes");
    vi.setSystemTime(instant("11:30"));
    r = await s.owner.mutation(api.reservations.change, {
      reservationId: r._id,
      expectedRevision: r.revision!,
      action: "seat",
    });
    vi.setSystemTime(instant("11:31"));
    r = await s.owner.mutation(api.reservations.change, {
      reservationId: r._id,
      expectedRevision: r.revision!,
      action: "complete",
    });
    const cleaning = await active(s);
    expect(
      cleaning.every(
        (a) =>
          a.startAt === instant("11:30") &&
          a.endAt === instant("11:46") &&
          a.kind === "cleaning",
      ),
    ).toBe(true);
  });

  it("preserves guest name snapshots and extends only still-valid management credentials", async () => {
    const s = await venue(backend());
    const first = await s.owner.mutation(api.reservations.createManual, {
      ...draft(s),
      customerName: "Private CRM Name",
      customerPhone: "+38970123456",
    });
    const second = await s.t.run(async (ctx) =>
      createReservation(
        ctx,
        (await ctx.db.get(s.orgId))!,
        {
          ...draft(s, undefined, "15:00"),
          source: "web",
          customerName: "Submitted Guest",
          customerPhone: "+38970123456",
          customerEmail: "visitor@example.com",
          verifiedEmail: "visitor@example.com",
          manageTokenHash: "hash",
          manageTokenCiphertext: "cipher",
          manageTokenExpiresAt: Date.now() + 86400000,
        },
        { type: "system" },
      ),
    );
    expect(second.customerId).toBe(first.customerId);
    expect(second.guestName).toBe("Submitted Guest");
    const moved = await s.owner.mutation(api.reservations.change, {
      reservationId: second._id,
      expectedRevision: 1,
      action: "reschedule",
      startAt: instant("16:00"),
    });
    const saved = await s.t.run((ctx) => ctx.db.get(moved._id));
    expect(saved!.manageTokenExpiresAt).toBe(instant("16:00") + 30 * 86400000);
    await s.t.run((ctx) =>
      ctx.db.patch(moved._id, { manageTokenExpiresAt: Date.now() - 1 }),
    );
    await s.owner.mutation(api.reservations.change, {
      reservationId: moved._id,
      expectedRevision: moved.revision!,
      action: "reschedule",
      startAt: instant("17:00"),
    });
    expect(
      (await s.t.run((ctx) => ctx.db.get(moved._id)))!.manageTokenExpiresAt,
    ).toBe(Date.now() - 1);
  });
  it("dry-runs explicit legacy time review without changing data, then converts stable identities atomically", async () => {
    const s = await venue(backend());
    const first = await s.owner.mutation(
      api.reservations.createManual,
      draft(s),
    );
    const second = await s.owner.mutation(
      api.reservations.createManual,
      draft(s, undefined, "15:00"),
    );
    await s.t.run(async (ctx) => {
      for (const r of [first, second]) {
        for (const a of await ctx.db
          .query("reservation_allocations")
          .withIndex("by_org_reservation", (q) =>
            q.eq("orgId", s.orgId).eq("reservationId", r._id),
          )
          .collect())
          await ctx.db.patch(a._id, { isActive: false });
        await ctx.db.patch(r._id, {
          schemaVersion: undefined,
          timeModel: undefined,
          revision: undefined,
          tableIds: undefined,
          startAt: r.startAt + 2 * 3600000,
          endAt: r.endAt + 2 * 3600000,
        });
      }
    });
    const inventory = await s.t.query(
      internal.reservationMigrations.inventory,
      { orgId: s.orgId },
    );
    expect(inventory).toHaveLength(2);
    const reviews = [first, second].map((r) => ({
      reservationId: r._id,
      expectedUpdatedAt: r.updatedAt,
      originalTimeModel: "wall_utc" as const,
      timezone: "Europe/Skopje",
      serviceDate: DATE,
      actualStartAt: r.startAt,
      tableIds: s.tableIds.slice(0, 2),
      disposition: "convert" as const,
    }));
    await expect(
      s.t.query(internal.reservationMigrations.dryRun, {
        orgId: s.orgId,
        reviews: reviews.slice(0, 1),
      }),
    ).rejects.toThrow("Legacy reservations require review");
    const dry = await s.t.query(internal.reservationMigrations.dryRun, {
      orgId: s.orgId,
      reviews,
    });
    expect(dry[0].actualStartAt).toBe(first.startAt);
    expect(await active(s)).toEqual([]);
    expect(
      (await s.t.run((ctx) => ctx.db.get(first._id)))!.schemaVersion,
    ).toBeUndefined();
    await s.t.mutation(internal.reservationMigrations.apply, {
      orgId: s.orgId,
      reviews,
      reason: "Reviewed original wall-clock timestamps against venue records",
    });
    const saved = await s.t.run((ctx) => ctx.db.get(first._id));
    expect(saved).toMatchObject({
      _id: first._id,
      schemaVersion: 2,
      timeModel: "utc",
      startAt: first.startAt,
      revision: 1,
    });
    expect(await active(s)).toHaveLength(4);
    await expect(
      s.t.mutation(internal.reservationMigrations.apply, {
        orgId: s.orgId,
        reviews,
        reason: "Reviewed original wall-clock timestamps against venue records",
      }),
    ).rejects.toThrow("changed");
  });

  it("rejects a conflicting legacy conversion without altering either record or its occupancy", async () => {
    const s = await venue(backend());
    const first = await s.owner.mutation(
      api.reservations.createManual,
      draft(s),
    );
    const second = await s.owner.mutation(
      api.reservations.createManual,
      draft(s, undefined, "15:00"),
    );
    await s.t.run(async (ctx) => {
      for (const a of await ctx.db
        .query("reservation_allocations")
        .withIndex("by_org_reservation", (q) =>
          q.eq("orgId", s.orgId).eq("reservationId", second._id),
        )
        .collect())
        await ctx.db.patch(a._id, { isActive: false });
      await ctx.db.patch(second._id, {
        schemaVersion: undefined,
        timeModel: undefined,
        revision: undefined,
        tableIds: undefined,
        startAt: first.startAt,
        endAt: first.endAt,
      });
    });
    const before = await active(s);
    const reviews = [
      {
        reservationId: second._id,
        expectedUpdatedAt: second.updatedAt,
        originalTimeModel: "utc" as const,
        timezone: "Europe/Skopje",
        serviceDate: DATE,
        actualStartAt: first.startAt,
        tableIds: s.tableIds.slice(0, 2),
        disposition: "convert" as const,
      },
    ];
    await expect(
      s.t.mutation(internal.reservationMigrations.apply, {
        orgId: s.orgId,
        reviews,
        reason: "Reviewed conflicting legacy visit",
      }),
    ).rejects.toThrow("conflict");
    expect(await active(s)).toEqual(before);
    expect(
      (await s.t.run((ctx) => ctx.db.get(second._id)))!.schemaVersion,
    ).toBeUndefined();
    await s.t.mutation(internal.reservationMigrations.apply, {
      orgId: s.orgId,
      reviews: [{ ...reviews[0], disposition: "cancelled" }],
      reason: "Venue explicitly cancelled duplicate legacy reservation",
    });
    expect((await s.t.run((ctx) => ctx.db.get(second._id)))!.status).toBe(
      "cancelled",
    );
    expect(
      (
        await s.owner.query(api.reservations.getSlots, {
          date: DATE,
          partySize: 2,
        })
      ).length,
    ).toBeGreaterThan(0);
  });
  it("carries outstanding seated and cleaning parties into the next local day without mixing future-day calendars", async () => {
    const s = await venue(backend());
    await s.t.run((ctx) =>
      ctx.db.patch(s.settingsId, {
        servicePeriods: [
          {
            name: "Night",
            startTime: "22:00",
            endTime: "04:00",
            endDayOffset: 1,
            daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
          },
        ],
      }),
    );
    let r = await s.owner.mutation(api.reservations.createManual, {
      ...draft(s),
      startAt: instant("23:30"),
    });
    vi.setSystemTime(instant("23:30"));
    r = await s.owner.mutation(api.reservations.change, {
      reservationId: r._id,
      expectedRevision: r.revision!,
      action: "seat",
    });
    vi.setSystemTime(instant("00:01", "2026-10-15"));
    expect(
      (
        await s.owner.query(api.reservations.listDay, { date: "2026-10-15" })
      ).map((r) => r._id),
    ).toContain(r._id);
    expect(
      await s.owner.query(api.reservations.listDay, { date: "2026-10-16" }),
    ).toEqual([]);
    r = await s.owner.mutation(api.reservations.change, {
      reservationId: r._id,
      expectedRevision: r.revision!,
      action: "complete",
    });
    expect(
      (await s.owner.query(api.reservations.listDay, { date: "2026-10-15" }))[0]
        .cleaningTables,
    ).toHaveLength(2);
    vi.setSystemTime(instant("00:16", "2026-10-15"));
    await s.owner.mutation(api.reservations.change, {
      reservationId: r._id,
      expectedRevision: r.revision!,
      action: "ready",
    });
    expect(
      await s.owner.query(api.reservations.listDay, { date: "2026-10-15" }),
    ).toEqual([]);
  });
  it("retains the saved cleaning buffer when venue settings shrink before a seated extension", async () => {
    const s = await venue(backend());
    let r = await s.owner.mutation(
      api.reservations.createManual,
      draft(s, undefined, "20:30"),
    );
    vi.setSystemTime(instant("20:30"));
    r = await s.owner.mutation(api.reservations.change, {
      reservationId: r._id,
      expectedRevision: r.revision!,
      action: "seat",
    });
    await s.t.run((ctx) => ctx.db.patch(s.settingsId, { bufferMins: 0 }));
    await expect(
      s.owner.mutation(api.reservations.change, {
        reservationId: r._id,
        expectedRevision: r.revision!,
        action: "duration",
        durationMins: 150,
      }),
    ).rejects.toThrow("service hours");
    expect((await s.t.run((ctx) => ctx.db.get(r._id)))!.bufferMins).toBe(15);
  });

  it("redacts guest snapshots on staff reads when the customer was deleted independently", async () => {
    const s = await venue(backend());
    const r = await s.owner.mutation(api.reservations.createManual, {
      ...draft(s),
      customerName: "Private Name",
      specialRequests: "Private allergy",
    });
    await s.t.run((ctx) =>
      ctx.db.patch(r.customerId, { isDeleted: true, deletedAt: Date.now() }),
    );
    const rows = await s.owner.query(api.reservations.listDay, { date: DATE });
    expect(rows[0]).toMatchObject({
      customerName: "Anonymised guest",
      guestErased: true,
      status: "confirmed",
    });
    expect(JSON.stringify(rows)).not.toMatch(/Private Name|Private allergy/);
    await s.owner.mutation(api.reservations.eraseGuest, {
      customerId: r.customerId,
    });
    expect((await s.t.run((ctx) => ctx.db.get(r._id)))!.guestName).toBe(
      "Anonymised guest",
    );
  });

  it("lets only the venue owner anonymize a guest while preserving visits, occupancy and other tenants", async () => {
    const t = backend();
    const s = await venue(t),
      other = await venue(t, "other-erasure");
    const r = await s.t.run(async (ctx) =>
      createReservation(
        ctx,
        (await ctx.db.get(s.orgId))!,
        {
          ...draft(s),
          customerName: "Erase Me",
          source: "web",
          customerEmail: "erase@example.com",
          verifiedEmail: "erase@example.com",
          specialRequests: "Private guest request",
          manageTokenHash: "privatehash",
          manageTokenCiphertext: "privatecipher",
          manageTokenExpiresAt: Date.now() + 86400000,
        },
        { type: "system" },
      ),
    );
    await s.owner.mutation(api.reservations.createManual, {
      ...draft(s, undefined, "15:00"),
      customerName: "Erase Me",
      customerEmail: "erase@example.com",
    });
    const foreign = await other.owner.mutation(api.reservations.createManual, {
      ...draft(other),
      customerName: "Keep Other Guest",
      customerEmail: "erase@example.com",
    });
    const before = await active(s);
    await expect(
      other.owner.mutation(api.reservations.eraseGuest, {
        customerId: r.customerId,
      }),
    ).rejects.toThrow("Guest not found");
    await s.t.run((ctx) => ctx.db.patch(s.staffId, { role: "manager" }));
    await expect(
      s.owner.mutation(api.reservations.eraseGuest, {
        customerId: r.customerId,
      }),
    ).rejects.toThrow("Unauthorised");
    await s.t.run(async (ctx) => {
      await ctx.db.patch(s.staffId, { role: "owner" });
      await ctx.db.insert("customer_notes", {
        orgId: s.orgId,
        customerId: r.customerId,
        authorStaffId: s.staffId,
        note: "Private note",
        isDeleted: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });
    expect(
      await s.owner.mutation(api.reservations.eraseGuest, {
        customerId: r.customerId,
      }),
    ).toEqual({ anonymizedReservations: 2 });
    expect(await active(s)).toEqual(before);
    const saved = await t.run((ctx) => ctx.db.get(r._id));
    expect(saved).toMatchObject({
      _id: r._id,
      status: "confirmed",
      revision: 1,
      guestName: "Anonymised guest",
    });
    expect(JSON.stringify(saved)).not.toMatch(
      /erase@example.com|Erase Me|Private guest request|privatehash|privatecipher|requestFingerprint|verifiedEmail/,
    );
    const customer = await t.run((ctx) => ctx.db.get(r.customerId));
    expect(customer).toMatchObject({
      name: "Anonymised guest",
      isDeleted: true,
    });
    expect(customer!.email).toBeUndefined();
    expect((await t.run((ctx) => ctx.db.get(foreign.customerId)))!.name).toBe(
      "Keep Other Guest",
    );
    const jobs = await t.run((ctx) =>
      ctx.db
        .query("notifications")
        .withIndex("by_org_customer", (q) =>
          q.eq("orgId", s.orgId).eq("customerId", r.customerId),
        )
        .collect(),
    );
    expect(jobs.length).toBeGreaterThan(0);
    expect(
      jobs.every(
        (job) => job.status === "cancelled" && job.templateData.redacted,
      ),
    ).toBe(true);
    expect(JSON.stringify(jobs)).not.toContain("erase@example.com");
    const day = await s.owner.query(api.reservations.listDay, { date: DATE });
    expect(day[0].guestErased).toBe(true);
    // Staff can still manage the physical reservation after personal data removal.
    vi.setSystemTime(instant("12:00"));
    expect(
      (
        await s.owner.mutation(api.reservations.change, {
          reservationId: r._id,
          expectedRevision: 1,
          action: "seat",
        })
      ).status,
    ).toBe("seated");
    expect(
      await s.owner.mutation(api.reservations.eraseGuest, {
        customerId: r.customerId,
      }),
    ).toEqual({ anonymizedReservations: 0 });
  });

  it("summarizes only the selected service date and separates cancellations and no-shows", async () => {
    const s = await venue(backend());
    const a = await s.owner.mutation(
      api.reservations.createManual,
      draft(s, undefined, "12:00"),
    );
    const b = await s.owner.mutation(
      api.reservations.createManual,
      draft(s, undefined, "15:00"),
    );
    const c = await s.owner.mutation(
      api.reservations.createManual,
      draft(s, undefined, "18:00"),
    );
    await s.owner.mutation(api.reservations.change, {
      reservationId: b._id,
      expectedRevision: 1,
      action: "cancel",
    });
    vi.setSystemTime(instant("18:15"));
    await s.owner.mutation(api.reservations.change, {
      reservationId: c._id,
      expectedRevision: 1,
      action: "no_show",
    });
    expect(
      await s.owner.query(api.reservations.getDaySummary, { date: DATE }),
    ).toEqual({
      reservations: 1,
      covers: a.partySize,
      cancellations: 1,
      noShows: 1,
    });
    expect(
      await s.owner.query(api.reservations.getDaySummary, {
        date: "2026-10-15",
      }),
    ).toEqual({ reservations: 0, covers: 0, cancellations: 0, noShows: 0 });
  });
});
