import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import schema from "../../convex/schema";
import { convexModules } from "../../convex-test.setup";
import { localDateTimeInstants } from "../../convex/lib/reservationTime";

const backend = () => convexTest(schema, convexModules);
type Backend = ReturnType<typeof backend>;
const DATE = "2026-10-14";
const instant = (time: string, date = DATE) =>
  localDateTimeInstants(date, time, "Europe/Skopje")[0];
let sequence = 0;

async function venue(t: Backend, key = "owner", withSettings = true) {
  const owner = t.withIdentity({
    subject: key,
    email: `${key}@example.test`,
    emailVerified: true,
  });
  const userId = await owner.mutation(api.users.ensureUser);
  const { orgId } = await owner.mutation(api.activation.startBeautyBusiness, {
    name: `${key} venue`,
    category: "hair_salon",
  });
  const profile = await owner.query(api.users.getMyProfile);
  const resources = await t.run(async (ctx) => {
    await ctx.db.patch(orgId, {
      industry: "hospitality",
      venueType: "restaurant",
      websiteStatus: "unpublished",
    });
    const settingsId = withSettings
      ? await ctx.db.insert("reservation_settings", {
          orgId,
          schemaVersion: 2,
          timezone: "Europe/Skopje",
          bookingWindowDays: 60,
          minAdvanceBookingHours: 0,
          minPartySize: 1,
          maxPartySize: 8,
          defaultDurationMins: 90,
          minDurationMins: 30,
          maxDurationMins: 240,
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
          reminderHoursBefore: [],
          updatedAt: Date.now(),
        })
      : null;
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
    for (const members of [tableIds.slice(0, 2), tableIds.slice(1)])
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
      });
    return { settingsId, areaId, tableIds };
  });
  return { t, owner, userId, orgId, staffId: profile!.staffId!, ...resources };
}
type Venue = Awaited<ReturnType<typeof venue>>;

function reserve(
  s: Venue,
  {
    tableIds = s.tableIds.slice(0, 2),
    time = "12:00",
    date = DATE,
    name = "Visit guest",
  }: {
    tableIds?: Id<"tables">[];
    time?: string;
    date?: string;
    name?: string;
  } = {},
) {
  return s.owner.mutation(api.reservations.createManual, {
    requestId: `floor-request-${++sequence}`,
    serviceDate: date,
    startAt: instant(time, date),
    partySize: tableIds.length * 2,
    customerName: name,
    source: "manual",
    tableIds,
  });
}

function change(
  s: Venue,
  reservation: { _id: Id<"reservations">; revision?: number },
  action: "arrive" | "seat" | "complete" | "ready" | "move",
  tableIds?: Id<"tables">[],
) {
  return s.owner.mutation(api.reservations.change, {
    reservationId: reservation._id,
    expectedRevision: reservation.revision!,
    action,
    ...(tableIds ? { tableIds } : {}),
  });
}

const floor = (s: Venue, refreshKey?: number) =>
  s.owner.query(api.hospitality.getLiveTables, { refreshKey });

async function allocations(s: Venue, reservationId: Id<"reservations">) {
  return s.t.run((ctx) =>
    ctx.db
      .query("reservation_allocations")
      .withIndex("by_org_reservation_active", (q) =>
        q
          .eq("orgId", s.orgId)
          .eq("reservationId", reservationId)
          .eq("isActive", true),
      )
      .collect(),
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(instant("08:00"));
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

const list = (s: Venue, date = DATE, refreshKey?: number) =>
  s.owner.query(api.reservations.listDay, { date, refreshKey });
const get = (
  s: Venue,
  reservationId: Id<"reservations">,
  refreshKey?: number,
) => s.owner.query(api.reservations.get, { reservationId, refreshKey });

describe("staff reservation attention projection", () => {
  it("agrees across list, details and floor when stored arrival grace is missing", async () => {
    const s = await venue(backend());
    const visit = await reserve(s);
    await s.t.run((ctx) =>
      ctx.db.patch(s.settingsId!, { noShowGraceMins: undefined }),
    );
    vi.setSystemTime(instant("12:05"));
    expect((await list(s))[0].attention.timing).toBeNull();
    expect((await get(s, visit._id)).attention.timing).toBeNull();
    expect((await floor(s)).tables[0].late).toBe(false);
    vi.setSystemTime(instant("12:15"));
    const expected = { kind: "late_arrival", minutes: 15 };
    expect((await list(s))[0].attention.timing).toEqual(expected);
    expect((await get(s, visit._id)).attention.timing).toEqual(expected);
    expect((await floor(s)).tables[0].late).toBe(true);
  });

  it("uses the server clock once per response and matches the floor at the exact grace boundary", async () => {
    const s = await venue(backend());
    const visit = await reserve(s);
    await reserve(s, { tableIds: [s.tableIds[2]] });
    vi.setSystemTime(instant("12:15") - 1);
    const before = await list(s, DATE, Number.MAX_SAFE_INTEGER);
    expect(before.every((row) => row.attention.asOf === Date.now())).toBe(true);
    expect(before.every((row) => row.attention.timing === null)).toBe(true);
    expect((await floor(s)).tables[0].late).toBe(false);

    vi.setSystemTime(instant("12:15"));
    const row = await get(s, visit._id, 0);
    expect(row.attention).toEqual({
      asOf: Date.now(),
      timing: { kind: "late_arrival", minutes: 15 },
      cleaning: [],
    });
    expect((await list(s, DATE, -1))[0].attention).toEqual(row.attention);
    expect((await floor(s)).tables[0].late).toBe(true);

    // Epoch zero is an arrival, not an absent timestamp.
    await s.t.run((ctx) => ctx.db.patch(visit._id, { arrivedAt: 0 }));
    expect((await get(s, visit._id)).attention.timing).toBeNull();
    expect((await floor(s)).tables[0].late).toBe(false);
  });

  it("updates indicators when staff arrive, seat and finish a visit without automatically changing its status", async () => {
    const s = await venue(backend());
    let visit = await reserve(s);
    vi.setSystemTime(instant("12:15"));
    visit = await change(s, visit, "arrive");
    expect((await get(s, visit._id)).attention.timing).toBeNull();
    visit = await change(s, visit, "seat");
    vi.setSystemTime(visit.endAt - 15 * 60_000 - 1);
    expect((await get(s, visit._id)).attention.timing).toBeNull();
    vi.setSystemTime(visit.endAt - 15 * 60_000);
    expect((await get(s, visit._id)).attention.timing).toEqual({
      kind: "ending_soon",
      minutes: 15,
    });
    vi.setSystemTime(visit.endAt);
    expect((await get(s, visit._id)).attention.timing).toEqual({
      kind: "overdue",
      minutes: 0,
    });
    expect((await floor(s)).tables[0].overdue).toBe(true);
    expect((await s.t.run((ctx) => ctx.db.get(visit._id)))?.status).toBe(
      "seated",
    );
    visit = await change(s, visit, "complete");
    const completed = await get(s, visit._id);
    expect(completed.attention.timing).toBeNull();
    expect(completed.attention.cleaning).toHaveLength(2);
  });

  it("keeps each combined table waiting for cleaning after its buffer until staff explicitly release it", async () => {
    const s = await venue(backend());
    let visit = await reserve(s);
    vi.setSystemTime(instant("12:00"));
    visit = await change(s, visit, "seat");
    visit = await change(s, visit, "complete");
    let row = await get(s, visit._id);
    expect(row.attention.cleaning).toEqual([
      {
        tableId: s.tableIds[0],
        label: "A",
        readyAt: instant("12:15"),
        canRelease: false,
        minutesUntilReady: 15,
      },
      {
        tableId: s.tableIds[1],
        label: "B",
        readyAt: instant("12:15"),
        canRelease: false,
        minutesUntilReady: 15,
      },
    ]);
    vi.setSystemTime(instant("12:15") - 1);
    expect((await get(s, visit._id)).attention.cleaning[0]).toMatchObject({
      canRelease: false,
      minutesUntilReady: 1,
    });
    vi.setSystemTime(instant("12:15"));
    row = await get(s, visit._id);
    expect(row.attention.cleaning.every((table) => table.canRelease)).toBe(
      true,
    );
    expect(
      row.attention.cleaning.every((table) => table.minutesUntilReady === 0),
    ).toBe(true);
    expect(await allocations(s, visit._id)).toHaveLength(2);
    visit = await change(s, visit, "ready", [s.tableIds[0]]);
    row = await get(s, visit._id);
    expect(row.attention.cleaning.map((table) => table.label)).toEqual(["B"]);
    expect(row.cleaningTableIds).toEqual([s.tableIds[1]]);
    await change(s, visit, "ready", [s.tableIds[1]]);
    expect((await get(s, visit._id)).attention.cleaning).toEqual([]);
  });

  it("shows a vacated table's cleaning hold while its party remains seated elsewhere", async () => {
    const s = await venue(backend());
    let visit = await reserve(s);
    vi.setSystemTime(instant("12:00"));
    visit = await change(s, visit, "seat");
    visit = await change(s, visit, "move", s.tableIds.slice(1));
    expect((await get(s, visit._id)).attention.cleaning).toEqual([
      {
        tableId: s.tableIds[0],
        label: "A",
        readyAt: instant("12:15"),
        canRelease: false,
        minutesUntilReady: 15,
      },
    ]);
    vi.setSystemTime(visit.endAt - 5 * 60_000);
    const row = await get(s, visit._id);
    expect(row.status).toBe("seated");
    expect(row.attention.timing).toEqual({ kind: "ending_soon", minutes: 5 });
    expect(row.attention.cleaning[0].canRelease).toBe(true);
    await change(s, visit, "ready", [s.tableIds[0]]);
    expect((await get(s, visit._id)).attention.cleaning).toEqual([]);
    expect(
      (await floor(s)).tables
        .slice(1)
        .every((table) => table.status === "occupied"),
    ).toBe(true);
  });

  it("carries previous service date occupancy and cleaning into today's attention list", async () => {
    const s = await venue(backend());
    let visit = await reserve(s);
    vi.setSystemTime(instant("12:00"));
    visit = await change(s, visit, "seat");
    vi.setSystemTime(instant("00:05", "2026-10-15"));
    let rows = await list(s, "2026-10-15");
    expect(rows).toHaveLength(1);
    expect(rows[0].serviceDate).toBe(DATE);
    expect(rows[0].attention.timing).toEqual({ kind: "overdue", minutes: 635 });
    visit = await change(s, visit, "complete");
    vi.setSystemTime(instant("00:20", "2026-10-15"));
    rows = await list(s, "2026-10-15");
    expect(rows[0].attention.timing).toBeNull();
    expect(rows[0].attention.cleaning).toHaveLength(2);
    expect(rows[0].attention.cleaning.every((table) => table.canRelease)).toBe(
      true,
    );
    await change(s, visit, "ready");
    expect(await list(s, "2026-10-15")).toEqual([]);
  });

  it("keeps legacy and terminal visits readable without guessing their timing", async () => {
    const s = await venue(backend());
    const visit = await reserve(s);
    vi.setSystemTime(instant("20:00"));
    for (const patch of [
      { schemaVersion: undefined },
      { schemaVersion: 2 as const, timeModel: undefined },
      {
        schemaVersion: 2 as const,
        timeModel: "utc" as const,
        status: "completed" as const,
      },
      { status: "cancelled" as const },
      { status: "no_show" as const },
    ]) {
      await s.t.run((ctx) => ctx.db.patch(visit._id, patch));
      expect((await get(s, visit._id)).attention.timing).toBeNull();
      expect((await list(s))[0].attention.timing).toBeNull();
    }
    await s.t.run((ctx) => ctx.db.patch(visit._id, { isDeleted: true }));
    expect(await list(s)).toEqual([]);
    await expect(get(s, visit._id)).rejects.toThrow("not found");
  });

  it("preserves private-field redaction while showing attention for an anonymised occupied visit", async () => {
    const s = await venue(backend());
    let visit = await reserve(s, { name: "Private guest name" });
    vi.setSystemTime(instant("12:00"));
    visit = await change(s, visit, "seat");
    await s.t.run(async (ctx) => {
      await ctx.db.patch(visit.customerId, { isDeleted: true });
      await ctx.db.patch(visit._id, {
        guestContact: { phone: "+38970123456", email: "private@example.test" },
        manageTokenHash: "private-proof-hash",
        verifiedEmail: "private@example.test",
        specialRequests: "Private dietary request",
      });
    });
    vi.setSystemTime(visit.endAt + 5 * 60_000);
    for (const row of [await get(s, visit._id), ...(await list(s))]) {
      expect(row.attention.timing).toEqual({ kind: "overdue", minutes: 5 });
      expect(row.customerName).toBe("Anonymised guest");
      expect(JSON.stringify(row)).not.toMatch(
        /Private|private@|38970123456|private-proof|guestContact/,
      );
    }
  });

  it("allows each active venue role and rejects unauthenticated, foreign and revoked reads", async () => {
    const t = backend();
    const s = await venue(t);
    const other = await venue(t, "other");
    const visit = await reserve(s, { name: "Own private guest" });
    await reserve(other, { name: "Foreign private guest" });
    for (const role of ["staff", "manager", "owner"] as const) {
      await t.run((ctx) =>
        ctx.db.patch(s.staffId, { role, bookingAccess: "own" }),
      );
      expect(await get(s, visit._id)).toMatchObject({
        customerName: "Own private guest",
      });
      expect(JSON.stringify(await list(s))).not.toContain(
        "Foreign private guest",
      );
    }
    await expect(
      t.query(api.reservations.listDay, { date: DATE }),
    ).rejects.toThrow("Unauthenticated");
    await expect(
      t.query(api.reservations.get, { reservationId: visit._id }),
    ).rejects.toThrow("Unauthenticated");
    await expect(
      other.owner.query(api.reservations.get, { reservationId: visit._id }),
    ).rejects.toThrow("not found");
    await t.run((ctx) => ctx.db.patch(s.staffId, { isActive: false }));
    await expect(list(s)).rejects.toThrow("Unauthorised");
    await expect(get(s, visit._id)).rejects.toThrow("Unauthorised");
  });

  it("keeps get readable through invalid setup while preserving listDay's readiness validation", async () => {
    const s = await venue(backend());
    const visit = await reserve(s);
    await s.t.run((ctx) =>
      ctx.db.patch(s.settingsId!, {
        timezone: "invalid/timezone",
        noShowGraceMins: -10,
        servicePeriods: [],
      }),
    );
    vi.setSystemTime(visit.startAt);
    expect((await get(s, visit._id)).attention.timing).toEqual({
      kind: "late_arrival",
      minutes: 0,
    });
    await expect(list(s)).rejects.toThrow();
  });
});
