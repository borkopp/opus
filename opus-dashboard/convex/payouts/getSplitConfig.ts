import { internalQuery } from "../_generated/server";
import { v } from "convex/values";

export const getSplitConfig = internalQuery({
    args: {
        orgId: v.id("orgs"),
        serviceId: v.optional(v.id("services")),
    },
    handler: async (ctx, args) => {
        // 1. Try to fetch service-specific config
        if (args.serviceId) {
            const serviceConfig = await ctx.db
                .query("payout_splits")
                .withIndex("by_org_service", (q) =>
                    q.eq("orgId", args.orgId).eq("serviceId", args.serviceId)
                )
                .first();

            if (serviceConfig) return serviceConfig;
        }

        // 2. Try to fetch org-level default config
        const allOrgConfigs = await ctx.db
            .query("payout_splits")
            .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
            .collect();

        const orgDefaultConfig = allOrgConfigs.find(c => c.serviceId === undefined);

        if (orgDefaultConfig) return orgDefaultConfig;

        // 3. Fallback: 100% owner split if nothing exists
        return {
            _id: "default_fallback" as any,
            _creationTime: Date.now(),
            orgId: args.orgId,
            recipients: [
                {
                    type: "owner" as const,
                    sharePct: 100,
                },
            ],
            isActive: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
    },
});
