import { query } from "../_generated/server";
import { v } from "convex/values";
import { requireRole } from "../lib/auth";

export const getPayoutSummary = query({
    args: {
        orgId: v.id("orgs"),
        staffId: v.optional(v.id("staff_members")),
        fromDate: v.optional(v.number()),
        toDate: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        await requireRole(ctx, args.orgId, "manager");

        const allPayouts = await ctx.db
            .query("payouts")
            .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
            .collect();

        let filtered = allPayouts
            .filter((p) => (args.fromDate ? p.createdAt >= args.fromDate : true))
            .filter((p) => (args.toDate ? p.createdAt <= args.toDate : true));

        if (args.staffId) {
            filtered = filtered.filter(p => p.staffId === args.staffId);
        }

        return {
            totalEarned: filtered.filter(p => p.status === "paid" || p.status === "in_transit").reduce((sum, p) => sum + p.amountMinorUnits, 0),
            pending: filtered.filter(p => p.status === "pending").reduce((sum, p) => sum + p.amountMinorUnits, 0),
            failed: filtered.filter(p => p.status === "failed").reduce((sum, p) => sum + p.amountMinorUnits, 0),
        };
    },
});
