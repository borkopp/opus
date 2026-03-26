import { query } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../lib/auth";
import { ConvexError } from "convex/values";

export const listPayoutsByStaff = query({
    args: {
        orgId: v.id("orgs"),
        staffId: v.id("staff_members"),
        fromDate: v.optional(v.number()),
        toDate: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const { staffMember } = await requireAuth(ctx, args.orgId);

        // Auth checking: Can only view if it's the staff member themselves, or a manager/owner
        if (staffMember._id !== args.staffId && staffMember.role === "staff") {
            throw new ConvexError("Unauthorized to view other staff members payouts.");
        }

        const allPayouts = await ctx.db
            .query("payouts")
            .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
            .collect();

        // In a real production scalable system we would have a `by_org_staffId` index
        const staffPayouts = allPayouts.filter(p => p.staffId === args.staffId);

        // Secondary filtering for dates
        return staffPayouts
            .filter((p) => (args.fromDate ? p.createdAt >= args.fromDate : true))
            .filter((p) => (args.toDate ? p.createdAt <= args.toDate : true))
            .sort((a, b) => b.createdAt - a.createdAt);
    },
});
