import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

export const recordPaymentIntent = internalMutation({
    args: {
        orgId: v.id("orgs"),
        bookingId: v.id("bookings"),
        customerId: v.id("customers"),
        providerTransactionId: v.string(), // Maps to stripePaymentIntentId
        clientToken: v.string(), // Maps to stripeClientSecret
        amountMinorUnits: v.number(),
        currency: v.string(),
        status: v.union(
            v.literal("requires_payment_method"),
            v.literal("requires_confirmation"),
            v.literal("requires_action"),
            v.literal("processing"),
            v.literal("succeeded"),
            v.literal("canceled"),
            v.literal("failed")
        ),
    },
    handler: async (ctx, args) => {
        const paymentIntentId = await ctx.db.insert("payment_intents", {
            orgId: args.orgId,
            bookingId: args.bookingId,
            customerId: args.customerId,
            stripePaymentIntentId: args.providerTransactionId,
            stripeClientSecret: args.clientToken,
            amountMinorUnits: args.amountMinorUnits,
            currency: args.currency,
            status: args.status,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });

        await ctx.db.insert("audit_log", {
            orgId: args.orgId,
            actorType: "system",
            actorId: "braintree_api",
            action: "payment.created",
            resourceType: "payment_intents",
            resourceId: paymentIntentId,
            after: {
                providerTransactionId: args.providerTransactionId,
                amountMinorUnits: args.amountMinorUnits,
                status: args.status,
            },
            createdAt: Date.now(),
        });

        return paymentIntentId;
    },
});
