import { v, ConvexError } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireAuth, requireRole } from "../lib/auth";

// ─────────────────────────────────────────────────────────────────────────────
// Tables — CRUD for individual tables on a floor plan canvas
// ─────────────────────────────────────────────────────────────────────────────

export const createTable = mutation({
  args: {
    orgId: v.id("orgs"),
    floorPlanId: v.id("floor_plans"),
    label: v.string(),
    capacity: v.number(),
    shape: v.union(
      v.literal("rectangle"),
      v.literal("circle"),
      v.literal("booth"),
    ),
    x: v.number(),
    y: v.number(),
    width: v.number(),
    height: v.number(),
    rotation: v.optional(v.number()),
    minCapacity: v.optional(v.number()),
  },
  returns: v.id("tables"),
  handler: async (ctx, args) => {
    const { staffMember } = await requireRole(ctx, args.orgId, "manager");

    if (args.capacity < 1) {
      throw new ConvexError("Table capacity must be at least 1.");
    }

    // Validate floor plan belongs to org
    const floorPlan = await ctx.db.get(args.floorPlanId);
    if (!floorPlan || floorPlan.orgId !== args.orgId || floorPlan.isDeleted) {
      throw new ConvexError("Floor plan not found.");
    }

    // Validate label is unique within the floor plan
    const existingTables = await ctx.db
      .query("tables")
      .withIndex("by_floor_plan", (q) => q.eq("floorPlanId", args.floorPlanId))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    const duplicate = existingTables.find(
      (t) => t.label.toLowerCase() === args.label.toLowerCase(),
    );
    if (duplicate) {
      throw new ConvexError(
        `A table with label "${args.label}" already exists on this floor plan.`,
      );
    }

    const now = Date.now();
    const tableId = await ctx.db.insert("tables", {
      orgId: args.orgId,
      floorPlanId: args.floorPlanId,
      label: args.label,
      capacity: args.capacity,
      minCapacity: args.minCapacity,
      shape: args.shape,
      x: args.x,
      y: args.y,
      width: args.width,
      height: args.height,
      rotation: args.rotation ?? 0,
      status: "available",
      sortOrder: existingTables.length + 1,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("audit_log", {
      orgId: args.orgId,
      actorType: "staff",
      actorId: staffMember._id,
      action: "table.created",
      resourceType: "tables",
      resourceId: tableId,
      after: { label: args.label, capacity: args.capacity, shape: args.shape },
      createdAt: now,
    });

    return tableId;
  },
});

export const updateTable = mutation({
  args: {
    orgId: v.id("orgs"),
    tableId: v.id("tables"),
    label: v.optional(v.string()),
    capacity: v.optional(v.number()),
    minCapacity: v.optional(v.number()),
    x: v.optional(v.number()),
    y: v.optional(v.number()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    rotation: v.optional(v.number()),
    shape: v.optional(
      v.union(
        v.literal("rectangle"),
        v.literal("circle"),
        v.literal("booth"),
      ),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { staffMember } = await requireRole(ctx, args.orgId, "manager");

    const table = await ctx.db.get(args.tableId);
    if (!table || table.orgId !== args.orgId || table.isDeleted) {
      throw new ConvexError("Table not found.");
    }

    if (args.capacity !== undefined && args.capacity < 1) {
      throw new ConvexError("Table capacity must be at least 1.");
    }

    // If label is changing, check uniqueness
    if (args.label !== undefined && args.label !== table.label) {
      const siblings = await ctx.db
        .query("tables")
        .withIndex("by_floor_plan", (q) =>
          q.eq("floorPlanId", table.floorPlanId),
        )
        .filter((q) =>
          q.and(
            q.eq(q.field("isDeleted"), false),
            q.neq(q.field("_id"), args.tableId),
          ),
        )
        .collect();

      const duplicate = siblings.find(
        (t) => t.label.toLowerCase() === args.label!.toLowerCase(),
      );
      if (duplicate) {
        throw new ConvexError(
          `A table with label "${args.label}" already exists on this floor plan.`,
        );
      }
    }

    const before = { ...table };
    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.label !== undefined) updates.label = args.label;
    if (args.capacity !== undefined) updates.capacity = args.capacity;
    if (args.minCapacity !== undefined) updates.minCapacity = args.minCapacity;
    if (args.x !== undefined) updates.x = args.x;
    if (args.y !== undefined) updates.y = args.y;
    if (args.width !== undefined) updates.width = args.width;
    if (args.height !== undefined) updates.height = args.height;
    if (args.rotation !== undefined) updates.rotation = args.rotation;
    if (args.shape !== undefined) updates.shape = args.shape;

    await ctx.db.patch(args.tableId, updates);

    await ctx.db.insert("audit_log", {
      orgId: args.orgId,
      actorType: "staff",
      actorId: staffMember._id,
      action: "table.updated",
      resourceType: "tables",
      resourceId: args.tableId,
      before,
      after: updates,
      createdAt: Date.now(),
    });

    return null;
  },
});

export const updateTableStatus = mutation({
  args: {
    orgId: v.id("orgs"),
    tableId: v.id("tables"),
    status: v.union(
      v.literal("available"),
      v.literal("reserved"),
      v.literal("occupied"),
      v.literal("cleaning"),
      v.literal("inactive"),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Any authenticated staff member can update table status
    const { staffMember } = await requireAuth(ctx, args.orgId);

    const table = await ctx.db.get(args.tableId);
    if (!table || table.orgId !== args.orgId || table.isDeleted) {
      throw new ConvexError("Table not found.");
    }

    const previousStatus = table.status;
    const now = Date.now();

    await ctx.db.patch(args.tableId, {
      status: args.status,
      updatedAt: now,
    });

    await ctx.db.insert("audit_log", {
      orgId: args.orgId,
      actorType: "staff",
      actorId: staffMember._id,
      action: "table.status_changed",
      resourceType: "tables",
      resourceId: args.tableId,
      before: { status: previousStatus },
      after: { status: args.status },
      createdAt: now,
    });

    return null;
  },
});

export const deleteTable = mutation({
  args: {
    orgId: v.id("orgs"),
    tableId: v.id("tables"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { staffMember } = await requireRole(ctx, args.orgId, "manager");

    const table = await ctx.db.get(args.tableId);
    if (!table || table.orgId !== args.orgId || table.isDeleted) {
      throw new ConvexError("Table not found.");
    }

    // Check for any non-cancelled, non-completed future reservations on this table
    const now = Date.now();
    const futureReservations = await ctx.db
      .query("reservations")
      .withIndex("by_table_start", (q) =>
        q.eq("tableId", args.tableId).gte("startAt", now),
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("isDeleted"), false),
          q.neq(q.field("status"), "cancelled"),
          q.neq(q.field("status"), "completed"),
          q.neq(q.field("status"), "no_show"),
        ),
      )
      .first();

    if (futureReservations) {
      throw new ConvexError(
        "Cannot delete a table with upcoming active reservations. Cancel or reassign them first.",
      );
    }

    const deleteNow = Date.now();
    await ctx.db.patch(args.tableId, {
      isDeleted: true,
      deletedAt: deleteNow,
      updatedAt: deleteNow,
    });

    await ctx.db.insert("audit_log", {
      orgId: args.orgId,
      actorType: "staff",
      actorId: staffMember._id,
      action: "table.deleted",
      resourceType: "tables",
      resourceId: args.tableId,
      before: { label: table.label },
      createdAt: deleteNow,
    });

    return null;
  },
});

export const batchUpdateTablePositions = mutation({
  args: {
    orgId: v.id("orgs"),
    updates: v.array(
      v.object({
        tableId: v.id("tables"),
        x: v.number(),
        y: v.number(),
        rotation: v.number(),
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { staffMember } = await requireRole(ctx, args.orgId, "manager");

    const now = Date.now();
    const tableIds: string[] = [];

    for (const update of args.updates) {
      const table = await ctx.db.get(update.tableId);
      if (!table || table.orgId !== args.orgId || table.isDeleted) {
        throw new ConvexError(`Table ${update.tableId} not found.`);
      }

      await ctx.db.patch(update.tableId, {
        x: update.x,
        y: update.y,
        rotation: update.rotation,
        updatedAt: now,
      });

      tableIds.push(update.tableId);
    }

    // Single audit log entry for the batch
    await ctx.db.insert("audit_log", {
      orgId: args.orgId,
      actorType: "staff",
      actorId: staffMember._id,
      action: "tables.positions_updated",
      resourceType: "tables",
      resourceId: tableIds.join(","),
      after: { count: args.updates.length },
      createdAt: now,
    });

    return null;
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard query — tables with current reservation state
// ─────────────────────────────────────────────────────────────────────────────

export const getTablesWithCurrentReservations = query({
  args: { orgId: v.id("orgs") },
  returns: v.any(),
  handler: async (ctx, args) => {
    // 1. Get active floor plan
    const floorPlan = await ctx.db
      .query("floor_plans")
      .withIndex("by_org_active", (q) =>
        q.eq("orgId", args.orgId).eq("isActive", true),
      )
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .first();

    if (!floorPlan) return { floorPlan: null, tables: [] };

    // 2. Get all tables
    const tables = await ctx.db
      .query("tables")
      .withIndex("by_floor_plan", (q) => q.eq("floorPlanId", floorPlan._id))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    // 3. Get today's active reservations for matching
    const now = Date.now();
    const dayStr = new Date().toISOString().split("T")[0];
    const dayStartMs = new Date(dayStr + "T00:00:00Z").getTime();
    const nextDayMs = dayStartMs + 24 * 60 * 60 * 1000;

    const todayReservations = await ctx.db
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

    // 4. For each table, find current active reservation
    const enriched = await Promise.all(
      tables.map(async (table) => {
        // Current = overlapping with now, or next upcoming
        const currentRes = todayReservations.find(
          (r) =>
            r.tableId === table._id &&
            (r.status === "seated" || r.status === "confirmed" || r.status === "pending") &&
            r.startAt <= now + 30 * 60 * 1000 && r.endAt > now,
        );

        // Include next upcoming if no current
        const nextRes = currentRes
          ? null
          : todayReservations.find(
              (r) =>
                r.tableId === table._id &&
                (r.status === "confirmed" || r.status === "pending") &&
                r.startAt > now,
            );

        const reservation = currentRes || nextRes || null;
        let customer = null;
        if (reservation) {
          customer = await ctx.db.get(reservation.customerId);
        }

        return { ...table, currentReservation: reservation, customer };
      }),
    );

    return { floorPlan, tables: enriched };
  },
});
