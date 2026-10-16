import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import type { FunctionArgs } from "convex/server";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import schema from "../../convex/schema";
import { convexModules } from "../../convex-test.setup";
import { localDateTimeInstants } from "../../convex/lib/reservationTime";

const backend = () => convexTest(schema, convexModules);
type Backend = ReturnType<typeof backend>;
type Input = FunctionArgs<typeof api.reservations.seatWalkIn>;
const DATE = "2026-10-14";
const instant = (time: string, date = DATE, occurrence = 0) =>
  localDateTimeInstants(date, time, "Europe/Skopje")[occurrence];
let sequence = 0;

async function venue(t: Backend, key = "owner") {
  const owner = t.withIdentity({
    subject: key,
    email: `${key}@example.test`,
    emailVerified: true,
  });
  await owner.mutation(api.users.ensureUser);
  const { orgId } = await owner.mutation(api.activation.startBeautyBusiness, {
    name: `${key} venue`,
    category: "hair_salon",
  });
  const profile = await owner.query(api.users.getMyProfile);
  const rows = await t.run(async (ctx) => {
    const now = Date.now();
    await ctx.db.patch(orgId, {
      industry: "hospitality",
      venueType: "restaurant",
      websiteStatus: "unpublished",
    });
    const settingsId = await ctx.db.insert("reservation_settings", {
      orgId,
      schemaVersion: 2,
      timezone: "Europe/Skopje",
      bookingWindowDays: 60,
      minAdvanceBookingHours: 24,
      minPartySize: 1,
      maxPartySize: 10,
      defaultDurationMins: 90,
      minDurationMins: 15,
      maxDurationMins: 240,
      bufferMins: 15,
      slotIntervalMins: 30,
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
      updatedAt: now,
    });
    const areaId = await ctx.db.insert("floor_plans", {
      orgId,
      name: "Main room",
      canvasWidth: 800,
      canvasHeight: 600,
      isActive: true,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });
    const tableIds: Id<"tables">[] = [];
    for (const label of ["A", "B", "C", "D"])
      tableIds.push(
        await ctx.db.insert("tables", {
          orgId,
          floorPlanId: areaId,
          label,
          capacity: 2,
          minCapacity: 1,
          x: tableIds.length * 120,
          y: 0,
          width: 100,
          height: 100,
          rotation: 0,
          shape: "rectangle",
          status: "available",
          isActive: true,
          sortOrder: tableIds.length,
          isDeleted: false,
          createdAt: now,
          updatedAt: now,
        }),
      );
    const comboIds: Id<"table_combinations">[] = [];
    for (const members of [tableIds.slice(0, 2), tableIds.slice(1, 3)])
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
          createdAt: now,
          updatedAt: now,
        }),
      );
    return { settingsId, areaId, tableIds, comboIds };
  });
  return { t, owner, orgId, staffId: profile!.staffId!, ...rows };
}
type Venue = Awaited<ReturnType<typeof venue>>;
function input(s: Venue, patch: Partial<Input> = {}): Input {
  return {
    requestId: `walk-in-${++sequence}`,
    tableIds: [s.tableIds[0]],
    partySize: 2,
    ...patch,
  };
}
const seat = (s: Venue, args = input(s)) =>
  s.owner.mutation(api.reservations.seatWalkIn, args);
const options = (
  s: Venue,
  args: Partial<FunctionArgs<typeof api.reservations.getWalkInOptions>> = {},
) =>
  s.owner.query(api.reservations.getWalkInOptions, {
    tableId: s.tableIds[0],
    partySize: 2,
    ...args,
  });
const settings = (s: Venue, patch: Partial<Doc<"reservation_settings">>) =>
  s.t.run((ctx) => ctx.db.patch(s.settingsId, patch));
async function rows(s: Venue) {
  return s.t.run(async (ctx) => ({
    reservations: await ctx.db
      .query("reservations")
      .withIndex("by_org", (q) => q.eq("orgId", s.orgId))
      .collect(),
    allocations: await ctx.db
      .query("reservation_allocations")
      .withIndex("by_org_active", (q) =>
        q.eq("orgId", s.orgId).eq("isActive", true),
      )
      .collect(),
    customers: await ctx.db
      .query("customers")
      .withIndex("by_org", (q) => q.eq("orgId", s.orgId))
      .collect(),
    audits: (
      await ctx.db
        .query("audit_log")
        .withIndex("by_org", (q) => q.eq("orgId", s.orgId))
        .collect()
    ).filter((row) => row.action.startsWith("reservation.")),
  }));
}
const change = (
  s: Venue,
  r: { _id: Id<"reservations">; revision?: number },
  action: "complete" | "ready" | "move" | "duration",
  rest: Partial<FunctionArgs<typeof api.reservations.change>> = {},
) =>
  s.owner.mutation(api.reservations.change, {
    reservationId: r._id,
    expectedRevision: r.revision!,
    action,
    ...rest,
  });

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(instant("12:07") + 43_219);
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe("atomic walk-in seating at server time", () => {
  it("seats at the exact server instant off-grid, using only the clicked table or an explicit combination", async () => {
    const s = await venue(backend());
    const now = Date.now();
    const physicalTable = await s.t.run((ctx) => ctx.db.get(s.tableIds[0]));
    const area = await s.t.run((ctx) => ctx.db.get(s.areaId));
    const offer = await options(s, { refreshKey: instant("22:00") });
    expect(offer).toMatchObject({
      asOf: now,
      startAt: now,
      endAt: now + 90 * 60_000,
      serviceDate: DATE,
      timezone: "Europe/Skopje",
    });
    expect(offer.options.map((o) => o.tableIds)).toEqual([[s.tableIds[0]]]);
    const combinations = await options(s, {
      tableId: s.tableIds[1],
      partySize: 4,
    });
    expect(combinations.options.map((o) => o.combinationId).sort()).toEqual(
      [...s.comboIds].sort(),
    );
    const visit = await seat(s);
    expect(visit).toMatchObject({
      source: "walk_in",
      status: "seated",
      revision: 1,
      arrivedAt: now,
      seatedAt: now,
      startAt: now,
      endAt: now + 90 * 60_000,
      bufferMins: 15,
      guestName: "Walk-in guest",
    });
    const state = await rows(s);
    expect(state.allocations).toMatchObject([
      {
        tableId: s.tableIds[0],
        startAt: now,
        endAt: visit.endAt + 15 * 60_000,
        requiresRelease: true,
        kind: "occupancy",
        revision: 1,
      },
    ]);
    expect(state.audits).toMatchObject([
      {
        action: "reservation.created",
        actorId: s.staffId,
        after: { status: "seated", arrivedAt: now, seatedAt: now },
      },
    ]);
    expect(await s.t.run((ctx) => ctx.db.get(s.tableIds[0]))).toEqual({
      ...physicalTable,
      status: "occupied",
      updatedAt: now,
    });
    expect(await s.t.run((ctx) => ctx.db.get(s.areaId))).toEqual(area);
    expect((await options(s)).options).toEqual([]);
  });

  it("rechecks a displayed choice at mutation time and never accepts a caller time/date", async () => {
    const s = await venue(backend());
    expect((await options(s)).options).toHaveLength(1);
    vi.setSystemTime(instant("22:30"));
    await expect(seat(s)).rejects.toThrow("not enough service time");
    expect((await rows(s)).reservations).toEqual([]);
    vi.setSystemTime(instant("12:00"));
    await expect(
      s.owner.mutation(api.reservations.seatWalkIn, {
        ...input(s),
        startAt: instant("13:00"),
      } as Input),
    ).rejects.toThrow();
    expect((await rows(s)).reservations).toEqual([]);
  });

  it("retries exactly once across changed clock/settings and terminal status without reviving a visit", async () => {
    const s = await venue(backend());
    const args = input(s);
    const pair = await Promise.all([seat(s, args), seat(s, args)]);
    expect(pair[0]._id).toBe(pair[1]._id);
    const completed = await change(s, pair[0], "complete");
    await settings(s, { walkInsAccepted: false, schemaVersion: undefined });
    vi.setSystemTime(instant("23:59", "2026-11-01"));
    expect(await seat(s, args)).toEqual(completed);
    await expect(seat(s, { ...args, partySize: 3 })).rejects.toThrow(
      "already been used",
    );
    const state = await rows(s);
    expect(state.reservations).toHaveLength(1);
    expect(state.customers).toHaveLength(1);
    expect(
      state.audits.filter((a) => a.action === "reservation.created"),
    ).toHaveLength(1);
  });

  it("races overlapping explicit combinations atomically without orphan guests or inferred joins", async () => {
    const s = await venue(backend());
    for (const tableIds of [
      [s.tableIds[0], s.tableIds[2]],
      s.tableIds.slice(0, 3),
      [s.tableIds[0], s.tableIds[0]],
    ])
      await expect(
        seat(s, input(s, { tableIds, partySize: 4 })),
      ).rejects.toThrow();
    expect((await rows(s)).customers).toEqual([]);
    const results = await Promise.allSettled([
      seat(s, input(s, { tableIds: s.tableIds.slice(0, 2), partySize: 4 })),
      seat(s, input(s, { tableIds: s.tableIds.slice(1, 3), partySize: 4 })),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const state = await rows(s);
    expect(state.reservations).toHaveLength(1);
    expect(state.customers).toHaveLength(1);
    expect(state.allocations).toHaveLength(2);
    expect(
      (await options(s, { tableId: s.tableIds[1], partySize: 4 })).options,
    ).toEqual([]);
  });

  it("normalizes retry details and table order but rejects changed request meaning", async () => {
    const s = await venue(backend());
    const args = input(s, {
      tableIds: s.tableIds.slice(0, 2),
      partySize: 4,
      customerName: "  Walk-in party  ",
      customerPhone: "+389 70 111 222",
      specialRequests: "  Window please  ",
    });
    const visit = await seat(s, args);
    expect(
      await seat(s, {
        ...args,
        tableIds: [...args.tableIds].reverse(),
        customerName: "Walk-in party",
        customerPhone: "+38970111222",
        specialRequests: "Window please",
      }),
    ).toEqual(visit);
    for (const patch of [
      { durationMins: 90 },
      { customerName: "Different party" },
      { specialRequests: "Terrace please" },
      { tableIds: s.tableIds.slice(1, 3) },
    ])
      await expect(seat(s, { ...args, ...patch })).rejects.toThrow(
        "already been used",
      );
    expect((await rows(s)).reservations).toHaveLength(1);
  });

  it("honors future reservations including the reset buffer and rechecks later closures", async () => {
    const s = await venue(backend());
    await s.owner.mutation(api.reservations.createManual, {
      requestId: "future-party",
      serviceDate: DATE,
      startAt: instant("14:00"),
      partySize: 2,
      customerName: "Future guest",
      source: "manual",
      tableIds: [s.tableIds[0]],
    });
    vi.setSystemTime(instant("12:15"));
    expect((await options(s)).options).toHaveLength(1); // end+buffer exactly 14:00.
    vi.setSystemTime(instant("12:15") + 1);
    expect((await options(s)).options).toEqual([]);
    await expect(seat(s)).rejects.toThrow("no longer available");
    await s.t.run((ctx) =>
      ctx.db.insert("reservation_closures", {
        orgId: s.orgId,
        tableIds: [s.tableIds[2]],
        startAt: Date.now() + 30 * 60_000,
        endAt: Date.now() + 60 * 60_000,
        reason: "Maintenance",
        isDeleted: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );
    expect(
      (await options(s, { tableId: s.tableIds[1], partySize: 4 })).options,
    ).toEqual([]);
    expect((await rows(s)).reservations).toHaveLength(1);
  });

  it("keeps overdue occupancy and elapsed cleaning blocked until explicit release", async () => {
    const s = await venue(backend());
    let visit = await seat(s);
    vi.setSystemTime(visit.endAt + 60_000);
    expect((await options(s)).options).toEqual([]);
    visit = await change(s, visit, "complete");
    vi.setSystemTime(Date.now() + 16 * 60_000);
    expect((await options(s)).options).toEqual([]);
    visit = await change(s, visit, "ready");
    expect((await options(s)).options).toHaveLength(1);
    const next = await seat(s);
    expect(next.customerId).not.toBe(visit.customerId); // Anonymous parties never share a made-up identity.
  });

  it("fails closed on disabled, inactive, malformed, and legacy allocation states", async () => {
    const s = await venue(backend());
    await settings(s, { walkInsAccepted: false });
    expect((await options(s)).reason).toContain("not enabled");
    await expect(seat(s)).rejects.toThrow("not enabled");
    await settings(s, { walkInsAccepted: true });
    await s.t.run((ctx) => ctx.db.patch(s.areaId, { isActive: false }));
    expect((await options(s)).options).toEqual([]);
    await expect(seat(s)).rejects.toThrow("no longer available");
    await s.t.run(async (ctx) => {
      await ctx.db.patch(s.areaId, { isActive: true });
      await ctx.db.patch(s.tableIds[0], { status: "cleaning" });
    });
    expect((await options(s)).options).toEqual([]);
    await s.t.run((ctx) =>
      ctx.db.patch(s.tableIds[0], { status: "available", isActive: false }),
    );
    expect((await options(s)).options).toEqual([]);
    await s.t.run((ctx) => ctx.db.patch(s.tableIds[0], { isActive: true }));
    const visit = await seat(s);
    await s.t.run((ctx) =>
      ctx.db.patch(visit._id, {
        schemaVersion: undefined,
        timeModel: undefined,
      }),
    );
    expect((await options(s, { tableId: s.tableIds[3] })).reason).toContain(
      "Legacy reservations",
    );
    await expect(
      seat(s, input(s, { tableIds: [s.tableIds[3]] })),
    ).rejects.toThrow("Legacy reservations");
    await settings(s, { schemaVersion: undefined });
    expect((await options(s)).reason).toContain("setup is incomplete");
  });

  it("enforces party/duration/contact bounds without writing guests", async () => {
    const s = await venue(backend());
    for (const partySize of [0, 11, 1.5, NaN]) {
      expect((await options(s, { partySize })).options).toEqual([]);
      await expect(seat(s, input(s, { partySize }))).rejects.toThrow();
    }
    for (const durationMins of [0, 241, 1.5, Infinity]) {
      expect((await options(s, { durationMins })).options).toEqual([]);
      await expect(seat(s, input(s, { durationMins }))).rejects.toThrow();
    }
    for (const patch of [
      { customerName: "X" },
      { customerName: "x".repeat(121) },
      { customerPhone: "not a phone" },
      { specialRequests: "x".repeat(2001) },
      { requestId: "short" },
    ])
      await expect(seat(s, input(s, patch))).rejects.toThrow();
    expect((await rows(s)).customers).toEqual([]);
  });

  it("derives staff roles and tenant access while preserving the beauty boundary", async () => {
    const t = backend();
    const s = await venue(t);
    const other = await venue(t, "other");
    await expect(
      t.query(api.reservations.getWalkInOptions, {
        tableId: s.tableIds[0],
        partySize: 2,
      }),
    ).rejects.toThrow("Unauthenticated");
    await expect(
      t.mutation(api.reservations.seatWalkIn, input(s)),
    ).rejects.toThrow("Unauthenticated");
    await expect(options(s, { tableId: other.tableIds[0] })).rejects.toThrow(
      "Table unavailable",
    );
    await expect(
      seat(s, input(s, { tableIds: [other.tableIds[0]] })),
    ).rejects.toThrow("no longer available");
    for (const role of ["owner", "manager", "staff"] as const) {
      await t.run((ctx) =>
        ctx.db.patch(s.staffId, { role, bookingAccess: "own" }),
      );
      expect((await options(s)).options).toHaveLength(1);
    }
    const visit = await seat(s); // Personal beauty-booking access does not prevent venue host operations.
    await t.run((ctx) => ctx.db.patch(s.staffId, { isActive: false }));
    await expect(
      s.owner.query(api.reservations.get, { reservationId: visit._id }),
    ).rejects.toThrow("Unauthorised");
    await expect(seat(s)).rejects.toThrow("Unauthorised");
    await t.run(async (ctx) => {
      await ctx.db.patch(s.staffId, { isActive: true });
      await ctx.db.patch(s.orgId, { industry: "beauty_wellness" });
    });
    await expect(options(s)).rejects.toThrow("unavailable");
    await expect(seat(s)).rejects.toThrow("unavailable");
  });

  it("uses the previous operating date overnight and honors off-grid last seating exactly", async () => {
    const s = await venue(backend());
    await settings(s, {
      servicePeriods: [
        {
          name: "Evening",
          startTime: "18:00",
          endTime: "02:00",
          endDayOffset: 1,
          lastSeatingTime: "00:00",
          daysOfWeek: [3],
        },
      ],
    });
    vi.setSystemTime(instant("00:00", "2026-10-15"));
    expect(await options(s)).toMatchObject({
      serviceDate: DATE,
      startAt: Date.now(),
      endAt: Date.now() + 90 * 60_000,
    });
    const visit = await seat(s);
    expect(visit.serviceDate).toBe(DATE);
    vi.setSystemTime(Date.now() + 1);
    expect((await options(s, { tableId: s.tableIds[3] })).options).toEqual([]);
    await expect(
      seat(s, input(s, { tableIds: [s.tableIds[3]] })),
    ).rejects.toThrow("not enough service time");
  });

  it("handles both repeated DST hours with actual elapsed duration and off-grid move/extension", async () => {
    const s = await venue(backend());
    await settings(s, {
      servicePeriods: [
        {
          name: "Overnight",
          startTime: "00:00",
          endTime: "05:00",
          daysOfWeek: [0],
        },
      ],
    });
    const repeated = localDateTimeInstants(
      "2026-10-25",
      "02:10",
      "Europe/Skopje",
    );
    expect(repeated).toHaveLength(2);
    for (const start of repeated) {
      vi.setSystemTime(start + 13_219);
      expect((await options(s)).startAt).toBe(start + 13_219);
    }
    let visit = await seat(s);
    expect(visit.endAt - visit.startAt).toBe(90 * 60_000);
    const choices = await s.owner.query(api.reservations.getMoveOptions, {
      reservationId: visit._id,
      durationMins: 120,
    });
    expect(choices.some((o) => o.tableIds.includes(s.tableIds[3]))).toBe(true);
    visit = await change(s, visit, "move", {
      tableIds: [s.tableIds[3]],
      durationMins: 120,
    });
    expect(visit.startAt).toBe(repeated[1] + 13_219);
    expect(visit.endAt - visit.startAt).toBe(120 * 60_000);
    expect((await s.t.run((ctx) => ctx.db.get(s.tableIds[0])))?.status).toBe(
      "cleaning",
    );
    visit = await change(s, visit, "duration", { durationMins: 135 });
    expect(visit.endAt - visit.startAt).toBe(135 * 60_000);
  });

  it("does not reinterpret missing DST opening/closing boundaries or first-fold times after last seating", async () => {
    const s = await venue(backend());
    vi.setSystemTime(instant("03:05", "2026-03-29"));
    await settings(s, {
      defaultDurationMins: 30,
      servicePeriods: [
        {
          name: "Opening gap",
          startTime: "02:30",
          endTime: "05:00",
          daysOfWeek: [0],
        },
      ],
    });
    expect((await options(s)).options).toEqual([]);
    vi.setSystemTime(instant("01:15", "2026-03-29"));
    await settings(s, {
      servicePeriods: [
        {
          name: "Closing gap",
          startTime: "00:00",
          endTime: "02:30",
          daysOfWeek: [0],
        },
      ],
    });
    expect((await options(s)).options).toEqual([]);
    await settings(s, {
      servicePeriods: [
        {
          name: "Fall service",
          startTime: "00:00",
          endTime: "05:00",
          lastSeatingTime: "02:30",
          daysOfWeek: [0],
        },
      ],
    });
    vi.setSystemTime(instant("02:45", "2026-10-25", 0));
    expect((await options(s)).options).toEqual([]);
    vi.setSystemTime(instant("02:15", "2026-10-25", 1));
    expect((await options(s)).options).toHaveLength(1);
  });

  it("counts actual elapsed dining and reset time across the spring-forward jump", async () => {
    const s = await venue(backend());
    await settings(s, {
      servicePeriods: [
        {
          name: "Early service",
          startTime: "00:00",
          endTime: "05:00",
          daysOfWeek: [0],
        },
      ],
    });
    vi.setSystemTime(instant("01:45", "2026-03-29") + 12_345);
    const offered = await options(s);
    expect(offered.options).toHaveLength(1);
    const visit = await seat(s);
    expect(visit.startAt).toBe(Date.now());
    expect(visit.endAt).toBe(instant("04:15", "2026-03-29") + 12_345);
    expect((await rows(s)).allocations[0].endAt).toBe(
      instant("04:30", "2026-03-29") + 12_345,
    );
  });

  it("never treats reused phone contact as verified or sends a guest email", async () => {
    const s = await venue(backend());
    const customerId = await s.t.run((ctx) =>
      ctx.db.insert("customers", {
        orgId: s.orgId,
        name: "Private CRM name",
        email: "private@example.test",
        phone: "+38970111222",
        totalVisits: 0,
        totalSpendMinorUnits: 0,
        noShowCount: 0,
        noShowRiskScore: 0,
        whatsappOptIn: false,
        marketingOptIn: false,
        isDeleted: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );
    const visit = await seat(
      s,
      input(s, {
        customerName: "Walk-in name",
        customerPhone: "+389 70 111 222",
      }),
    );
    expect(visit.customerId).toBe(customerId);
    expect(visit.guestName).toBe("Walk-in name");
    await s.t.run(async (ctx) => {
      expect((await ctx.db.get(customerId))?.name).toBe("Private CRM name");
      expect((await ctx.db.get(visit._id))?.verifiedEmail).toBeUndefined();
      const notifications = await ctx.db
        .query("notifications")
        .withIndex("by_org", (q) => q.eq("orgId", s.orgId))
        .collect();
      expect(
        notifications.filter((n) => n.type !== "staff_reservation"),
      ).toEqual([]);
    });
  });
});

describe("single staff reservation projection", () => {
  it("matches day rows, redacts deleted guests and tokens, and remains readable with legacy/missing setup", async () => {
    const s = await venue(backend());
    let visit = await seat(
      s,
      input(s, {
        customerName: "Visit name",
        specialRequests: "Private request",
      }),
    );
    visit = await change(s, visit, "complete");
    await s.t.run((ctx) =>
      ctx.db.patch(visit._id, {
        verifiedEmail: "private@example.test",
        manageTokenHash: "private-hash",
        manageTokenCiphertext: "private-cipher",
        requestFingerprint: "private-fingerprint",
      }),
    );
    const single = await s.owner.query(api.reservations.get, {
      reservationId: visit._id,
    });
    const day = await s.owner.query(api.reservations.listDay, { date: DATE });
    expect(single).toEqual(day[0]);
    expect(single.cleaningTables.map((t) => t.label)).toEqual(["A"]);
    expect(JSON.stringify(single)).not.toMatch(
      /private-hash|private-cipher|private-fingerprint|private@example/,
    );
    await s.t.run(async (ctx) => {
      await ctx.db.patch(visit.customerId, {
        isDeleted: true,
        deletedAt: Date.now(),
      });
      await ctx.db.patch(visit._id, {
        schemaVersion: undefined,
        timeModel: undefined,
      });
    });
    await settings(s, { schemaVersion: undefined });
    const erased = await s.owner.query(api.reservations.get, {
      reservationId: visit._id,
    });
    expect(erased.guestErased).toBe(true);
    expect(erased.customerName).toBe("Anonymised guest");
    expect(JSON.stringify(erased)).not.toMatch(/Visit name|Private request/);
  });

  it("rejects foreign/deleted reservations and never resolves a foreign cleaning table label", async () => {
    const t = backend();
    const s = await venue(t);
    const other = await venue(t, "other");
    let visit = await seat(s);
    visit = await change(s, visit, "complete");
    await expect(
      other.owner.query(api.reservations.get, { reservationId: visit._id }),
    ).rejects.toThrow("Reservation not found");
    await t.run(async (ctx) => {
      await ctx.db.patch(other.tableIds[0], { label: "Foreign private label" });
      const allocation = (
        await ctx.db
          .query("reservation_allocations")
          .withIndex("by_org_active", (q) =>
            q.eq("orgId", s.orgId).eq("isActive", true),
          )
          .collect()
      )[0];
      await ctx.db.patch(allocation._id, { tableId: other.tableIds[0] });
    });
    const result = await s.owner.query(api.reservations.get, {
      reservationId: visit._id,
    });
    expect(result.cleaningTables[0].label).toBe("Table");
    await t.run((ctx) =>
      ctx.db.patch(visit._id, { isDeleted: true, deletedAt: Date.now() }),
    );
    await expect(
      s.owner.query(api.reservations.get, { reservationId: visit._id }),
    ).rejects.toThrow("Reservation not found");
  });
});
