import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

export const setSplitConfig = mutation({
    args: {
        orgId: v.id("orgs"),
        serviceId: v.optional(v.id("services")),
        recipients: v.array(
            v.object({
                type: v.union(v.literal("staff"), v.literal("owner"), v.literal("platform")),
                staffId: v.optional(v.id("staff_members")),
                sharePct: v.number(),
                stripeAccountId: v.optional(v.string()), // This maps to PayPal email
            })
        ),
    },
    handler: async (ctx, args) => {
        // 1. Validate total equals 100
        const total = args.recipients.reduce((sum, r) => sum + r.sharePct, 0);
        if (total !== 100) {
            throw new ConvexError("Payout split percentages must sum to exactly 100.");
        }

        // 2. Validate Platform recipient constraints
        const platformRecipients = args.recipients.filter(r => r.type === "platform");
        if (platformRecipients.some(r => r.stripeAccountId)) {
            throw new ConvexError("Platform recipient must not have a stripeAccountId configured.");
        }

        // 3. Upsert logic
        let configId;
        if (args.serviceId) {
            const existing = await ctx.db
                .query("payout_splits")
                .withIndex("by_org_service", (q) =>
                    q.eq("orgId", args.orgId).eq("serviceId", args.serviceId)
                )
                .first();

            if (existing) {
                configId = existing._id;
                await ctx.db.patch(existing._id, {
                    recipients: args.recipients,
                    updatedAt: Date.now(),
                });
            } else {
                configId = await ctx.db.insert("payout_splits", {
                    orgId: args.orgId,
                    serviceId: args.serviceId,
                    recipients: args.recipients,
                    isActive: true,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            }
        } else {
            // Org-level default logic. `serviceId` is theoretically index-able, but since TS doesn't
            // let us easily `.eq("serviceId", undefined)`, we usually filter if serviceId is undefined.
            // Actually, Convex withIndex handles undefined gracefully if the index permits it usually.
            // In our schema serviceId is optional. 
            const allOrgConfigs = await ctx.db
                .query("payout_splits")
                .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
                .collect();

            const existingDefault = allOrgConfigs.find(c => c.serviceId === undefined);

            if (existingDefault) {
                configId = existingDefault._id;
                await ctx.db.patch(existingDefault._id, {
                    recipients: args.recipients,
                    updatedAt: Date.now(),
                });
            } else {
                configId = await ctx.db.insert("payout_splits", {
                    orgId: args.orgId,
                    recipients: args.recipients,
                    isActive: true,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            }
        }

        // 4. Audit Log
        await ctx.db.insert("audit_log", {
            orgId: args.orgId,
            actorType: "system", // Should be staff/owner in a real auth context
            actorId: "dashboard",
            action: "payout_splits.updated",
            resourceType: "payout_splits",
            resourceId: configId,
            after: {
                recipients: args.recipients,
                serviceId: args.serviceId,
            },
            createdAt: Date.now(),
        });

        return configId;
    },
});
