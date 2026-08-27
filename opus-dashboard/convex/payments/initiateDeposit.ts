"use node";
import { action } from "../_generated/server";
import { v } from "convex/values";
import { getGateway } from "../lib/braintree";
import { internal } from "../_generated/api";
import { ConvexError } from "convex/values";

export const initiateDeposit = action({
    args: {
        orgId: v.id("orgs"),
        bookingId: v.id("bookings"),
        customerId: v.id("customers"),
        amountMinorUnits: v.number(),
        currency: v.string(),
        paymentMethodNonce: v.string(),      // from Braintree Drop-in UI on the frontend
    },
    returns: v.object({ transactionId: v.string(), status: v.string() }),
    handler: async (ctx, args) => {
        await ctx.runQuery(internal.auth.assertOrgRole, {
            orgId: args.orgId,
            role: "staff",
        });
        const org = await ctx.runQuery(internal.orgs.getById, { orgId: args.orgId });
        if (!org?.braintreeMerchantAccountId) throw new ConvexError("Org has no payment account configured.");

        // Braintree uses decimal amounts, not minor units
        const amountDecimal = (args.amountMinorUnits / 100).toFixed(2);

        const gateway = getGateway();
        const result = await gateway.transaction.sale({
            amount: amountDecimal,
            paymentMethodNonce: args.paymentMethodNonce,
            merchantAccountId: org.braintreeMerchantAccountId,
            orderId: args.bookingId,           // traceable reference
            options: {
                submitForSettlement: true,        // charge immediately
            },
        });

        if (!result.success) {
            throw new ConvexError(
                result.message ?? "Payment failed. Please try again."
            );
        }

        await ctx.runMutation(internal.payments.recordPaymentIntent.recordPaymentIntent, {
            orgId: args.orgId,
            bookingId: args.bookingId,
            customerId: args.customerId,
            providerTransactionId: result.transaction.id,
            clientToken: "",                   // not needed post-transaction
            amountMinorUnits: args.amountMinorUnits,
            currency: args.currency,
            status: "processing",
        });

        return {
            transactionId: result.transaction.id,
            status: result.transaction.status,
        };
    },
});
