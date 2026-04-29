// DB-side helpers for the retrieve action. Kept in their own file
// because retrieve.ts is "use node" (uses OpenAI SDK + crypto), and
// "use node" files cannot define queries or mutations.

import { v } from "convex/values";
import { internalQuery } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";

export const getOrgsByIds = internalQuery({
  args: { orgIds: v.array(v.id("orgs")) },
  handler: async (ctx, { orgIds }): Promise<Array<Doc<"orgs">>> => {
    const docs = await Promise.all(orgIds.map((id) => ctx.db.get(id)));
    return docs.filter((d): d is Doc<"orgs"> => d !== null && !d.isDeleted);
  },
});

export const getEmbeddingsByIds = internalQuery({
  args: { ids: v.array(v.id("marketplace_embeddings")) },
  handler: async (ctx, { ids }): Promise<Array<Doc<"marketplace_embeddings">>> => {
    const docs = await Promise.all(ids.map((id) => ctx.db.get(id)));
    return docs.filter((d): d is Doc<"marketplace_embeddings"> => d !== null);
  },
});

export const getAvailableCategories = internalQuery({
  args: { city: v.optional(v.string()) },
  handler: async (ctx, args): Promise<string[]> => {
    const allPublished = await ctx.db
      .query("orgs")
      .withIndex("by_listing_status", (q) => q.eq("listingStatus", "published"))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    const cityOrgs = args.city
      ? allPublished.filter((o) => o.city?.toLowerCase() === args.city!.toLowerCase())
      : allPublished;

    const categoriesSet = new Set(
      cityOrgs
        .map((o) => o.beautyCategory || o.industry)
        .filter(Boolean)
    );
    return Array.from(categoriesSet) as string[];
  },
});

export const checkTableAvailability = internalQuery({
  args: {
    orgIds: v.array(v.id("orgs")),
    atTime: v.number(),
    partySize: v.number(),
  },
  handler: async (ctx, args): Promise<Array<{ orgId: Id<"orgs">; hasAvailability: boolean }>> => {
    const results: Array<{ orgId: Id<"orgs">; hasAvailability: boolean }> = [];
    const startAtMs = args.atTime;
    if (isNaN(startAtMs)) {
      return args.orgIds.map((orgId) => ({ orgId, hasAvailability: false }));
    }

    const durationMins = 120; // Default assumption for availability check
    const endAtMs = startAtMs + durationMins * 60 * 1000;
    
    // Use day window for efficient index-based query
    const dayStartMs = new Date(
      new Date(startAtMs).toISOString().split("T")[0] + "T00:00:00Z"
    ).getTime();
    const nextDayMs = dayStartMs + 24 * 60 * 60 * 1000;

    for (const orgId of args.orgIds) {
      const floorPlan = await ctx.db
        .query("floor_plans")
        .withIndex("by_org_active", (q) => q.eq("orgId", orgId).eq("isActive", true))
        .filter((q) => q.eq(q.field("isDeleted"), false))
        .first();

      if (!floorPlan) {
        results.push({ orgId, hasAvailability: false });
        continue;
      }

      const allTables = await ctx.db
        .query("tables")
        .withIndex("by_floor_plan", (q) => q.eq("floorPlanId", floorPlan._id))
        .filter((q) =>
          q.and(
            q.eq(q.field("isDeleted"), false),
            q.neq(q.field("status"), "inactive")
          )
        )
        .collect();

      const eligibleTables = allTables.filter((t) => {
        if (t.capacity < args.partySize) return false;
        if (t.minCapacity !== undefined && args.partySize < t.minCapacity) return false;
        return true;
      });

      if (eligibleTables.length === 0) {
        results.push({ orgId, hasAvailability: false });
        continue;
      }

      let hasAvailability = false;
      for (const table of eligibleTables) {
        const tableReservations = await ctx.db
          .query("reservations")
          .withIndex("by_table_start", (q) =>
            q
              .eq("tableId", table._id)
              .gte("startAt", dayStartMs)
              .lt("startAt", nextDayMs)
          )
          .filter((q) =>
            q.and(
              q.eq(q.field("isDeleted"), false),
              q.neq(q.field("status"), "cancelled"),
              q.neq(q.field("status"), "completed"),
              q.neq(q.field("status"), "no_show")
            )
          )
          .collect();

        const hasConflict = tableReservations.some(
          (r) => r.startAt < endAtMs && r.endAt > startAtMs
        );

        if (!hasConflict) {
          hasAvailability = true;
          break;
        }
      }

      results.push({ orgId, hasAvailability });
    }

    return results;
  },
});
