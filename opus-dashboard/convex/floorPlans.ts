import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type QueryCtx } from "./_generated/server";
import { requireHospitality } from "./lib/hospitalityAccess";
import {
  getFloorItemBounds,
  MIN_FLOOR_ROOM_SIZE,
  MAX_FLOOR_ROOM_SIZE,
  MIN_FLOOR_TABLE_SIZE,
  MAX_FLOOR_TABLE_SIZE,
  MIN_FLOOR_FIXTURE_SIZE,
  MAX_FLOOR_FIXTURE_SIZE,
} from "../lib/floor-plan";

const geometry = {
  x: v.number(),
  y: v.number(),
  width: v.number(),
  height: v.number(),
  rotation: v.number(),
  locked: v.boolean(),
};
const fixture = v.object({
  id: v.string(),
  kind: v.union(
    v.literal("wall"),
    v.literal("bar"),
    v.literal("door"),
    v.literal("plant"),
    v.literal("label"),
  ),
  label: v.string(),
  ...geometry,
});
const tableLayout = v.object({
  tableId: v.id("tables"),
  shape: v.union(
    v.literal("rectangle"),
    v.literal("circle"),
    v.literal("booth"),
  ),
  ...geometry,
});

async function areaFor(
  ctx: QueryCtx,
  orgId: Id<"orgs">,
  areaId: Id<"floor_plans">,
) {
  const area = await ctx.db.get(areaId);
  if (!area || area.orgId !== orgId || area.isDeleted)
    throw new ConvexError("Area unavailable.");
  return area;
}

async function areaTables(
  ctx: QueryCtx,
  orgId: Id<"orgs">,
  areaId: Id<"floor_plans">,
) {
  return (
    await ctx.db
      .query("tables")
      .withIndex("by_org_floor_plan", (q) =>
        q.eq("orgId", orgId).eq("floorPlanId", areaId),
      )
      .collect()
  ).filter((table) => !table.isDeleted);
}

function tableSnapshot(table: Doc<"tables">) {
  return {
    tableId: table._id,
    x: table.x,
    y: table.y,
    width: table.width,
    height: table.height,
    rotation: table.rotation,
    shape: table.shape,
    locked: table.layoutLocked ?? false,
  };
}

type Geometry = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
};
function validateGeometry(
  item: Geometry,
  canvasWidth: number,
  canvasHeight: number,
  minSize: number,
  maxSize: number,
) {
  if (
    ![item.x, item.y, item.width, item.height, item.rotation].every(
      Number.isFinite,
    ) ||
    item.width < minSize ||
    item.width > maxSize ||
    item.height < minSize ||
    item.height > maxSize ||
    item.rotation < 0 ||
    item.rotation >= 360
  )
    throw new ConvexError("Choose valid floor-plan dimensions and rotation.");
  const bounds = getFloorItemBounds(item);
  // Floating-point trigonometry can place an exact 90-degree edge a fraction
  // outside the room; tolerate only numerical noise, never visible overflow.
  const tolerance = 1e-6;
  if (
    bounds.x < -tolerance ||
    bounds.y < -tolerance ||
    bounds.x + bounds.width > canvasWidth + tolerance ||
    bounds.y + bounds.height > canvasHeight + tolerance
  )
    throw new ConvexError(
      "Keep every rotated table and fixture inside the room.",
    );
}

export const get = query({
  args: { areaId: v.id("floor_plans") },
  handler: async (ctx, { areaId }) => {
    const { orgId, staffMember } = await requireHospitality(ctx);
    const area = await areaFor(ctx, orgId, areaId);
    const [tables, combinations] = await Promise.all([
      areaTables(ctx, orgId, areaId),
      ctx.db
        .query("table_combinations")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .collect(),
    ]);
    return {
      viewerId: staffMember._id,
      area: {
        ...area,
        layoutRevision: area.layoutRevision ?? 0,
        fixtures: area.fixtures ?? [],
      },
      tables: tables.sort(
        (a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label),
      ),
      combinations: combinations.filter(
        (row) => !row.isDeleted && row.floorPlanId === areaId,
      ),
    };
  },
});

export const save = mutation({
  args: {
    areaId: v.id("floor_plans"),
    expectedRevision: v.number(),
    canvasWidth: v.number(),
    canvasHeight: v.number(),
    tables: v.array(tableLayout),
    fixtures: v.array(fixture),
  },
  handler: async (ctx, args) => {
    const { orgId, staffMember } = await requireHospitality(ctx, "manager");
    const area = await areaFor(ctx, orgId, args.areaId);
    if (
      !Number.isSafeInteger(args.expectedRevision) ||
      args.expectedRevision < 0 ||
      args.expectedRevision >= Number.MAX_SAFE_INTEGER
    )
      throw new ConvexError("Invalid floor-plan revision.");
    if (args.expectedRevision !== (area.layoutRevision ?? 0))
      throw new ConvexError(
        "This floor plan changed. Reload it before saving.",
      );
    if (
      ![args.canvasWidth, args.canvasHeight].every(
        (size) =>
          Number.isFinite(size) &&
          size >= MIN_FLOOR_ROOM_SIZE &&
          size <= MAX_FLOOR_ROOM_SIZE,
      )
    )
      throw new ConvexError("Room dimensions must be between 200 and 4000.");
    if (args.tables.length > 200 || args.fixtures.length > 200)
      throw new ConvexError(
        "A floor plan supports up to 200 tables and 200 fixtures.",
      );

    const tables = await areaTables(ctx, orgId, args.areaId);
    const tableIds = new Set<string>(args.tables.map((table) => table.tableId));
    if (
      tableIds.size !== args.tables.length ||
      tables.length !== args.tables.length ||
      tables.some((table) => !tableIds.has(table._id))
    )
      throw new ConvexError(
        "Table membership changed. Reload the floor plan before saving.",
      );

    const fixtureIds = new Set<string>();
    for (const item of args.fixtures) {
      if (
        !/^[A-Za-z0-9_-]{1,80}$/.test(item.id) ||
        fixtureIds.has(item.id) ||
        tableIds.has(item.id)
      )
        throw new ConvexError("Choose unique valid fixture identifiers.");
      fixtureIds.add(item.id);
      if (
        item.label.length > 120 ||
        (item.kind === "label" && !item.label.trim())
      )
        throw new ConvexError(
          "Fixture labels must be at most 120 characters; text labels cannot be empty.",
        );
      validateGeometry(
        item,
        args.canvasWidth,
        args.canvasHeight,
        MIN_FLOOR_FIXTURE_SIZE,
        MAX_FLOOR_FIXTURE_SIZE,
      );
    }
    for (const table of args.tables)
      validateGeometry(
        table,
        args.canvasWidth,
        args.canvasHeight,
        MIN_FLOOR_TABLE_SIZE,
        MAX_FLOOR_TABLE_SIZE,
      );

    const now = Date.now();
    const revision = args.expectedRevision + 1;
    const fixtures = args.fixtures.map((item) => ({
      ...item,
      label: item.label.trim(),
    }));
    for (const { tableId, locked, ...fields } of args.tables)
      await ctx.db.patch(tableId, {
        ...fields,
        layoutLocked: locked,
        updatedAt: now,
      });
    await ctx.db.patch(area._id, {
      canvasWidth: args.canvasWidth,
      canvasHeight: args.canvasHeight,
      fixtures,
      layoutRevision: revision,
      updatedAt: now,
    });
    await ctx.db.insert("audit_log", {
      orgId,
      actorType: "staff",
      actorId: staffMember._id,
      action: "hospitality.floor_plan_saved",
      resourceType: "floor_plans",
      resourceId: area._id,
      before: {
        revision: area.layoutRevision ?? 0,
        canvasWidth: area.canvasWidth,
        canvasHeight: area.canvasHeight,
        fixtures: area.fixtures ?? [],
        tables: tables.map(tableSnapshot),
      },
      after: {
        revision,
        canvasWidth: args.canvasWidth,
        canvasHeight: args.canvasHeight,
        fixtures,
        tables: args.tables,
      },
      createdAt: now,
    });
    return { areaId: area._id, revision };
  },
});
