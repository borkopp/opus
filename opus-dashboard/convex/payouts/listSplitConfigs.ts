import { query } from "../_generated/server";
import { v } from "convex/values";
import { requireRole } from "../lib/auth";

export const listSplitConfigs = query({
    args: {
        orgId: v.id("orgs"),
    },
    handler: async (ctx, args) => {
        await requireRole(ctx, args.orgId, "manager");
        const configs = await ctx.db
            .query("payout_splits")
            .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
            .collect();

        return configs;
    },
});
