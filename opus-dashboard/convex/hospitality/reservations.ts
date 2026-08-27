import { v, ConvexError } from "convex/values";
import { Doc, Id } from "../_generated/dataModel";
import { mutation, query } from "../_generated/server";
import { internal } from "../_generated/api";
import { requireAuth, requireRole } from "../lib/auth";

// ─────────────────────────────────────────────────────────────────────────────
// Helper: get primary contact from a customer record
// ─────────────────────────────────────────────────────────────────────────────
function getPrimaryContact(
  customer: Doc<"customers">,
): { channel: "email" | "sms" | "whatsapp" | "push"; address: string } | null {
  if (customer.preferredChannel === "whatsapp" && customer.phone)
    return { channel: "whatsapp", address: customer.phone };
  if (customer.preferredChannel === "sms" && customer.phone)
    return { channel: "sms", address: customer.phone };
  if (customer.email) return { channel: "email", address: customer.email };
  if (customer.phone) return { channel: "sms", address: customer.phone };
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// getAvailableSlots — Slot computation engine for hospitality
// ─────────────────────────────────────────────────────────────────────────────
export const getAvailableSlots = query({
  args: {
    orgId: v.id("orgs"),
    date: v.string(), // ISO "YYYY-MM-DD"
    partySize: v.number(),
    durationMins: v.number(),
  },
  returns: v.array(v.number()),
  handler: async (ctx, args) => {
    // 1. Fetch reservation settings
    const settings = await ctx.db
      .query("reservation_settings")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();

    if (!settings) return [];

    // 2. Fetch active floor plan
    const floorPlan = await ctx.db
      .query("floor_plans")
      .withIndex("by_org_active", (q) =>
        q.eq("orgId", args.orgId).eq("isActive", true),
      )
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .first();

    if (!floorPlan) return [];

    // 3. Fetch eligible tables (capacity fit, not deleted, not inactive)
    const allTables = await ctx.db
      .query("tables")
      .withIndex("by_floor_plan", (q) => q.eq("floorPlanId", floorPlan._id))
      .filter((q) =>
        q.and(
          q.eq(q.field("isDeleted"), false),
          q.neq(q.field("status"), "inactive"),
        ),
      )
      .collect();

    const eligibleTables = allTables.filter((t) => {
      if (t.capacity < args.partySize) return false;
      if (t.minCapacity !== undefined && args.partySize < t.minCapacity)
        return false;
      return true;
    });

    if (eligibleTables.length === 0) return [];

    // 4. Determine open hours for the requested date
    const dateObj = new Date(args.date + "T00:00:00Z");
    const dayOfWeek = dateObj.getUTCDay();
    const dayStartMs = dateObj.getTime();

    let openWindows: { startMins: number; endMins: number }[] = [];

    // Try service periods first
    if (settings.servicePeriods && settings.servicePeriods.length > 0) {
      const todayPeriods = settings.servicePeriods.filter((p) =>
        p.daysOfWeek.includes(dayOfWeek),
      );
      openWindows = todayPeriods.map((p) => ({
        startMins: parseTimeToMins(p.startTime),
        endMins: parseTimeToMins(p.endTime),
      }));
    }

    // Fallback: check availability_rules (staff-level, but for hospitality
    // the org typically has at least one "staff" representing the restaurant)
    if (openWindows.length === 0) {
      const rules = await ctx.db
        .query("availability_rules")
        .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
        .filter((q) =>
          q.and(
            q.eq(q.field("dayOfWeek"), dayOfWeek),
            q.eq(q.field("isActive"), true),
          ),
        )
        .collect();

      if (rules.length > 0) {
        openWindows = rules.map((r) => ({
          startMins: parseTimeToMins(r.startTime),
          endMins: parseTimeToMins(r.endTime),
        }));
      }
    }

    if (openWindows.length === 0) return [];

    // 5. Fetch all reservations for the day on all eligible tables
    const nextDayMs = dayStartMs + 24 * 60 * 60 * 1000;
    const tableIds = new Set(eligibleTables.map((t) => t._id));

    const dayReservations = await ctx.db
      .query("reservations")
      .withIndex("by_org_start", (q) =>
        q
          .eq("orgId", args.orgId)
          .gte("startAt", dayStartMs)
          .lt("startAt", nextDayMs),
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("isDeleted"), false),
          q.neq(q.field("status"), "cancelled"),
          q.neq(q.field("status"), "completed"),
          q.neq(q.field("status"), "no_show"),
        ),
      )
      .collect();

    // Group reservations by table
    const reservationsByTable = new Map<string, typeof dayReservations>();
    for (const r of dayReservations) {
      if (!tableIds.has(r.tableId)) continue;
      const key = r.tableId as string;
      if (!reservationsByTable.has(key)) reservationsByTable.set(key, []);
      reservationsByTable.get(key)!.push(r);
    }

    // 6. Generate slot start times and check availability
    const durationMs = args.durationMins * 60 * 1000;
    const availableSlots: number[] = [];

    for (const window of openWindows) {
      for (
        let slotMins = window.startMins;
        slotMins + args.durationMins <= window.endMins;
        slotMins += settings.slotIntervalMins
      ) {
        const slotStartMs = dayStartMs + slotMins * 60 * 1000;
        const slotEndMs = slotStartMs + durationMs;

        // Check if at least one eligible table is free
        const hasAvailable = eligibleTables.some((table) => {
          const tableReservations =
            reservationsByTable.get(table._id as string) || [];
          return !tableReservations.some(
            (r) => r.startAt < slotEndMs && r.endAt > slotStartMs,
          );
        });

        if (hasAvailable) {
          availableSlots.push(slotStartMs);
        }
      }
    }

    return availableSlots;
  },
});

function parseTimeToMins(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

// ─────────────────────────────────────────────────────────────────────────────
// createReservation — Core mutation with conflict check + auto-assignment
// ─────────────────────────────────────────────────────────────────────────────
export const createReservation = mutation({
  args: {
    orgId: v.id("orgs"),
    startAt: v.number(),
    durationMins: v.number(),
    partySize: v.number(),
    customerId: v.id("customers"),
    source: v.union(
      v.literal("web"),
      v.literal("manual"),
      v.literal("walk_in"),
      v.literal("phone"),
      v.literal("ai"),
    ),
    specialRequests: v.optional(v.string()),
    occasion: v.optional(
      v.union(
        v.literal("birthday"),
        v.literal("anniversary"),
        v.literal("business"),
        v.literal("date"),
        v.literal("other"),
      ),
    ),
    staffNote: v.optional(v.string()),
  },
  returns: v.id("reservations"),
  handler: async (ctx, args): Promise<Id<"reservations">> => {
    // 1. Auth — public booking flow doesn't require staff auth,
    // but manual/phone sources do
    if (args.source === "manual" || args.source === "phone") {
      await requireAuth(ctx, args.orgId);
    }

    // 2. Validate customer
    const customer = await ctx.db.get(args.customerId);
    if (!customer || customer.orgId !== args.orgId || customer.isDeleted) {
      throw new ConvexError("Customer not found.");
    }

    // 3. Find best table via auto-assignment
    const bestTableResult = await ctx.runQuery(
      internal.hospitality.findBestTable.findBestTable,
      {
        orgId: args.orgId,
        startAt: args.startAt,
        durationMins: args.durationMins,
        partySize: args.partySize,
      },
    ) as { tableId: Id<"tables">; score: number } | null;

    if (!bestTableResult) {
      throw new ConvexError(
        "No tables available for this time and party size.",
      );
    }

    const tableId: Id<"tables"> = bestTableResult.tableId;
    const assignmentScore: number = bestTableResult.score;

    // 4. Conflict check INSIDE this mutation (same pattern as beauty bookings)
    const endAt = args.startAt + args.durationMins * 60 * 1000;
    const dayStartMs = new Date(
      new Date(args.startAt).toISOString().split("T")[0] + "T00:00:00Z",
    ).getTime();
    const nextDayMs = dayStartMs + 24 * 60 * 60 * 1000;

    const existingReservations = await ctx.db
      .query("reservations")
      .withIndex("by_table_start", (q) =>
        q
          .eq("tableId", tableId)
          .gte("startAt", dayStartMs)
          .lt("startAt", nextDayMs),
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("isDeleted"), false),
          q.neq(q.field("status"), "cancelled"),
          q.neq(q.field("status"), "completed"),
          q.neq(q.field("status"), "no_show"),
        ),
      )
      .collect();

    const conflict = existingReservations.find(
      (r) => r.startAt < endAt && r.endAt > args.startAt,
    );

    if (conflict) {
      throw new ConvexError(
        "This slot is no longer available — another reservation was just made.",
      );
    }

    // 5. Get floor plan for the reservation record
    const table = await ctx.db.get(tableId);
    if (!table) throw new ConvexError("Assigned table not found.");

    // 6. Determine initial status
    const settings = await ctx.db
      .query("reservation_settings")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();

    let status: "pending" | "confirmed" = "confirmed";
    if (settings?.depositRequired) {
      status = "pending";
    }

    // 7. Insert reservation
    const now = Date.now();
    const reservationId: Id<"reservations"> = await ctx.db.insert("reservations", {
      orgId: args.orgId,
      floorPlanId: table.floorPlanId,
      tableId,
      customerId: args.customerId,
      startAt: args.startAt,
      durationMins: args.durationMins,
      endAt,
      partySize: args.partySize,
      specialRequests: args.specialRequests,
      occasion: args.occasion,
      status,
      source: args.source,
      staffNote: args.staffNote,
      autoAssigned: true,
      assignmentScore,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });

    // 8. Update table status to "reserved"
    await ctx.db.patch(tableId, {
      status: "reserved",
      updatedAt: now,
    });

    // 9. Audit log
    await ctx.db.insert("audit_log", {
      orgId: args.orgId,
      actorType:
        args.source === "manual" || args.source === "phone"
          ? "staff"
          : args.source === "ai"
            ? "system"
            : "user",
      actorId: args.source === "manual" ? "dashboard" : "public",
      action: "reservation.created",
      resourceType: "reservations",
      resourceId: reservationId,
      after: {
        tableId,
        customerId: args.customerId,
        startAt: args.startAt,
        partySize: args.partySize,
        status,
      },
      createdAt: now,
    });

    // 10. Queue confirmation notification
    const contact = getPrimaryContact(customer);
    if (contact) {
      await ctx.runMutation(internal.notifications.scheduleNotification, {
        orgId: args.orgId,
        customerId: args.customerId,
        channel: contact.channel,
        type: status === "confirmed"
          ? "booking_confirmation"
          : "deposit_request",
        recipientAddress: contact.address,
        templateData: {
          customerName: customer.name,
          partySize: args.partySize,
          startAt: args.startAt,
          tableLabel: table.label,
        },
      });
    }

    return reservationId;
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Status lifecycle mutations
// ─────────────────────────────────────────────────────────────────────────────

export const confirmReservation = mutation({
  args: {
    orgId: v.id("orgs"),
    reservationId: v.id("reservations"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { staffMember } = await requireAuth(ctx, args.orgId);

    const reservation = await ctx.db.get(args.reservationId);
    if (
      !reservation ||
      reservation.orgId !== args.orgId ||
      reservation.isDeleted
    ) {
      throw new ConvexError("Reservation not found.");
    }

    if (reservation.status !== "pending") {
      throw new ConvexError(
        `Cannot confirm reservation with status: ${reservation.status}`,
      );
    }

    const now = Date.now();
    await ctx.db.patch(args.reservationId, {
      status: "confirmed",
      updatedAt: now,
    });

    await ctx.db.insert("audit_log", {
      orgId: args.orgId,
      actorType: "staff",
      actorId: staffMember._id,
      action: "reservation.confirmed",
      resourceType: "reservations",
      resourceId: args.reservationId,
      before: { status: "pending" },
      after: { status: "confirmed" },
      createdAt: now,
    });

    return null;
  },
});

export const seatReservation = mutation({
  args: {
    orgId: v.id("orgs"),
    reservationId: v.id("reservations"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { staffMember } = await requireAuth(ctx, args.orgId);

    const reservation = await ctx.db.get(args.reservationId);
    if (
      !reservation ||
      reservation.orgId !== args.orgId ||
      reservation.isDeleted
    ) {
      throw new ConvexError("Reservation not found.");
    }

    if (reservation.status !== "confirmed") {
      throw new ConvexError(
        `Cannot seat reservation with status: ${reservation.status}`,
      );
    }

    const now = Date.now();
    await ctx.db.patch(args.reservationId, {
      status: "seated",
      updatedAt: now,
    });

    // Update table status to "occupied"
    await ctx.db.patch(reservation.tableId, {
      status: "occupied",
      updatedAt: now,
    });

    await ctx.db.insert("audit_log", {
      orgId: args.orgId,
      actorType: "staff",
      actorId: staffMember._id,
      action: "reservation.seated",
      resourceType: "reservations",
      resourceId: args.reservationId,
      before: { status: "confirmed" },
      after: { status: "seated" },
      createdAt: now,
    });

    return null;
  },
});

export const completeReservation = mutation({
  args: {
    orgId: v.id("orgs"),
    reservationId: v.id("reservations"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { staffMember } = await requireAuth(ctx, args.orgId);

    const reservation = await ctx.db.get(args.reservationId);
    if (
      !reservation ||
      reservation.orgId !== args.orgId ||
      reservation.isDeleted
    ) {
      throw new ConvexError("Reservation not found.");
    }

    if (reservation.status !== "seated") {
      throw new ConvexError(
        `Cannot complete reservation with status: ${reservation.status}`,
      );
    }

    const now = Date.now();
    await ctx.db.patch(args.reservationId, {
      status: "completed",
      updatedAt: now,
    });

    // Update table status to "cleaning"
    await ctx.db.patch(reservation.tableId, {
      status: "cleaning",
      updatedAt: now,
    });

    await ctx.db.insert("audit_log", {
      orgId: args.orgId,
      actorType: "staff",
      actorId: staffMember._id,
      action: "reservation.completed",
      resourceType: "reservations",
      resourceId: args.reservationId,
      before: { status: "seated" },
      after: { status: "completed" },
      createdAt: now,
    });

    return null;
  },
});

export const cancelReservation = mutation({
  args: {
    orgId: v.id("orgs"),
    reservationId: v.id("reservations"),
    cancelledBy: v.string(),
    cancellationReason: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const reservation = await ctx.db.get(args.reservationId);
    if (
      !reservation ||
      reservation.orgId !== args.orgId ||
      reservation.isDeleted
    ) {
      throw new ConvexError("Reservation not found.");
    }

    const terminalStatuses = ["cancelled", "completed", "no_show"];
    if (terminalStatuses.includes(reservation.status)) {
      throw new ConvexError(
        `Cannot cancel reservation already in terminal status: ${reservation.status}`,
      );
    }

    const now = Date.now();
    await ctx.db.patch(args.reservationId, {
      status: "cancelled",
      cancelledAt: now,
      cancelledBy: args.cancelledBy,
      cancellationReason: args.cancellationReason,
      updatedAt: now,
    });

    // Free the table — but only if no other active reservations exist on it
    const otherActive = await ctx.db
      .query("reservations")
      .withIndex("by_table_start", (q) =>
        q.eq("tableId", reservation.tableId).gte("startAt", now),
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("isDeleted"), false),
          q.neq(q.field("status"), "cancelled"),
          q.neq(q.field("status"), "completed"),
          q.neq(q.field("status"), "no_show"),
          q.neq(q.field("_id"), args.reservationId),
        ),
      )
      .first();

    if (!otherActive) {
      await ctx.db.patch(reservation.tableId, {
        status: "available",
        updatedAt: now,
      });
    }

    await ctx.db.insert("audit_log", {
      orgId: args.orgId,
      actorType: args.cancelledBy === "customer" ? "user" : "staff",
      actorId: args.cancelledBy,
      action: "reservation.cancelled",
      resourceType: "reservations",
      resourceId: args.reservationId,
      before: { status: reservation.status },
      after: {
        status: "cancelled",
        reason: args.cancellationReason,
      },
      createdAt: now,
    });

    // Notify customer of cancellation
    const customer = await ctx.db.get(reservation.customerId);
    if (customer) {
      const contact = getPrimaryContact(customer);
      if (contact) {
        await ctx.runMutation(internal.notifications.scheduleNotification, {
          orgId: args.orgId,
          customerId: customer._id,
          channel: contact.channel,
          type: "booking_cancelled",
          recipientAddress: contact.address,
          templateData: {
            customerName: customer.name,
            startAt: reservation.startAt,
            cancellationReason: args.cancellationReason,
          },
        });
      }
    }

    return null;
  },
});

export const markNoShow = mutation({
  args: {
    orgId: v.id("orgs"),
    reservationId: v.id("reservations"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { staffMember } = await requireRole(ctx, args.orgId, "staff");

    const reservation = await ctx.db.get(args.reservationId);
    if (
      !reservation ||
      reservation.orgId !== args.orgId ||
      reservation.isDeleted
    ) {
      throw new ConvexError("Reservation not found.");
    }

    if (reservation.status !== "confirmed") {
      throw new ConvexError(
        `Cannot mark no_show from status: ${reservation.status}`,
      );
    }

    const now = Date.now();
    await ctx.db.patch(args.reservationId, {
      status: "no_show",
      updatedAt: now,
    });

    // Free table
    await ctx.db.patch(reservation.tableId, {
      status: "available",
      updatedAt: now,
    });

    // Update customer no-show stats (same pattern as beauty vertical)
    const customer = await ctx.db.get(reservation.customerId);
    if (customer) {
      const newNoShowCount = (customer.noShowCount || 0) + 1;
      const newTotalVisits = Math.max(customer.totalVisits || 1, 1);
      const riskScore = newNoShowCount / newTotalVisits;

      await ctx.db.patch(reservation.customerId, {
        noShowCount: newNoShowCount,
        noShowRiskScore: riskScore,
        requiresFullDeposit: riskScore >= 0.7,
        updatedAt: now,
      });
    }

    await ctx.db.insert("audit_log", {
      orgId: args.orgId,
      actorType: "staff",
      actorId: staffMember._id,
      action: "reservation.no_show",
      resourceType: "reservations",
      resourceId: args.reservationId,
      before: { status: "confirmed" },
      after: { status: "no_show" },
      createdAt: now,
    });

    return null;
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Read queries
// ─────────────────────────────────────────────────────────────────────────────

export const listReservationsByOrg = query({
  args: {
    orgId: v.id("orgs"),
    date: v.string(), // ISO "YYYY-MM-DD"
    status: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.orgId);

    const dayStartMs = new Date(args.date + "T00:00:00Z").getTime();
    const nextDayMs = dayStartMs + 24 * 60 * 60 * 1000;

    let reservations = await ctx.db
      .query("reservations")
      .withIndex("by_org_start", (q) =>
        q
          .eq("orgId", args.orgId)
          .gte("startAt", dayStartMs)
          .lt("startAt", nextDayMs),
      )
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    if (args.status) {
      reservations = reservations.filter((r) => r.status === args.status);
    }

    // Enrich with customer and table data
    const enriched = await Promise.all(
      reservations.map(async (r) => {
        const customer = await ctx.db.get(r.customerId);
        const table = await ctx.db.get(r.tableId);
        return { ...r, customer, table };
      }),
    );

    return enriched;
  },
});

export const listReservationsByTable = query({
  args: {
    orgId: v.id("orgs"),
    tableId: v.id("tables"),
    date: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.orgId);

    const dayStartMs = new Date(args.date + "T00:00:00Z").getTime();
    const nextDayMs = dayStartMs + 24 * 60 * 60 * 1000;

    const reservations = await ctx.db
      .query("reservations")
      .withIndex("by_table_start", (q) =>
        q
          .eq("tableId", args.tableId)
          .gte("startAt", dayStartMs)
          .lt("startAt", nextDayMs),
      )
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    // Enrich with customer data
    const enriched = await Promise.all(
      reservations.map(async (r) => {
        const customer = await ctx.db.get(r.customerId);
        return { ...r, customer };
      }),
    );

    return enriched;
  },
});

export const getReservation = query({
  args: {
    orgId: v.id("orgs"),
    reservationId: v.id("reservations"),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.orgId);

    const reservation = await ctx.db.get(args.reservationId);
    if (
      !reservation ||
      reservation.orgId !== args.orgId ||
      reservation.isDeleted
    ) {
      return null;
    }

    const customer = await ctx.db.get(reservation.customerId);
    const table = await ctx.db.get(reservation.tableId);
    const floorPlan = await ctx.db.get(reservation.floorPlanId);

    return { ...reservation, customer, table, floorPlan };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard queries
// ─────────────────────────────────────────────────────────────────────────────

export const getCoversToday = query({
  args: { orgId: v.id("orgs") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const now = new Date();
    const dayStr = now.toISOString().split("T")[0];
    const dayStartMs = new Date(dayStr + "T00:00:00Z").getTime();
    const nextDayMs = dayStartMs + 24 * 60 * 60 * 1000;

    const reservations = await ctx.db
      .query("reservations")
      .withIndex("by_org_start", (q) =>
        q.eq("orgId", args.orgId).gte("startAt", dayStartMs).lt("startAt", nextDayMs),
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("isDeleted"), false),
          q.neq(q.field("status"), "cancelled"),
          q.neq(q.field("status"), "no_show"),
        ),
      )
      .collect();

    let total = 0, seated = 0, remaining = 0, completed = 0;
    for (const r of reservations) {
      total += r.partySize;
      if (r.status === "seated") seated += r.partySize;
      if (r.status === "confirmed" || r.status === "pending") remaining += r.partySize;
      if (r.status === "completed") completed += r.partySize;
    }

    return { total, seated, remaining, completed, reservationCount: reservations.length };
  },
});

export const getTableTurnoverStats = query({
  args: { orgId: v.id("orgs") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const now = new Date();
    const dayStr = now.toISOString().split("T")[0];
    const dayStartMs = new Date(dayStr + "T00:00:00Z").getTime();
    const nextDayMs = dayStartMs + 24 * 60 * 60 * 1000;

    const completedToday = await ctx.db
      .query("reservations")
      .withIndex("by_org_start", (q) =>
        q.eq("orgId", args.orgId).gte("startAt", dayStartMs).lt("startAt", nextDayMs),
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("isDeleted"), false),
          q.eq(q.field("status"), "completed"),
        ),
      )
      .collect();

    if (completedToday.length === 0) {
      return { avgMins: 0, fastest: null, slowest: null };
    }

    const durations: Array<{ tableLabel: string; mins: number }> = [];
    for (const r of completedToday) {
      const table = await ctx.db.get(r.tableId);
      durations.push({
        tableLabel: table?.label ?? "?",
        mins: r.durationMins,
      });
    }

    const totalMins = durations.reduce((sum, d) => sum + d.mins, 0);
    const avgMins = Math.round(totalMins / durations.length);
    durations.sort((a, b) => a.mins - b.mins);

    return {
      avgMins,
      fastest: durations[0],
      slowest: durations[durations.length - 1],
    };
  },
});

export const getUpcomingReservations = query({
  args: { orgId: v.id("orgs"), limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const limit = args.limit ?? 5;

    const upcoming = await ctx.db
      .query("reservations")
      .withIndex("by_org_start", (q) =>
        q.eq("orgId", args.orgId).gte("startAt", now),
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("isDeleted"), false),
          q.neq(q.field("status"), "cancelled"),
          q.neq(q.field("status"), "completed"),
          q.neq(q.field("status"), "no_show"),
        ),
      )
      .take(limit);

    const enriched = await Promise.all(
      upcoming.map(async (r) => {
        const customer = await ctx.db.get(r.customerId);
        const table = await ctx.db.get(r.tableId);
        return { ...r, customer, table };
      }),
    );

    return enriched;
  },
});
