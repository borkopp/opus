import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import type { FunctionArgs } from "convex/server";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import schema from "../../convex/schema";
import { convexModules } from "../../convex-test.setup";

const backend = () => convexTest(schema, convexModules);
type Backend = ReturnType<typeof backend>;
type Layout = FunctionArgs<typeof api.floorPlans.save>;

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
    const otherAreaId = await ctx.db.insert("floor_plans", {
      orgId,
      name: "Terrace",
      canvasWidth: 800,
      canvasHeight: 600,
      isActive: true,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });
    const tableIds: Id<"tables">[] = [];
    for (let index = 0; index < 4; index++)
      tableIds.push(
        await ctx.db.insert("tables", {
          orgId,
          floorPlanId: index === 3 ? otherAreaId : areaId,
          label: `T${index + 1}`,
          capacity: 2,
          minCapacity: 1,
          x: index * 120,
          y: 100,
          width: 100,
          height: 100,
          rotation: 0,
          shape: "rectangle",
          status: "available",
          isActive: index !== 1,
          sortOrder: index,
          isDeleted: index === 2,
          createdAt: now,
          updatedAt: now,
        }),
      );
    const combinationId = await ctx.db.insert("table_combinations", {
      orgId,
      floorPlanId: areaId,
      name: "T1 + T2",
      tableIds: tableIds.slice(0, 2),
      minPartySize: 3,
      capacity: 4,
      revision: 1,
      isActive: false,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("reservation_settings", {
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
      updatedAt: now,
    });
    return { areaId, otherAreaId, tableIds, combinationId };
  });
  return { t, owner, orgId, staffId: profile!.staffId!, ...rows };
}
type Venue = Awaited<ReturnType<typeof venue>>;
function layout(s: Venue): Layout {
  return {
    areaId: s.areaId,
    expectedRevision: 0,
    canvasWidth: 800,
    canvasHeight: 600,
    tables: s.tableIds.slice(0, 2).map((tableId, index) => ({
      tableId,
      x: 100 + index * 200,
      y: 100,
      width: 100,
      height: 100,
      rotation: 45,
      shape: "rectangle",
      locked: index === 1,
    })),
    fixtures: [
      {
        id: "wall-1",
        kind: "wall",
        label: "  Main wall  ",
        x: 0,
        y: 0,
        width: 800,
        height: 10,
        rotation: 0,
        locked: true,
      },
    ],
  };
}
const save = (s: Venue, args = layout(s)) =>
  s.owner.mutation(api.floorPlans.save, args);
const get = (s: Venue) =>
  s.owner.query(api.floorPlans.get, { areaId: s.areaId });
async function audits(s: Venue) {
  return s.t.run(async (ctx) =>
    (
      await ctx.db
        .query("audit_log")
        .withIndex("by_org", (q) => q.eq("orgId", s.orgId))
        .collect()
    ).filter((row) => row.action === "hospitality.floor_plan_saved"),
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-14T10:00:00Z"));
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe("hospitality floor-plan editing", () => {
  it("reads legacy layouts and inactive tables, excludes deleted/other-area resources, and scopes staff to their venue", async () => {
    const t = backend();
    const s = await venue(t);
    const other = await venue(t, "other");
    await t.run((ctx) =>
      ctx.db.patch(s.staffId, { role: "staff", bookingAccess: "own" }),
    );
    const result = await get(s);
    expect(result.area).toMatchObject({ layoutRevision: 0, fixtures: [] });
    expect(result.tables.map((table) => table._id)).toEqual(
      s.tableIds.slice(0, 2),
    );
    expect(result.tables[1].isActive).toBe(false);
    expect(result.combinations.map((combo) => combo._id)).toEqual([
      s.combinationId,
    ]);
    expect(JSON.stringify(result)).not.toContain(other.orgId);
    await expect(
      s.owner.query(api.floorPlans.get, { areaId: other.areaId }),
    ).rejects.toThrow("Area unavailable");
    await expect(save(s)).rejects.toThrow("Unauthorised");
    expect(await audits(s)).toEqual([]);
  });

  it("requires active hospitality membership for reads and writes, with manager writes allowed", async () => {
    const s = await venue(backend());
    await expect(
      s.t.query(api.floorPlans.get, { areaId: s.areaId }),
    ).rejects.toThrow("Unauthenticated");
    await expect(s.t.mutation(api.floorPlans.save, layout(s))).rejects.toThrow(
      "Unauthenticated",
    );
    for (const patch of [
      { industry: "beauty_wellness" as const },
      { industry: "hospitality" as const, venueType: "hotel" as const },
    ]) {
      await s.t.run((ctx) => ctx.db.patch(s.orgId, patch));
      await expect(get(s)).rejects.toThrow("unavailable");
      await expect(save(s)).rejects.toThrow("unavailable");
    }
    await s.t.run(async (ctx) => {
      await ctx.db.patch(s.orgId, { venueType: "cafe" });
      await ctx.db.patch(s.staffId, { role: "manager" });
    });
    expect((await save(s)).revision).toBe(1);
    await s.t.run((ctx) => ctx.db.patch(s.staffId, { isActive: false }));
    await expect(get(s)).rejects.toThrow("Unauthorised");
    await expect(
      save(s, { ...layout(s), expectedRevision: 1 }),
    ).rejects.toThrow("Unauthorised");
  });

  it("saves only layout fields and audits the complete change without altering a seated visit or allocation", async () => {
    const s = await venue(backend());
    const reservation = await s.owner.mutation(api.reservations.createManual, {
      requestId: "floor-preservation",
      serviceDate: "2026-10-14",
      startAt: Date.now(),
      partySize: 2,
      customerName: "Seated guest",
      source: "manual",
      tableIds: [s.tableIds[0]],
    });
    await s.owner.mutation(api.reservations.change, {
      reservationId: reservation._id,
      expectedRevision: reservation.revision!,
      action: "seat",
    });
    const before = await s.t.run(async (ctx) => ({
      tables: await Promise.all(s.tableIds.map((id) => ctx.db.get(id))),
      reservation: await ctx.db.get(reservation._id),
      combination: await ctx.db.get(s.combinationId),
      allocations: await ctx.db
        .query("reservation_allocations")
        .withIndex("by_org_active", (q) =>
          q.eq("orgId", s.orgId).eq("isActive", true),
        )
        .collect(),
    }));
    const args = layout(s);
    args.tables[0].shape = "booth";
    expect(await save(s, args)).toEqual({ areaId: s.areaId, revision: 1 });
    const after = await get(s);
    expect(after.area).toMatchObject({
      layoutRevision: 1,
      fixtures: [{ ...args.fixtures[0], label: "Main wall" }],
    });
    for (let index = 0; index < 2; index++) {
      const { tableId, locked, ...geometry } = args.tables[index];
      expect(after.tables[index]._id).toBe(tableId);
      expect(after.tables[index]).toEqual({
        ...before.tables[index],
        ...geometry,
        layoutLocked: locked,
        updatedAt: Date.now(),
      });
    }
    expect(after.tables[0].status).toBe("occupied");
    await s.t.run(async (ctx) => {
      expect(await ctx.db.get(reservation._id)).toEqual(before.reservation);
      expect(await ctx.db.get(s.combinationId)).toEqual(before.combination);
      expect(await ctx.db.get(s.tableIds[2])).toEqual(before.tables[2]);
      expect(await ctx.db.get(s.tableIds[3])).toEqual(before.tables[3]);
      expect(
        await ctx.db
          .query("reservation_allocations")
          .withIndex("by_org_active", (q) =>
            q.eq("orgId", s.orgId).eq("isActive", true),
          )
          .collect(),
      ).toEqual(before.allocations);
    });
    expect(await audits(s)).toMatchObject([
      {
        actorId: s.staffId,
        actorType: "staff",
        resourceId: s.areaId,
        before: { revision: 0 },
        after: { revision: 1 },
      },
    ]);
  });

  it("serializes competing saves and rejects an outdated editor without losing either layout atomically", async () => {
    const s = await venue(backend());
    const left = layout(s);
    const right = layout(s);
    right.tables[0].x = 400;
    const results = await Promise.allSettled([save(s, left), save(s, right)]);
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === "rejected"),
    ).toHaveLength(1);
    const saved = await get(s);
    expect(saved.area.layoutRevision).toBe(1);
    expect(saved.tables[0].x).toBe(
      results[0].status === "fulfilled" ? 100 : 400,
    );
    await expect(save(s)).rejects.toThrow("changed. Reload");
    expect(await get(s)).toEqual(saved);
    expect(await audits(s)).toHaveLength(1);
  });

  it("rejects foreign/deleted areas and every missing, repeated, foreign, deleted, or moved table ID", async () => {
    const t = backend();
    const s = await venue(t);
    const other = await venue(t, "other");
    await expect(
      save(s, { ...layout(s), areaId: other.areaId }),
    ).rejects.toThrow("Area unavailable");
    const original = await get(s);
    const valid = layout(s);
    for (const tables of [
      valid.tables.slice(0, 1),
      [valid.tables[0], valid.tables[0]],
      [...valid.tables, { ...valid.tables[0], tableId: s.tableIds[2] }],
      [valid.tables[0], { ...valid.tables[1], tableId: s.tableIds[3] }],
      [valid.tables[0], { ...valid.tables[1], tableId: other.tableIds[0] }],
    ]) {
      await expect(save(s, { ...valid, tables })).rejects.toThrow(
        "Table membership changed",
      );
    }
    expect(await get(s)).toEqual(original);
    await t.run((ctx) =>
      ctx.db.patch(s.tableIds[1], { floorPlanId: s.otherAreaId }),
    );
    await expect(save(s, valid)).rejects.toThrow("Table membership changed");
    await t.run((ctx) =>
      ctx.db.patch(s.areaId, { isDeleted: true, deletedAt: Date.now() }),
    );
    await expect(get(s)).rejects.toThrow("Area unavailable");
    await expect(save(s)).rejects.toThrow("Area unavailable");
    expect(await audits(s)).toEqual([]);
  });

  it("rejects newly added area tables until the editor reloads the full membership", async () => {
    const s = await venue(backend());
    const old = layout(s);
    await s.t.run((ctx) =>
      ctx.db.patch(s.tableIds[3], { floorPlanId: s.areaId }),
    );
    await expect(save(s, old)).rejects.toThrow("Table membership changed");
    const table = (await get(s)).tables[2];
    expect(
      (
        await save(s, {
          ...old,
          tables: [
            ...old.tables,
            {
              tableId: table._id,
              x: table.x,
              y: table.y,
              width: table.width,
              height: table.height,
              rotation: table.rotation,
              shape: table.shape,
              locked: false,
            },
          ],
        })
      ).revision,
    ).toBe(1);
  });

  it("rejects nonfinite, oversized, undersized, invalid rotation, and rotated overflow before any writes", async () => {
    const s = await venue(backend());
    const original = await get(s);
    for (const patch of [
      { x: NaN },
      { y: Infinity },
      { width: 39 },
      { width: 601 },
      { height: 0 },
      { rotation: -1 },
      { rotation: 360 },
      { x: 0, y: 0, rotation: 45 },
      { x: 760, rotation: 0 },
    ]) {
      const args = layout(s);
      args.tables[1] = { ...args.tables[1], ...patch };
      await expect(save(s, args)).rejects.toThrow();
      expect(await get(s)).toEqual(original);
    }
    for (const canvasWidth of [NaN, Infinity, 199, 4001])
      await expect(save(s, { ...layout(s), canvasWidth })).rejects.toThrow();
    for (const expectedRevision of [
      NaN,
      Infinity,
      -1,
      0.5,
      Number.MAX_SAFE_INTEGER,
    ])
      await expect(save(s, { ...layout(s), expectedRevision })).rejects.toThrow(
        "Invalid floor-plan revision",
      );
    expect(await audits(s)).toEqual([]);
    const valid = layout(s);
    valid.tables[0] = { ...valid.tables[0], x: 0, y: 0, rotation: 90 };
    expect((await save(s, valid)).revision).toBe(1);
  });

  it("bounds fixture identifiers, labels, dimensions, room edges, and item counts", async () => {
    const s = await venue(backend());
    const args = layout(s);
    const item = args.fixtures[0];
    for (const fixtures of [
      [item, item],
      [{ ...item, id: " " }],
      [{ ...item, id: "x".repeat(81) }],
      [{ ...item, label: "x".repeat(121) }],
      [{ ...item, kind: "label" as const, label: "  " }],
      [{ ...item, height: 9 }],
      [{ ...item, width: 4001 }],
      [{ ...item, x: 1 }],
      [{ ...item, rotation: 45 }],
      Array.from({ length: 201 }, (_, index) => ({
        ...item,
        id: `fixture-${index}`,
      })),
    ])
      await expect(save(s, { ...args, fixtures })).rejects.toThrow();
    await expect(
      save(s, {
        ...args,
        tables: Array.from({ length: 201 }, () => args.tables[0]),
      }),
    ).rejects.toThrow("up to 200");
    expect((await get(s)).area.layoutRevision).toBe(0);
    expect(await audits(s)).toEqual([]);
  });

  it("keeps table and fixture IDs in a single unique editor namespace", async () => {
    const s = await venue(backend());
    const before = await get(s);
    const args = layout(s);
    args.fixtures[0].id = s.tableIds[0];
    await expect(save(s, args)).rejects.toThrow(
      "unique valid fixture identifiers",
    );
    expect(await get(s)).toEqual(before);
    expect(await audits(s)).toEqual([]);
  });
});
