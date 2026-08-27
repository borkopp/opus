import { internalQuery } from "../_generated/server";
import { v } from "convex/values";

const recipient = v.object({
    type: v.union(v.literal("staff"), v.literal("owner"), v.literal("platform")),
    staffId: v.optional(v.id("staff_members")),
    sharePct: v.number(),
    payoutAddress: v.optional(v.string()),
});

export const getSplitConfig = internalQuery({
    args: {
        orgId: v.id("orgs"),
        serviceId: v.optional(v.id("services")),
    },
    returns: v.object({ recipients: v.array(recipient) }),
    handler: async (ctx, args) => {
        // 1. Try to fetch service-specific config
        if (args.serviceId) {
            const serviceConfig = await ctx.db
                .query("payout_splits")
                .withIndex("by_org_service", (q) =>
                    q.eq("orgId", args.orgId).eq("serviceId", args.serviceId)
                )
                .first();

            if (serviceConfig) return { recipients: serviceConfig.recipients };
        }

        // 2. Try to fetch org-level default config
        const allOrgConfigs = await ctx.db
            .query("payout_splits")
            .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
            .collect();

        const orgDefaultConfig = allOrgConfigs.find(c => c.serviceId === undefined);

        if (orgDefaultConfig) return { recipients: orgDefaultConfig.recipients };

        // 3. Fallback: 100% owner split if nothing exists
        return {
            recipients: [
                {
                    type: "owner" as const,
                    sharePct: 100,
                },
            ],
        };
    },
});
