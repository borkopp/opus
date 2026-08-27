import { query } from "../_generated/server";
import { v } from "convex/values";
import { requireRole } from "../lib/auth";

export const listPayouts = query({
    args: {
        orgId: v.id("orgs"),
        fromDate: v.optional(v.number()),
        toDate: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        // Requires an owner or manager
        await requireRole(ctx, args.orgId, "manager");

        const payoutsQuery = ctx.db
            .query("payouts")
            .withIndex("by_org", (q) => q.eq("orgId", args.orgId));

        const allPayouts = await payoutsQuery.collect();

        // Secondary filtering for dates
        return allPayouts
            .filter((p) => (args.fromDate ? p.createdAt >= args.fromDate : true))
            .filter((p) => (args.toDate ? p.createdAt <= args.toDate : true))
            .sort((a, b) => b.createdAt - a.createdAt);
    },
});
