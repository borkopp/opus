import { v } from "convex/values";
import { internalQuery } from "../_generated/server";

// ─────────────────────────────────────────────────────────────────────────────
// findBestTable — Auto-assignment algorithm (internal query)
// Separated from reservations.ts to avoid circular type inference.
// ─────────────────────────────────────────────────────────────────────────────
export const findBestTable = internalQuery({
  args: {
    orgId: v.id("orgs"),
    startAt: v.number(),
    durationMins: v.number(),
    partySize: v.number(),
  },
  returns: v.union(
    v.object({ tableId: v.id("tables"), score: v.number() }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const endAt = args.startAt + args.durationMins * 60 * 1000;

    // 1. Fetch active floor plan
    const floorPlan = await ctx.db
      .query("floor_plans")
      .withIndex("by_org_active", (q) =>
        q.eq("orgId", args.orgId).eq("isActive", true),
      )
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .first();

    if (!floorPlan) return null;

    // 2. Fetch eligible tables (capacity fit, not deleted, not inactive)
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

    if (eligibleTables.length === 0) return null;

    // 3. Filter out tables with conflicting reservations
    // Use day window for efficient index-based query
    const dayStartMs = new Date(
      new Date(args.startAt).toISOString().split("T")[0] + "T00:00:00Z",
    ).getTime();
    const nextDayMs = dayStartMs + 24 * 60 * 60 * 1000;

    const freeTables: Array<{
      table: (typeof eligibleTables)[0];
      score: number;
    }> = [];

    for (const table of eligibleTables) {
      const tableReservations = await ctx.db
        .query("reservations")
        .withIndex("by_table_start", (q) =>
          q
            .eq("tableId", table._id)
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

      const hasConflict = tableReservations.some(
        (r) => r.startAt < endAt && r.endAt > args.startAt,
      );

      if (!hasConflict) {
        // Score: prefer smallest table that fits the party (minimise wasted capacity)
        const score =
          1 - (table.capacity - args.partySize) / table.capacity;

        freeTables.push({ table, score });
      }
    }

    if (freeTables.length === 0) return null;

    // 4. Sort by score (highest first), then by updatedAt (least recently used first)
    freeTables.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.table.updatedAt - b.table.updatedAt; // prefer less recently used
    });

    return {
      tableId: freeTables[0].table._id,
      score: freeTables[0].score,
    };
  },
});
