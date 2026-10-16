import { ConvexError, v } from "convex/values";
import { mutation, query, type QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { requireHospitality } from "./lib/hospitalityAccess";
import {
  availability,
  changeReservation,
  createReservation,
  safeReservation,
  reservationMoveOptions,
  reservationSettings,
  walkInAvailability,
  seatWalkInNow,
  reservationAmendOptions,
  amendReservation,
} from "./lib/reservationEngine";
import { eraseReservationGuest } from "./lib/reservationPrivacy";
import { localDate, validServiceDate } from "./lib/reservationTime";
import {
  reservationCleaningAttention,
  reservationTimingAttention,
} from "./lib/reservationAttention";

async function staffReservation(
  ctx: QueryCtx,
  r: Doc<"reservations">,
  asOf: number,
  noShowGraceMins: number | undefined,
) {
  const customer = await ctx.db.get(r.customerId);
  const own =
    customer?.orgId === r.orgId && !customer.isDeleted ? customer : null;
  const cleaning = (
    await ctx.db
      .query("reservation_allocations")
      .withIndex("by_org_reservation_active", (q) =>
        q.eq("orgId", r.orgId).eq("reservationId", r._id).eq("isActive", true),
      )
      .collect()
  ).filter((a) => !a.isDeleted && a.kind === "cleaning");
  const cleaningTables = await Promise.all(
    cleaning.map(async (a) => {
      const table = await ctx.db.get(a.tableId);
      return {
        tableId: a.tableId,
        label:
          table?.orgId === r.orgId && !table.isDeleted ? table.label : "Table",
        readyAt: a.endAt,
      };
    }),
  );
  return {
    ...safeReservation(r),
    cleaningTableIds: cleaning.map((a) => a.tableId),
    cleaningTables,
    attention: {
      asOf,
      timing: reservationTimingAttention(r, noShowGraceMins, asOf),
      cleaning: cleaningTables.map((table) => ({
        ...table,
        ...reservationCleaningAttention(table.readyAt, asOf),
      })),
    },
    guestName: own ? r.guestName : undefined,
    opusUserId: own ? r.opusUserId : undefined,
    occasion: own ? r.occasion : undefined,
    specialRequests: own ? r.specialRequests : undefined,
    staffNote: own ? r.staffNote : undefined,
    cancellationReason: own ? r.cancellationReason : undefined,
    guestErased: !own,
    customerName: own ? (r.guestName ?? own.name) : "Anonymised guest",
    customerEmail: own
      ? r.guestContact === undefined
        ? own.email
        : r.guestContact.email
      : undefined,
    customerPhone: own
      ? r.guestContact === undefined
        ? own.phone
        : r.guestContact.phone
      : undefined,
  };
}

export const get = query({
  args: {
    reservationId: v.id("reservations"),
    refreshKey: v.optional(v.number()),
  },
  handler: async (ctx, { reservationId }) => {
    const { orgId } = await requireHospitality(ctx);
    const asOf = Date.now();
    const reservation = await ctx.db.get(reservationId);
    if (!reservation || reservation.orgId !== orgId || reservation.isDeleted)
      throw new ConvexError("Reservation not found.");
    const settings = await ctx.db
      .query("reservation_settings")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .unique();
    // A held/legacy visit remains visible even when current setup needs repair.
    return staffReservation(ctx, reservation, asOf, settings?.noShowGraceMins);
  },
});

export const listDay = query({
  args: { date: v.string(), refreshKey: v.optional(v.number()) },
  handler: async (ctx, { date }) => {
    const { org } = await requireHospitality(ctx);
    const asOf = Date.now();
    if (!validServiceDate(date))
      throw new ConvexError("Choose a valid service date.");
    const reservations = await ctx.db
      .query("reservations")
      .withIndex("by_org_service_date", (q) =>
        q.eq("orgId", org._id).eq("serviceDate", date),
      )
      .collect();
    const settings = await reservationSettings(ctx, org);
    if (date === localDate(asOf, settings.timezone)) {
      const outstanding = await ctx.db
        .query("reservation_allocations")
        .withIndex("by_org_active", (q) =>
          q.eq("orgId", org._id).eq("isActive", true),
        )
        .collect();
      const ids = new Set(
        outstanding
          .filter((a) => !a.isDeleted && a.requiresRelease)
          .map((a) => a.reservationId),
      );
      for (const id of ids) {
        if (reservations.some((r) => r._id === id)) continue;
        const row = await ctx.db.get(id);
        if (
          row?.orgId === org._id &&
          !row.isDeleted &&
          ["seated", "completed"].includes(row.status)
        )
          reservations.push(row);
      }
    }
    return Promise.all(
      reservations
        .filter((r) => !r.isDeleted)
        .sort((a, b) => a.startAt - b.startAt)
        .map((r) => staffReservation(ctx, r, asOf, settings?.noShowGraceMins)),
    );
  },
});

export const getDaySummary = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const { org } = await requireHospitality(ctx);
    if (!validServiceDate(date))
      throw new ConvexError("Choose a valid service date.");
    const rows = (
      await ctx.db
        .query("reservations")
        .withIndex("by_org_service_date", (q) =>
          q.eq("orgId", org._id).eq("serviceDate", date),
        )
        .collect()
    ).filter((r) => !r.isDeleted);
    const expectedAndServed = rows.filter((r) =>
      ["confirmed", "seated", "completed"].includes(r.status),
    );
    return {
      reservations: expectedAndServed.length,
      covers: expectedAndServed.reduce((sum, r) => sum + r.partySize, 0),
      cancellations: rows.filter((r) => r.status === "cancelled").length,
      noShows: rows.filter((r) => r.status === "no_show").length,
    };
  },
});

export const getSlots = query({
  args: {
    date: v.string(),
    partySize: v.number(),
    durationMins: v.optional(v.number()),
    reservationId: v.optional(v.id("reservations")),
  },
  handler: async (ctx, args) => {
    const { org } = await requireHospitality(ctx);
    if (args.reservationId) {
      const reservation = await ctx.db.get(args.reservationId);
      if (
        !reservation ||
        reservation.orgId !== org._id ||
        reservation.isDeleted
      )
        throw new ConvexError("Reservation not found.");
      if (reservation.status !== "confirmed") return [];
    }
    return availability(ctx, org, args.date, args.partySize, {
      staff: true,
      durationMins: args.durationMins,
      excludeReservationId: args.reservationId,
    });
  },
});

export const getMoveOptions = query({
  args: {
    reservationId: v.id("reservations"),
    durationMins: v.optional(v.number()),
  },
  handler: async (ctx, { reservationId, durationMins }) => {
    const { org } = await requireHospitality(ctx);
    const reservation = await ctx.db.get(reservationId);
    if (!reservation || reservation.orgId !== org._id || reservation.isDeleted)
      throw new ConvexError("Reservation not found.");
    return reservationMoveOptions(ctx, org, reservation, durationMins);
  },
});

export const getAmendOptions = query({
  args: {
    reservationId: v.id("reservations"),
    partySize: v.number(),
    refreshKey: v.optional(v.number()),
  },
  handler: async (ctx, { reservationId, partySize }) => {
    const { org } = await requireHospitality(ctx);
    const reservation = await ctx.db.get(reservationId);
    if (!reservation || reservation.orgId !== org._id || reservation.isDeleted)
      throw new ConvexError("Reservation not found.");
    return reservationAmendOptions(ctx, org, reservation, partySize);
  },
});

export const amend = mutation({
  args: {
    reservationId: v.id("reservations"),
    expectedRevision: v.number(),
    customerName: v.optional(v.string()),
    customerEmail: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
    specialRequests: v.optional(v.string()),
    partySize: v.optional(v.number()),
    tableIds: v.optional(v.array(v.id("tables"))),
  },
  handler: async (ctx, { reservationId, ...changes }) => {
    const { org, staffMember } = await requireHospitality(ctx);
    return safeReservation(
      await amendReservation(ctx, org, reservationId, changes, {
        type: "staff",
        id: staffMember._id,
      }),
    );
  },
});

export const createManual = mutation({
  args: {
    requestId: v.string(),
    serviceDate: v.string(),
    startAt: v.number(),
    partySize: v.number(),
    customerName: v.string(),
    customerEmail: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
    specialRequests: v.optional(v.string()),
    source: v.union(
      v.literal("manual"),
      v.literal("phone"),
      v.literal("walk_in"),
    ),
    tableIds: v.optional(v.array(v.id("tables"))),
    durationMins: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { org, staffMember } = await requireHospitality(ctx);
    return safeReservation(
      await createReservation(ctx, org, args, {
        type: "staff",
        id: staffMember._id,
      }),
    );
  },
});

export const getWalkInOptions = query({
  args: {
    tableId: v.id("tables"),
    partySize: v.number(),
    durationMins: v.optional(v.number()),
    refreshKey: v.optional(v.number()),
  },
  handler: async (ctx, { tableId, partySize, durationMins }) => {
    const { org } = await requireHospitality(ctx);
    return walkInAvailability(ctx, org, tableId, partySize, durationMins);
  },
});

export const seatWalkIn = mutation({
  args: {
    requestId: v.string(),
    tableIds: v.array(v.id("tables")),
    partySize: v.number(),
    durationMins: v.optional(v.number()),
    customerName: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
    specialRequests: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { org, staffMember } = await requireHospitality(ctx);
    return safeReservation(
      await seatWalkInNow(ctx, org, args, {
        type: "staff",
        id: staffMember._id,
      }),
    );
  },
});

export const change = mutation({
  args: {
    reservationId: v.id("reservations"),
    expectedRevision: v.number(),
    action: v.union(
      v.literal("reschedule"),
      v.literal("move"),
      v.literal("arrive"),
      v.literal("seat"),
      v.literal("complete"),
      v.literal("cancel"),
      v.literal("no_show"),
      v.literal("ready"),
      v.literal("duration"),
    ),
    serviceDate: v.optional(v.string()),
    startAt: v.optional(v.number()),
    tableIds: v.optional(v.array(v.id("tables"))),
    durationMins: v.optional(v.number()),
    partySize: v.optional(v.number()),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, { reservationId, ...change }) => {
    const { org, staffMember } = await requireHospitality(ctx);
    return safeReservation(
      await changeReservation(ctx, org, reservationId, change, {
        type: "staff",
        id: staffMember._id,
      }),
    );
  },
});

export const eraseGuest = mutation({
  args: { customerId: v.id("customers") },
  handler: async (ctx, { customerId }) => {
    const { org, staffMember } = await requireHospitality(ctx, "owner");
    return eraseReservationGuest(ctx, org, customerId, staffMember._id);
  },
});
