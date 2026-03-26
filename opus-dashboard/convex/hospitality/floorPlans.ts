import { v, ConvexError } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireRole } from "../lib/auth";

// ─────────────────────────────────────────────────────────────────────────────
// Floor Plans — CRUD for restaurant layout canvases
// ─────────────────────────────────────────────────────────────────────────────

export const createFloorPlan = mutation({
  args: {
    orgId: v.id("orgs"),
    name: v.string(),
    canvasWidth: v.optional(v.number()),
    canvasHeight: v.optional(v.number()),
  },
  returns: v.id("floor_plans"),
  handler: async (ctx, args) => {
    const { staffMember } = await requireRole(ctx, args.orgId, "manager");

    // MVP: only one active floor plan per org
    const existing = await ctx.db
      .query("floor_plans")
      .withIndex("by_org_active", (q) =>
        q.eq("orgId", args.orgId).eq("isActive", true),
      )
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .first();

    if (existing) {
      throw new ConvexError(
        "An active floor plan already exists. Deactivate it before creating a new one.",
      );
    }

    const now = Date.now();
    const floorPlanId = await ctx.db.insert("floor_plans", {
      orgId: args.orgId,
      name: args.name,
      canvasWidth: args.canvasWidth ?? 1200,
      canvasHeight: args.canvasHeight ?? 800,
      isActive: true,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("audit_log", {
      orgId: args.orgId,
      actorType: "staff",
      actorId: staffMember._id,
      action: "floor_plan.created",
      resourceType: "floor_plans",
      resourceId: floorPlanId,
      after: { name: args.name },
      createdAt: now,
    });

    return floorPlanId;
  },
});

export const updateFloorPlan = mutation({
  args: {
    orgId: v.id("orgs"),
    floorPlanId: v.id("floor_plans"),
    name: v.optional(v.string()),
    canvasWidth: v.optional(v.number()),
    canvasHeight: v.optional(v.number()),
    backgroundImageUrl: v.optional(v.string()),
    backgroundImageOpacity: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { staffMember } = await requireRole(ctx, args.orgId, "manager");

    const floorPlan = await ctx.db.get(args.floorPlanId);
    if (!floorPlan || floorPlan.orgId !== args.orgId || floorPlan.isDeleted) {
      throw new ConvexError("Floor plan not found.");
    }

    const before = { ...floorPlan };
    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = args.name;
    if (args.canvasWidth !== undefined) updates.canvasWidth = args.canvasWidth;
    if (args.canvasHeight !== undefined) updates.canvasHeight = args.canvasHeight;
    if (args.backgroundImageUrl !== undefined) updates.backgroundImageUrl = args.backgroundImageUrl;
    if (args.backgroundImageOpacity !== undefined) updates.backgroundImageOpacity = args.backgroundImageOpacity;

    await ctx.db.patch(args.floorPlanId, updates);

    await ctx.db.insert("audit_log", {
      orgId: args.orgId,
      actorType: "staff",
      actorId: staffMember._id,
      action: "floor_plan.updated",
      resourceType: "floor_plans",
      resourceId: args.floorPlanId,
      before,
      after: updates,
      createdAt: Date.now(),
    });

    return null;
  },
});

export const getActiveFloorPlan = query({
  args: { orgId: v.id("orgs") },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("floor_plans")
      .withIndex("by_org_active", (q) =>
        q.eq("orgId", args.orgId).eq("isActive", true),
      )
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .first();
  },
});

export const getFloorPlanWithTables = query({
  args: { orgId: v.id("orgs"), floorPlanId: v.id("floor_plans") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const floorPlan = await ctx.db.get(args.floorPlanId);
    if (!floorPlan || floorPlan.orgId !== args.orgId || floorPlan.isDeleted) {
      return null;
    }

    const tables = await ctx.db
      .query("tables")
      .withIndex("by_floor_plan", (q) => q.eq("floorPlanId", args.floorPlanId))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    return { floorPlan, tables };
  },
});
