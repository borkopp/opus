import { query } from "../_generated/server";
import { v } from "convex/values";

export const listSplitConfigs = query({
    args: {
        orgId: v.id("orgs"),
    },
    handler: async (ctx, args) => {
        // Requires requireAuth implementation here natively in the future
        const configs = await ctx.db
            .query("payout_splits")
            .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
            .collect();

        return configs;
    },
});
