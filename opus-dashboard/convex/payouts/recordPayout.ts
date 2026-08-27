import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

export const recordPayout = internalMutation({
    args: {
        orgId: v.id("orgs"),
        bookingId: v.id("bookings"),
        paymentIntentId: v.id("payment_intents"),
        recipientType: v.union(v.literal("staff"), v.literal("owner"), v.literal("platform")),
        staffId: v.optional(v.id("staff_members")),
        payoutAddress: v.string(),
        amountMinorUnits: v.number(),
        currency: v.string(),
        providerTransferId: v.optional(v.string()),
        status: v.union(v.literal("pending"), v.literal("in_transit"), v.literal("paid"), v.literal("failed")),
    },
    handler: async (ctx, args) => {
        const payoutId = await ctx.db.insert("payouts", {
            orgId: args.orgId,
            bookingId: args.bookingId,
            paymentIntentId: args.paymentIntentId,
            recipientType: args.recipientType,
            staffId: args.staffId,
            payoutAddress: args.payoutAddress,
            amountMinorUnits: args.amountMinorUnits,
            currency: args.currency,
            providerTransferId: args.providerTransferId,
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
