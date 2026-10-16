import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import type { FunctionArgs } from "convex/server";
import { api } from "../../convex/_generated/api";
import schema from "../../convex/schema";
import { convexModules } from "../../convex-test.setup";
import {
  createReservation,
  safeReservation,
} from "../../convex/lib/reservationEngine";
import { localDateTimeInstants } from "../../convex/lib/reservationTime";
import type { Doc, Id } from "../../convex/_generated/dataModel";

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

const amend = (
  s: Venue,
  visit: { _id: Id<"reservations">; revision?: number },
  changes: Partial<FunctionArgs<typeof api.reservations.amend>>,
) =>
  s.owner.mutation(api.reservations.amend, {
    reservationId: visit._id,
    expectedRevision: visit.revision!,
    ...changes,
  });
const offers = (
  s: Venue,
  visit: { _id: Id<"reservations"> },
  partySize: number,
) =>
  s.owner.query(api.reservations.getAmendOptions, {
    reservationId: visit._id,
    partySize,
  });
const create = (
  s: Venue,
  changes: Partial<FunctionArgs<typeof api.reservations.createManual>> = {},
) =>
  s.owner.mutation(api.reservations.createManual, {
    ...draft(s, [s.tableIds[0]], "12:00", 2),
    ...changes,
  });
const saved = (s: Venue, visit: { _id: Id<"reservations"> }) =>
  s.t.run((ctx) => ctx.db.get(visit._id));
const settings = (s: Venue, patch: Partial<Doc<"reservation_settings">>) =>
  s.t.run((ctx) => ctx.db.patch(s.settingsId, patch));

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-12T06:00:00Z"));
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe("staff reservation amendments", () => {
  it("keeps contact corrections on one visit and never changes identity, proof, customer records or verified email delivery", async () => {
    const s = await venue(backend());
    const visit = await s.t.run(async (ctx) =>
      createReservation(
        ctx,
        (await ctx.db.get(s.orgId))!,
        {
          ...draft(s, [s.tableIds[0]], "12:00", 2),
          customerName: "Original guest",
          customerEmail: "verified@example.com",
          customerPhone: "+38970111222",
          verifiedEmail: "verified@example.com",
          manageTokenHash: "proof-hash",
          manageTokenCiphertext: "proof-cipher",
          manageTokenExpiresAt: instant("12:00") + 30 * 86_400_000,
        },
        { type: "staff", id: s.staffId },
      ),
    );
    const sibling = await create(s, {
      tableIds: [s.tableIds[2]],
      customerEmail: "verified@example.com",
      customerPhone: "+38970999888",
    });
    expect(sibling.customerId).toBe(visit.customerId);
    expect((await saved(s, sibling))!.guestContact).toEqual({
      email: "verified@example.com",
      phone: "+38970999888",
    });
    expect(
      await s.owner.query(api.reservations.get, { reservationId: sibling._id }),
    ).toMatchObject({ customerPhone: "+38970999888" });
    expect(
      await s.t.run((ctx) => ctx.db.get(sibling.customerId)),
    ).toMatchObject({ phone: "+38970111222" });
    // Existing rows without a snapshot keep their legacy customer fallback.
    await s.t.run((ctx) =>
      ctx.db.patch(sibling._id, { guestContact: undefined }),
    );
    const beforeCustomer = await s.t.run((ctx) => ctx.db.get(visit.customerId));
    const beforeAllocations = await active(s);
    const result = await amend(s, visit, {
      customerName: " Corrected name ",
      customerEmail: " NEW@Example.com ",
      customerPhone: "+389 (70) 333-444",
      specialRequests: " Window seat ",
    });
    expect(result).not.toHaveProperty("guestContact");
    const after = (await saved(s, visit))!;
    expect(after).toMatchObject({
      guestName: "Corrected name",
      guestContact: { email: "new@example.com", phone: "+38970333444" },
      specialRequests: "Window seat",
      revision: 2,
    });
    for (const field of [
      "customerId",
      "opusUserId",
      "verifiedEmail",
      "manageTokenHash",
      "manageTokenCiphertext",
      "manageTokenExpiresAt",
      "requestFingerprint",
      "startAt",
      "endAt",
    ] as const)
      expect(after[field]).toEqual(visit[field]);
    expect(await s.t.run((ctx) => ctx.db.get(visit.customerId))).toEqual(
      beforeCustomer,
    );
    expect(await saved(s, sibling)).toMatchObject({
      revision: 1,
      guestName: "Reservation Guest",
    });
    const read = await s.owner.query(api.reservations.get, {
      reservationId: visit._id,
    });
    expect(read).toMatchObject({
      customerName: "Corrected name",
      customerEmail: "new@example.com",
      customerPhone: "+38970333444",
    });
    expect(
      await s.owner.query(api.reservations.get, { reservationId: sibling._id }),
    ).toMatchObject({
      customerEmail: "verified@example.com",
      customerPhone: "+38970111222",
    });
    expect(safeReservation(after)).not.toHaveProperty("guestContact");
    const current = (await active(s)).filter(
      (a) => a.reservationId === visit._id,
    );
    expect(current).toHaveLength(1);
    expect(current[0]).toMatchObject({
      revision: 2,
      startAt: beforeAllocations[0].startAt,
      endAt: beforeAllocations[0].endAt,
      requiresRelease: false,
    });
    const jobs = await s.t.run((ctx) =>
      ctx.db
        .query("notifications")
        .withIndex("by_org", (q) => q.eq("orgId", s.orgId))
        .collect(),
    );
    const currentJobs = jobs.filter(
      (n) =>
        n.reservationId === visit._id &&
        n.reservationRevision === 2 &&
        n.type !== "staff_reservation",
    );
    expect(currentJobs.map((n) => n.type).sort()).toEqual([
      "reservation_changed",
      "reservation_reminder",
    ]);
    expect(
      currentJobs.every((n) => n.recipientAddress === "verified@example.com"),
    ).toBe(true);
    expect(jobs.some((n) => n.recipientAddress === "new@example.com")).toBe(
      false,
    );
    const audits = await s.t.run((ctx) =>
      ctx.db
        .query("audit_log")
        .withIndex("by_org", (q) => q.eq("orgId", s.orgId))
        .collect(),
    );
    const audit = audits.find((a) => a.action === "reservation.amended")!;
    expect(audit.actorId).toBe(s.staffId);
    expect(audit.after.changedFields).toEqual([
      "customerName",
      "customerEmail",
      "customerPhone",
      "specialRequests",
    ]);
    expect(JSON.stringify(audit)).not.toMatch(
      /Corrected name|new@example|Window seat/,
    );
  });

  it("clears optional fields explicitly without falling back to shared contacts and treats omitted/no-op fields correctly", async () => {
    const s = await venue(backend());
    const visit = await create(s, {
      customerEmail: "guest@example.com",
      customerPhone: "+38970111222",
      specialRequests: "Old request",
    });
    const result = await amend(s, visit, {
      customerEmail: "",
      customerPhone: " ",
      specialRequests: " ",
    });
    expect((await saved(s, visit))!.guestContact).toEqual({});
    const read = await s.owner.query(api.reservations.get, {
      reservationId: visit._id,
    });
    expect(read.customerEmail).toBeUndefined();
    expect(read.customerPhone).toBeUndefined();
    expect(read.specialRequests).toBeUndefined();
    const rename = await amend(s, result, { customerName: "New guest name" });
    expect((await saved(s, visit))!.guestContact).toEqual({});
    expect(
      (
        await amend(s, rename, {
          customerName: " New guest name ",
          customerEmail: "",
          partySize: 2,
          tableIds: [s.tableIds[0]],
        })
      ).revision,
    ).toBe(rename.revision);
  });

  it("allows guest-only corrections after service/settings changes without modifying the held visit", async () => {
    const s = await venue(backend());
    const visit = await create(s);
    vi.setSystemTime(instant("23:45"));
    await settings(s, { timezone: "Broken/timezone", servicePeriods: [] });
    const before = await active(s);
    const updated = await amend(s, visit, {
      customerName: "Late correction",
      specialRequests: "Corrected note",
    });
    expect(updated).toMatchObject({
      revision: 2,
      startAt: visit.startAt,
      endAt: visit.endAt,
      status: "confirmed",
    });
    expect((await active(s))[0]).toMatchObject({
      startAt: before[0].startAt,
      endAt: before[0].endAt,
      requiresRelease: before[0].requiresRelease,
      revision: 2,
    });
  });

  it("requires explicit allocation when a larger party exceeds a single table and allows only saved combinations", async () => {
    const s = await venue(backend());
    const visit = await create(s);
    const options = await offers(s, visit, 4);
    expect(options).toMatchObject({
      revision: 1,
      minPartySize: 1,
      maxPartySize: 10,
    });
    expect(options.options.map((o) => o.label)).toEqual(["A + B", "B + C"]);
    const original = await saved(s, visit);
    await expect(
      amend(s, visit, { partySize: 4, customerName: "Must roll back" }),
    ).rejects.toThrow("fits this party");
    await expect(
      amend(s, visit, {
        partySize: 4,
        tableIds: [s.tableIds[0], s.tableIds[2]],
      }),
    ).rejects.toThrow("fits this party");
    expect(await saved(s, visit)).toEqual(original);
    const updated = await amend(s, visit, {
      partySize: 4,
      tableIds: s.tableIds.slice(0, 2),
    });
    expect(updated).toMatchObject({
      partySize: 4,
      capacitySnapshot: 4,
      combinationId: s.comboIds[0],
      revision: 2,
      startAt: visit.startAt,
      endAt: visit.endAt,
    });
    expect((await active(s)).map((a) => a.tableId).sort()).toEqual(
      s.tableIds.slice(0, 2).sort(),
    );
    await expect(amend(s, updated, { partySize: 2 })).rejects.toThrow(
      "fits this party",
    );
    const smaller = await amend(s, updated, {
      partySize: 2,
      tableIds: [s.tableIds[0]],
    });
    expect(smaller.combinationId).toBeUndefined();
    expect(smaller.capacitySnapshot).toBe(2);
  });

  it("rechecks current conflicts after options were read and does not overwrite either visit", async () => {
    const s = await venue(backend());
    const visit = await create(s);
    expect((await offers(s, visit, 4)).options).toHaveLength(2);
    const blocker = await create(s, { tableIds: [s.tableIds[1]] });
    expect((await offers(s, visit, 4)).options).toEqual([]);
    await expect(
      amend(s, visit, {
        partySize: 4,
        tableIds: s.tableIds.slice(0, 2),
        specialRequests: "Do not save",
      }),
    ).rejects.toThrow("fits this party");
    expect(await saved(s, visit)).toMatchObject({ revision: 1, partySize: 2 });
    expect((await saved(s, visit))?.specialRequests).toBeUndefined();
    expect(await saved(s, blocker)).toMatchObject({
      revision: 1,
      tableIds: [s.tableIds[1]],
    });
  });

  it("respects table/area activation, declared capacity and closures instead of accepting client supplied table sets", async () => {
    const s = await venue(backend());
    const visit = await create(s);
    for (const patch of [
      { isActive: false },
      { capacity: 3 },
      { capacity: 99 },
    ]) {
      await s.t.run((ctx) => ctx.db.patch(s.comboIds[0], patch));
      expect(
        (await offers(s, visit, 4)).options.some(
          (o) => o.combinationId === s.comboIds[0],
        ),
      ).toBe(false);
    }
    await s.t.run(async (ctx) => {
      await ctx.db.patch(s.comboIds[0], { isActive: true, capacity: 4 });
      await ctx.db.insert("reservation_closures", {
        orgId: s.orgId,
        startAt: visit.startAt,
        endAt: visit.endAt,
        tableIds: [s.tableIds[1]],
        reason: "Private event",
        isDeleted: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });
    expect((await offers(s, visit, 4)).options).toEqual([]);
    await expect(
      amend(s, visit, { partySize: 4, tableIds: s.tableIds.slice(0, 2) }),
    ).rejects.toThrow();
    // The occupied room can become inactive; correcting a name must still work.
    await s.t.run((ctx) => ctx.db.patch(s.areaId, { isActive: false }));
    expect((await offers(s, visit, 2)).options).toEqual([]);
    await expect(
      amend(s, visit, { customerName: "Corrected guest" }),
    ).resolves.toMatchObject({ revision: 2 });
  });

  it("updates an off-grid walk-in, leaves vacated seated tables cleaning and preserves all held intervals for metadata changes", async () => {
    const s = await venue(backend());
    vi.setSystemTime(instant("12:07") + 43_219);
    const visit = await s.owner.mutation(api.reservations.seatWalkIn, {
      requestId: `walk-in-${++requestSequence}`,
      tableIds: [s.tableIds[0]],
      partySize: 2,
    });
    vi.setSystemTime(Date.now() + 5 * 60_000);
    const moved = await amend(s, visit, {
      partySize: 4,
      tableIds: s.tableIds.slice(1),
      customerName: "Walk-in party",
    });
    expect(moved).toMatchObject({
      startAt: visit.startAt,
      endAt: visit.endAt,
      bufferMins: 15,
      status: "seated",
      partySize: 4,
    });
    const holds = await active(s);
    expect(holds.filter((a) => a.kind === "cleaning")).toMatchObject([
      {
        tableId: s.tableIds[0],
        startAt: Date.now(),
        endAt: Date.now() + 15 * 60_000,
        requiresRelease: true,
      },
    ]);
    expect(
      holds
        .filter((a) => a.kind === "occupancy")
        .every((a) => a.startAt === Date.now() && a.requiresRelease),
    ).toBe(true);
    const updated = await amend(s, moved, { customerPhone: "+38970999888" });
    expect(updated.revision).toBe(3);
    const after = await active(s);
    const heldDetails = ({
      revision,
      updatedAt,
      ...allocation
    }: Doc<"reservation_allocations">) => {
      void revision;
      void updatedAt;
      return allocation;
    };
    expect(after.map(heldDetails)).toEqual(holds.map(heldDetails));
    expect(after.every((a) => a.revision === 3)).toBe(true);
    const floor = await s.owner.query(api.hospitality.getLiveTables, {});
    expect(floor.tables.find((t) => t.tableId === s.tableIds[0])!.status).toBe(
      "cleaning",
    );
    expect(
      floor.tables.find((t) => t.tableId === s.tableIds[1])!.current,
    ).toMatchObject({ guestName: "Walk-in party", partySize: 4, revision: 3 });
    await expect(
      amend(s, updated, { tableIds: s.tableIds.slice(0, 2) }),
    ).rejects.toThrow("fits this party");
  });

  it("corrects the party count of an overdue held visit without freeing it, and forbids moving until the end is extended", async () => {
    const s = await venue(backend());
    vi.setSystemTime(instant("12:07") + 43);
    const visit = await s.owner.mutation(api.reservations.seatWalkIn, {
      requestId: `walk-in-${++requestSequence}`,
      tableIds: [s.tableIds[0]],
      partySize: 2,
    });
    vi.setSystemTime(visit.endAt + 30 * 60_000);
    expect((await offers(s, visit, 1)).options.map((o) => o.tableIds)).toEqual([
      [s.tableIds[0]],
    ]);
    const corrected = await amend(s, visit, { partySize: 1 });
    expect(corrected).toMatchObject({
      endAt: visit.endAt,
      partySize: 1,
      status: "seated",
    });
    expect((await active(s))[0]).toMatchObject({
      endAt: visit.endAt + 15 * 60_000,
      requiresRelease: true,
      revision: 2,
    });
    await expect(
      amend(s, corrected, { tableIds: [s.tableIds[1]] }),
    ).rejects.toThrow("fits this party");
    expect((await offers(s, corrected, 4)).reason).toContain(
      "Extend the visit",
    );
  });

  it("handles a previous service date overnight without applying new booking grid/notice requirements", async () => {
    const s = await venue(backend());
    await settings(s, {
      servicePeriods: [
        {
          name: "Evening",
          startTime: "18:00",
          endTime: "03:00",
          endDayOffset: 1,
          daysOfWeek: [3],
        },
      ],
      minAdvanceBookingHours: 24,
    });
    vi.setSystemTime(instant("00:07", "2026-10-15") + 43_219);
    const visit = await s.owner.mutation(api.reservations.seatWalkIn, {
      requestId: `walk-in-${++requestSequence}`,
      tableIds: [s.tableIds[0]],
      partySize: 2,
    });
    const result = await amend(s, visit, {
      partySize: 4,
      tableIds: s.tableIds.slice(0, 2),
    });
    expect(result).toMatchObject({
      serviceDate: DATE,
      startAt: visit.startAt,
      endAt: visit.endAt,
      partySize: 4,
    });
  });

  it("rejects stale revisions, terminal/legacy/deleted visits and erased guests without partial updates", async () => {
    const s = await venue(backend());
    const visit = await create(s);
    const amended = await amend(s, visit, { customerName: "Saved correction" });
    await expect(
      amend(s, visit, { customerName: "Stale correction" }),
    ).rejects.toThrow("Refresh");
    for (const status of [
      "completed",
      "cancelled",
      "no_show",
      "pending",
    ] as const) {
      await s.t.run((ctx) => ctx.db.patch(visit._id, { status }));
      await expect(
        amend(s, amended, { customerName: "Forbidden" }),
      ).rejects.toThrow("Only confirmed");
    }
    await s.t.run((ctx) =>
      ctx.db.patch(visit._id, { status: "confirmed", timeModel: undefined }),
    );
    await expect(
      amend(s, amended, { customerName: "Forbidden" }),
    ).rejects.toThrow("Legacy");
    await s.t.run((ctx) =>
      ctx.db.patch(visit._id, { timeModel: "utc", isDeleted: true }),
    );
    await expect(
      amend(s, amended, { customerName: "Forbidden" }),
    ).rejects.toThrow("not found");
    await s.t.run((ctx) => ctx.db.patch(visit._id, { isDeleted: false }));
    const withContact = await amend(s, amended, {
      customerEmail: "erase@example.com",
    });
    await s.owner.mutation(api.reservations.eraseGuest, {
      customerId: visit.customerId,
    });
    expect((await saved(s, visit))!.guestContact).toBeUndefined();
    await expect(
      amend(s, withContact, { customerName: "Resurrected" }),
    ).rejects.toThrow("Anonymised");
    expect((await offers(s, visit, 2)).options).toEqual([]);
    expect(
      await s.owner.mutation(api.reservations.eraseGuest, {
        customerId: visit.customerId,
      }),
    ).toEqual({ anonymizedReservations: 0 });
  });

  it("supports every active hospitality staff role, rejects foreign/anonymous/inactive and beauty access", async () => {
    const t = backend();
    const s = await venue(t);
    const other = await venue(t, "other");
    let visit = await create(s);
    for (const role of ["staff", "manager", "owner"] as const) {
      await t.run((ctx) =>
        ctx.db.patch(s.staffId, { role, bookingAccess: "own" }),
      );
      visit = await amend(s, visit, { customerName: `Updated by ${role}` });
      expect((await offers(s, visit, 2)).options.length).toBeGreaterThan(0);
    }
    const args = {
      reservationId: visit._id,
      expectedRevision: visit.revision!,
      customerName: "Forbidden",
    };
    await expect(t.mutation(api.reservations.amend, args)).rejects.toThrow(
      "Unauthenticated",
    );
    await expect(
      other.owner.mutation(api.reservations.amend, args),
    ).rejects.toThrow("not found");
    await expect(
      other.owner.query(api.reservations.getAmendOptions, {
        reservationId: visit._id,
        partySize: 2,
      }),
    ).rejects.toThrow("not found");
    await expect(
      amend(s, visit, { tableIds: [other.tableIds[0]] }),
    ).rejects.toThrow("fits this party");
    await t.run((ctx) => ctx.db.patch(s.staffId, { isActive: false }));
    await expect(
      amend(s, visit, { customerName: "Forbidden" }),
    ).rejects.toThrow("Unauthorised");
    await t.run(async (ctx) => {
      await ctx.db.patch(s.staffId, { isActive: true });
      await ctx.db.patch(s.orgId, { industry: "beauty_wellness" });
    });
    await expect(
      amend(s, visit, { customerName: "Forbidden" }),
    ).rejects.toThrow("unavailable");
  });

  it("validates guest fields, integer cover limits and duplicate/empty table selections before any write", async () => {
    const s = await venue(backend());
    const visit = await create(s);
    const original = await saved(s, visit);
    for (const patch of [
      { customerName: " " },
      { customerName: "a" },
      { customerName: "x".repeat(121) },
      { customerName: "Name\nInjected" },
      { customerEmail: "not-an-email" },
      { customerEmail: `${"x".repeat(255)}@example.com` },
      { customerPhone: "123" },
      { customerPhone: "letters" },
      { specialRequests: "x".repeat(2001) },
      { partySize: 0 },
      { partySize: 1.5 },
      { partySize: 11 },
      { tableIds: [] },
      { tableIds: [s.tableIds[0], s.tableIds[0]] },
    ])
      await expect(amend(s, visit, patch)).rejects.toThrow();
    expect(await saved(s, visit)).toEqual(original);
  });
  it("serializes competing party increases that share one physical table", async () => {
    const s = await venue(backend());
    const left = await create(s);
    const right = await create(s, { tableIds: [s.tableIds[2]] });
    const results = await Promise.allSettled([
      amend(s, left, { partySize: 4, tableIds: s.tableIds.slice(0, 2) }),
      amend(s, right, { partySize: 4, tableIds: s.tableIds.slice(1) }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
    const holds = await active(s);
    expect(holds.filter((a) => a.tableId === s.tableIds[1])).toHaveLength(1);
    expect(holds).toHaveLength(3);
    expect(
      [
        (await saved(s, left))!.partySize,
        (await saved(s, right))!.partySize,
      ].sort(),
    ).toEqual([2, 4]);
  });

  it("never turns stale, missing or duplicate occupancy into valid allocation through a metadata correction", async () => {
    const s = await venue(backend());
    const visit = await create(s);
    const hold = (await active(s))[0];
    for (const patch of [
      { revision: 0 },
      { isActive: false },
      { requiresRelease: true },
      { endAt: hold.endAt + 60_000 },
    ]) {
      await s.t.run((ctx) => ctx.db.patch(hold._id, patch));
      await expect(
        amend(s, visit, { customerPhone: "+38970123456" }),
      ).rejects.toThrow("needs staff review");
      expect((await offers(s, visit, 2)).reason).toContain(
        "needs staff review",
      );
      expect(await saved(s, visit)).toMatchObject({ revision: 1 });
      await s.t.run((ctx) =>
        ctx.db.patch(hold._id, {
          revision: hold.revision,
          isActive: true,
          requiresRelease: false,
          endAt: hold.endAt,
        }),
      );
    }
    await s.t.run(async (ctx) => {
      const { _id, _creationTime, ...data } = hold;
      void _id;
      void _creationTime;
      await ctx.db.insert("reservation_allocations", data);
    });
    await expect(
      amend(s, visit, { customerName: "No repair" }),
    ).rejects.toThrow("needs staff review");
  });

  it("never changes a foreign table through corrupt saved allocation membership", async () => {
    const t = backend();
    const s = await venue(t);
    const other = await venue(t, "other");
    vi.setSystemTime(instant("12:07") + 43);
    const visit = await s.owner.mutation(api.reservations.seatWalkIn, {
      requestId: `walk-in-${++requestSequence}`,
      tableIds: [s.tableIds[0]],
      partySize: 2,
    });
    const hold = (await active(s))[0];
    const foreignBefore = await t.run((ctx) => ctx.db.get(other.tableIds[0]));
    await t.run(async (ctx) => {
      await ctx.db.patch(visit._id, {
        tableIds: [other.tableIds[0]],
        tableId: other.tableIds[0],
      });
      await ctx.db.patch(hold._id, { tableId: other.tableIds[0] });
    });
    await expect(
      amend(s, visit, { tableIds: [s.tableIds[2]] }),
    ).rejects.toThrow("needs staff review");
    expect(await t.run((ctx) => ctx.db.get(other.tableIds[0]))).toEqual(
      foreignBefore,
    );
  });

  it("redacts snapshots from erased/foreign-customer staff reads and does not notify unverified edited addresses", async () => {
    const t = backend();
    const s = await venue(t);
    const other = await venue(t, "other");
    const visit = await create(s);
    const updated = await amend(s, visit, {
      customerEmail: "private@example.com",
      customerPhone: "+38970111222",
    });
    const jobs = await t.run((ctx) =>
      ctx.db
        .query("notifications")
        .withIndex("by_org", (q) => q.eq("orgId", s.orgId))
        .collect(),
    );
    expect(
      jobs.some(
        (n) => n.reservationId === visit._id && n.type !== "staff_reservation",
      ),
    ).toBe(false);
    await t.run((ctx) => ctx.db.patch(visit.customerId, { isDeleted: true }));
    const erased = await s.owner.query(api.reservations.get, {
      reservationId: visit._id,
    });
    expect(erased.guestErased).toBe(true);
    expect(JSON.stringify(erased)).not.toMatch(
      /private@example|38970111222|guestContact/,
    );
    const foreignVisit = await create(other, {
      customerName: "Foreign customer",
    });
    await t.run((ctx) =>
      ctx.db.patch(visit._id, { customerId: foreignVisit.customerId }),
    );
    const foreign = await s.owner.query(api.reservations.get, {
      reservationId: visit._id,
    });
    expect(foreign.guestErased).toBe(true);
    expect(JSON.stringify(foreign)).not.toMatch(
      /private@example|38970111222|Foreign customer|guestContact/,
    );
    await expect(
      amend(s, updated, { customerName: "Do not resurrect" }),
    ).rejects.toThrow("Anonymised");
  });
});
