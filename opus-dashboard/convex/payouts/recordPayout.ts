import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

export const recordPayout = internalMutation({
    args: {
        orgId: v.id("orgs"),
        bookingId: v.id("bookings"),
        paymentIntentId: v.id("payment_intents"),
        recipientType: v.union(v.literal("staff"), v.literal("owner"), v.literal("platform")),
        staffId: v.optional(v.id("staff_members")),
        connectedAccountId: v.string(), // This maps to stripeAccountId
        amountMinorUnits: v.number(),
        currency: v.string(),
        providerTransferId: v.optional(v.string()), // This maps to stripeTransferId
        status: v.union(v.literal("pending"), v.literal("in_transit"), v.literal("paid"), v.literal("failed")),
    },
    handler: async (ctx, args) => {
        const payoutId = await ctx.db.insert("payouts", {
            orgId: args.orgId,
            bookingId: args.bookingId,
            paymentIntentId: args.paymentIntentId,
            recipientType: args.recipientType,
            staffId: args.staffId,
            stripeAccountId: args.connectedAccountId, // Map arg to schema field
            amountMinorUnits: args.amountMinorUnits,
            currency: args.currency,
            stripeTransferId: args.providerTransferId, // Map arg to schema field
            status: args.status,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });

        await ctx.db.insert("audit_log", {
            orgId: args.orgId,
            actorType: "system",
            actorId: "paypal_api",
            action: "payout.created",
            resourceType: "payouts",
            resourceId: payoutId,
            after: {
                recipientType: args.recipientType,
                staffId: args.staffId,
                amountMinorUnits: args.amountMinorUnits,
                status: args.status,
            },
            createdAt: Date.now(),
        });

        return payoutId;
    },
});
