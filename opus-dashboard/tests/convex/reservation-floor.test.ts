import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
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

describe("live physical table projection", () => {
  it("requires active hospitality membership and rejects beauty, hotels, and revoked staff", async () => {
    const t = backend();
    await expect(t.query(api.hospitality.getLiveTables, {})).rejects.toThrow(
      "Unauthenticated",
    );
    const s = await venue(t);
    for (const patch of [
      { industry: "beauty_wellness" as const },
      { industry: "hospitality" as const, venueType: "hotel" as const },
    ]) {
      await t.run((ctx) => ctx.db.patch(s.orgId, patch));
      await expect(floor(s)).rejects.toThrow("unavailable");
    }
    await t.run(async (ctx) => {
      await ctx.db.patch(s.orgId, { venueType: "restaurant" });
      await ctx.db.patch(s.staffId, { isActive: false });
    });
    await expect(floor(s)).rejects.toThrow("Unauthorised");
  });

  it("lets personal-access staff read their unpublished venue without leaking another tenant", async () => {
    const t = backend();
    const s = await venue(t);
    const other = await venue(t, "other");
    await reserve(other, { name: "Other tenant private guest" });
    await t.run(async (ctx) => {
      await ctx.db.patch(s.staffId, { role: "staff", bookingAccess: "own" });
      await ctx.db.insert("reservation_closures", {
        orgId: other.orgId,
        tableIds: [],
        startAt: instant("07:00"),
        endAt: instant("22:00"),
        reason: "Other tenant private closure",
        isDeleted: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });
    const result = await floor(s);
    expect(result.tables.map((table) => table.tableId)).toEqual(s.tableIds);
    expect(result.tables.every((table) => table.status === "available")).toBe(
      true,
    );
    expect(JSON.stringify(result)).not.toContain("Other tenant");
    expect(JSON.stringify(result)).not.toContain(other.orgId);
  });

  it("shows one combined current party per physical table alongside the next reservation", async () => {
    const s = await venue(backend());
    let current = await reserve(s);
    const next = await reserve(s, { time: "14:00", name: "Next guest" });
    vi.setSystemTime(instant("12:00"));
    current = await change(s, current, "seat");
    const result = await floor(s);
    expect(result.tables).toHaveLength(3);
    for (const table of result.tables.slice(0, 2)) {
      expect(table).toMatchObject({
        status: "occupied",
        current: {
          reservationId: current._id,
          revision: current.revision,
          guestName: "Visit guest",
          partySize: 4,
          tableLabels: ["A", "B"],
          seatedAt: instant("12:00"),
        },
        next: { reservationId: next._id, guestName: "Next guest" },
        cleaning: [],
        overdue: false,
        late: false,
      });
    }
    expect(result.tables[2]).toMatchObject({
      status: "available",
      current: null,
      next: null,
    });
    expect(new Set(result.tables.map((table) => table.tableId)).size).toBe(3);
  });

  it("keeps combination labels in table order when allocation IDs have a different order", async () => {
    const s = await venue(backend());
    let current = await reserve(s);
    vi.setSystemTime(instant("12:00"));
    current = await change(s, current, "seat");
    const reversed = s.tableIds.slice(0, 2).reverse();
    await s.t.run((ctx) => ctx.db.patch(current._id, { tableIds: reversed }));
    const result = await floor(s);
    for (const table of result.tables.slice(0, 2))
      expect(table.current?.tableLabels).toEqual(["A", "B"]);
    expect((await s.t.run((ctx) => ctx.db.get(current._id)))?.tableIds).toEqual(
      reversed,
    );
  });

  it("uses the server clock for arrival grace and overruns regardless of refreshKey", async () => {
    const s = await venue(backend());
    let current = await reserve(s);
    const due = await reserve(s, { tableIds: [s.tableIds[2]] });
    vi.setSystemTime(instant("12:00"));
    current = await change(s, current, "seat");
    vi.setSystemTime(instant("12:15") - 1);
    const before = await floor(s, instant("23:00"));
    expect(before.asOf).toBe(instant("12:15") - 1);
    expect(before.tables[2]).toMatchObject({ status: "reserved", late: false });
    vi.setSystemTime(instant("12:15"));
    expect((await floor(s, 0)).tables[2].late).toBe(true);
    await change(s, due, "arrive");
    expect((await floor(s, Number.MAX_SAFE_INTEGER)).tables[2]).toMatchObject({
      late: false,
      next: { arrivedAt: instant("12:15") },
    });
    vi.setSystemTime(current.endAt - 1);
    expect((await floor(s)).tables[0].overdue).toBe(false);
    vi.setSystemTime(current.endAt);
    expect((await floor(s, -1)).tables[0]).toMatchObject({
      status: "occupied",
      overdue: true,
      current: { endAt: current.endAt },
    });
  });

  it("carries unfinished occupancy and cleaning across service dates until explicitly released", async () => {
    const s = await venue(backend());
    let reservation = await reserve(s);
    vi.setSystemTime(instant("12:00"));
    reservation = await change(s, reservation, "seat");
    vi.setSystemTime(instant("09:00", "2026-10-15"));
    expect((await floor(s)).tables[0]).toMatchObject({
      status: "occupied",
      overdue: true,
      current: { reservationId: reservation._id, serviceDate: DATE },
    });
    reservation = await change(s, reservation, "complete");
    vi.setSystemTime(instant("09:00", "2026-10-16"));
    expect((await floor(s)).tables[0]).toMatchObject({
      status: "cleaning",
      current: null,
      cleaning: [
        {
          reservationId: reservation._id,
          serviceDate: DATE,
          readyAt: instant("09:15", "2026-10-15"),
          canRelease: true,
        },
      ],
    });
    await change(s, reservation, "ready");
    expect(
      (await floor(s)).tables.every((table) => table.status === "available"),
    ).toBe(true);
  });

  it("keeps moved tables cleaning, exposes exact ready time, and releases only selected tables", async () => {
    const s = await venue(backend());
    let reservation = await reserve(s);
    vi.setSystemTime(instant("12:00"));
    reservation = await change(s, reservation, "seat");
    reservation = await change(s, reservation, "move", s.tableIds.slice(1));
    let result = await floor(s);
    expect(result.tables.map((table) => table.status)).toEqual([
      "cleaning",
      "occupied",
      "occupied",
    ]);
    expect(result.tables[0].cleaning).toEqual([
      expect.objectContaining({
        reservationId: reservation._id,
        readyAt: instant("12:15"),
        canRelease: false,
      }),
    ]);
    expect(result.tables[1].current?.tableLabels).toEqual(["B", "C"]);
    await expect(
      change(s, reservation, "ready", [s.tableIds[0]]),
    ).rejects.toThrow("buffer");
    vi.setSystemTime(instant("12:15"));
    expect((await floor(s)).tables[0].cleaning[0].canRelease).toBe(true);
    reservation = await change(s, reservation, "ready", [s.tableIds[0]]);
    expect((await floor(s)).tables.map((table) => table.status)).toEqual([
      "available",
      "occupied",
      "occupied",
    ]);
    reservation = await change(s, reservation, "complete");
    vi.setSystemTime(instant("12:30"));
    await change(s, reservation, "ready", [s.tableIds[1]]);
    result = await floor(s);
    expect(result.tables.map((table) => table.status)).toEqual([
      "available",
      "available",
      "cleaning",
    ]);
    expect(result.tables[2].cleaning).toHaveLength(1);
    expect(result.tables[2].cleaning[0].canRelease).toBe(true);
  });

  it("preserves occupied and cleaning holds ahead of closures and inactive resource flags", async () => {
    const s = await venue(backend());
    let reservation = await reserve(s);
    vi.setSystemTime(instant("12:00"));
    reservation = await change(s, reservation, "seat");
    await s.t.run(async (ctx) => {
      await ctx.db.patch(s.areaId, { isActive: false });
      await ctx.db.patch(s.tableIds[0], { isActive: false });
      await ctx.db.insert("reservation_closures", {
        orgId: s.orgId,
        tableIds: [],
        startAt: instant("12:00"),
        endAt: instant("20:00"),
        reason: "Closed for maintenance",
        isDeleted: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });
    let result = await floor(s);
    expect(result.tables.map((table) => table.status)).toEqual([
      "occupied",
      "occupied",
      "inactive",
    ]);
    expect(result.tables.every((table) => table.inactive)).toBe(true);
    expect(
      result.tables.every(
        (table) => table.closure?.reason === "Closed for maintenance",
      ),
    ).toBe(true);
    // External settings changes must not hide the cleaning work still required.
    await change(s, reservation, "complete");
    result = await floor(s);
    expect(result.tables.slice(0, 2).map((table) => table.status)).toEqual([
      "cleaning",
      "cleaning",
    ]);
  });

  it("applies table-specific closures on half-open time boundaries and omits deleted resources", async () => {
    const s = await venue(backend());
    await s.t.run(async (ctx) => {
      await ctx.db.patch(s.tableIds[2], { isDeleted: true });
      await ctx.db.insert("reservation_closures", {
        orgId: s.orgId,
        tableIds: [s.tableIds[0]],
        startAt: instant("12:00"),
        endAt: instant("13:00"),
        reason: "Private event",
        isDeleted: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });
    expect((await floor(s)).tables.map((table) => table.status)).toEqual([
      "available",
      "available",
    ]);
    vi.setSystemTime(instant("12:00"));
    expect((await floor(s)).tables.map((table) => table.status)).toEqual([
      "closed",
      "available",
    ]);
    vi.setSystemTime(instant("13:00"));
    expect((await floor(s)).tables[0]).toMatchObject({
      status: "available",
      closure: null,
    });
  });

  it("reads incomplete settings safely and retains existing occupancy with invalid timezone/rules", async () => {
    const incomplete = await venue(backend(), "incomplete", false);
    expect(await floor(incomplete)).toMatchObject({
      timezone: "Europe/Skopje",
    });
    expect((await floor(incomplete)).tables).toHaveLength(3);
    const s = await venue(backend());
    let reservation = await reserve(s);
    await reserve(s, { tableIds: [s.tableIds[2]] });
    vi.setSystemTime(instant("12:00"));
    reservation = await change(s, reservation, "seat");
    await s.t.run((ctx) =>
      ctx.db.patch(s.settingsId!, {
        timezone: "invalid/timezone",
        schemaVersion: undefined,
        noShowGraceMins: -10,
        servicePeriods: [],
      }),
    );
    expect(await floor(s)).toMatchObject({
      timezone: "Europe/Skopje",
      tables: expect.arrayContaining([
        expect.objectContaining({
          status: "occupied",
          current: expect.objectContaining({ reservationId: reservation._id }),
        }),
      ]),
    });
    expect((await floor(s)).tables[2]).toMatchObject({
      status: "reserved",
      late: true,
    });
  });

  it("projects the visit name without private CRM fields and anonymizes deleted customers", async () => {
    const s = await venue(backend());
    let reservation = await reserve(s, { name: "Visit display name" });
    await s.t.run(async (ctx) => {
      await ctx.db.patch(reservation.customerId, {
        name: "Private CRM name",
        email: "private@example.test",
        phone: "+38970111222",
      });
      await ctx.db.patch(reservation._id, {
        staffNote: "Private staff note",
        specialRequests: "Private request",
        manageTokenHash: "private-token-hash",
      });
    });
    vi.setSystemTime(instant("12:00"));
    reservation = await change(s, reservation, "seat");
    const visible = await floor(s);
    expect(visible.tables[0].current?.guestName).toBe("Visit display name");
    for (const text of [
      "Private CRM",
      "private@example",
      "+38970111222",
      "Private staff",
      "Private request",
      "private-token",
    ])
      expect(JSON.stringify(visible)).not.toContain(text);
    await s.t.run((ctx) =>
      ctx.db.patch(reservation.customerId, { isDeleted: true }),
    );
    const anonymized = await floor(s);
    expect(anonymized.tables[0]).toMatchObject({
      status: "occupied",
      current: { guestName: "Anonymised guest" },
    });
    expect(JSON.stringify(anonymized)).not.toContain("Visit display name");
  });

  it("does not resolve a foreign reservation or customer through corrupt local allocation references", async () => {
    const t = backend();
    const s = await venue(t);
    const other = await venue(t, "other");
    const own = await reserve(s, { tableIds: [s.tableIds[1]] });
    const foreign = await reserve(other, { name: "Foreign private name" });
    await t.run(async (ctx) => {
      await ctx.db.patch(own._id, { customerId: foreign.customerId });
      await ctx.db.insert("reservation_allocations", {
        orgId: s.orgId,
        reservationId: foreign._id,
        revision: foreign.revision!,
        tableId: s.tableIds[0],
        startAt: foreign.startAt,
        endAt: foreign.endAt,
        kind: "occupancy",
        requiresRelease: true,
        isActive: true,
        isDeleted: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });
    const result = await floor(s);
    expect(result.tables[0]).toMatchObject({
      status: "needs_review",
      current: null,
      cleaning: [],
      next: null,
    });
    expect(result.tables[1].next?.guestName).toBe("Anonymised guest");
    expect(JSON.stringify(result)).not.toContain("Foreign private name");
    expect(JSON.stringify(result)).not.toContain(foreign._id);
  });

  it.each(["occupied", "cleaning"] as const)(
    "flags legacy %s status without a valid physical hold for review",
    async (status) => {
      const s = await venue(backend());
      await s.t.run((ctx) => ctx.db.patch(s.tableIds[0], { status }));
      expect((await floor(s)).tables[0]).toMatchObject({
        status: "needs_review",
        current: null,
        cleaning: [],
        next: null,
      });
    },
  );

  it("flags a legacy confirmed visit without allocations even when its raw table is available", async () => {
    const s = await venue(backend());
    const legacy = await reserve(s, { tableIds: [s.tableIds[0]] });
    const unrelated = await reserve(s, { tableIds: [s.tableIds[2]] });
    const existingAllocations = await allocations(s, legacy._id);
    await s.t.run(async (ctx) => {
      for (const allocation of existingAllocations)
        await ctx.db.patch(allocation._id, { isActive: false });
      await ctx.db.patch(legacy._id, {
        schemaVersion: undefined,
        timeModel: undefined,
        serviceDate: undefined,
        revision: undefined,
        tableIds: undefined,
      });
    });
    vi.setSystemTime(instant("12:00"));
    expect((await s.t.run((ctx) => ctx.db.get(s.tableIds[0])))?.status).toBe(
      "available",
    );
    const result = await floor(s);
    expect(result.tables[0]).toMatchObject({
      status: "needs_review",
      current: null,
      cleaning: [],
      next: null,
    });
    expect(result.tables[1].status).toBe("available");
    expect(result.tables[2]).toMatchObject({
      status: "reserved",
      next: { reservationId: unrelated._id },
    });
  });

  it("flags every member of a confirmed combination with a missing occupancy allocation", async () => {
    const s = await venue(backend());
    const incomplete = await reserve(s);
    const unrelated = await reserve(s, { tableIds: [s.tableIds[2]] });
    const existingAllocations = await allocations(s, incomplete._id);
    expect(existingAllocations).toHaveLength(2);
    await s.t.run((ctx) =>
      ctx.db.patch(existingAllocations[0]._id, { isActive: false }),
    );
    vi.setSystemTime(instant("12:00"));
    const result = await floor(s);
    expect(result.tables.map((table) => table.status)).toEqual([
      "needs_review",
      "needs_review",
      "reserved",
    ]);
    expect(result.tables[2].next?.reservationId).toBe(unrelated._id);
  });

  it("flags overlapping physical holds instead of advertising the table as releasable", async () => {
    const s = await venue(backend());
    let reservation = await reserve(s);
    vi.setSystemTime(instant("12:00"));
    reservation = await change(s, reservation, "seat");
    const [allocation] = await allocations(s, reservation._id);
    await s.t.run(async (ctx) => {
      const { _id, _creationTime, ...duplicate } = allocation;
      void _id;
      void _creationTime;
      await ctx.db.insert("reservation_allocations", duplicate);
    });
    expect(
      (await floor(s)).tables.find(
        (table) => table.tableId === allocation.tableId,
      )?.status,
    ).toBe("needs_review");
  });

  it.each(["cancelled", "no_show", "completed"] as const)(
    "flags stale active occupancy allocations for a %s visit",
    async (status) => {
      const s = await venue(backend());
      const reservation = await reserve(s);
      await s.t.run((ctx) => ctx.db.patch(reservation._id, { status }));
      expect((await floor(s)).tables[0]).toMatchObject({
        status: "needs_review",
        current: null,
        cleaning: [],
        next: null,
      });
    },
  );

  it.each([
    { schemaVersion: undefined },
    { timeModel: undefined },
    { isDeleted: true },
  ] satisfies Partial<Doc<"reservations">>[])(
    "keeps invalid reservation holds visible for review without guest data: %j",
    async (patch) => {
      const s = await venue(backend());
      let reservation = await reserve(s, { name: "Legacy private guest" });
      vi.setSystemTime(instant("12:00"));
      reservation = await change(s, reservation, "seat");
      await s.t.run((ctx) => ctx.db.patch(reservation._id, patch));
      const result = await floor(s);
      expect(result.tables[0]).toMatchObject({
        status: "needs_review",
        current: null,
        cleaning: [],
        next: null,
      });
      expect(JSON.stringify(result)).not.toContain("Legacy private guest");
    },
  );
});
