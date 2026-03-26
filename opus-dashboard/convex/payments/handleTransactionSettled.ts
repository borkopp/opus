"use node";
import { action } from "../_generated/server";
import { v } from "convex/values";
import { internal, api } from "../_generated/api";
import { ConvexError } from "convex/values";

// Mock implementation of PayPal Payouts batch creation
async function createPayPalPayoutBatch(payoutItems: any[], bookingId: string) {
    // In reality this would call the https://api-m.paypal.com/v1/payments/payouts API
    // using the @paypal/payouts-sdk or native fetch
    return {
        batch_header: {
            payout_batch_id: `batch_${Date.now()}_${bookingId}`
        },
        items: payoutItems.map(item => ({
            payout_item_id: `transfer_${Date.now()}_${item.sender_item_id}`,
            sender_item_id: item.sender_item_id
        }))
    };
}

export const handleTransactionSettled = action({
    args: { providerTransactionId: v.string() }, // Maps to stripePaymentIntentId
    returns: v.null(),
    handler: async (ctx, args) => {
        const intent = await ctx.runQuery(internal.payments.getPaymentIntent.getPaymentIntent, {
            providerTransactionId: args.providerTransactionId,
        });

        if (!intent) throw new ConvexError("Transaction not found.");
        if (intent.status === "succeeded") return null; // idempotency guard

        const booking = await ctx.runQuery(api.bookings.getBooking, {
            bookingId: intent.bookingId!,
            orgId: intent.orgId
        });

        const splitConfig = await ctx.runQuery(internal.payouts.getSplitConfig.getSplitConfig, {
            orgId: intent.orgId,
            serviceId: booking?.serviceId,
        });

        // Build PayPal Payouts batch (excludes platform recipient)
        const payoutItems = splitConfig.recipients
            .filter((r: any) => r.type !== "platform" && r.stripeAccountId) // stripeAccountId = PayPal email
            .map((r: any) => ({
                recipient_type: "EMAIL",
                amount: {
                    value: (Math.round(intent.amountMinorUnits * r.sharePct / 100) / 100).toFixed(2),
                    currency: intent.currency.toUpperCase(),
                },
                receiver: r.stripeAccountId,     // PayPal email of recipient
                note: `Payout for booking ${intent.bookingId}`,
                sender_item_id: `${intent.bookingId}_${r.type}_${r.staffId ?? "owner"}`,
            }));

        if (payoutItems.length === 0) {
            // No external recipients — just mark as succeeded
            await ctx.runMutation(internal.payments.updatePaymentIntentStatus.updatePaymentIntentStatus, {
                providerTransactionId: args.providerTransactionId,
                status: "succeeded",
                succeededAt: Date.now(),
            });
            return null;
        }

        // Call PayPal Payouts API
        const paypalResponse = await createPayPalPayoutBatch(payoutItems, intent.bookingId!);

        // Record each payout row
        for (const item of paypalResponse.items) {
            const recipient = splitConfig.recipients.find(
                (r: any) => `${intent.bookingId}_${r.type}_${r.staffId ?? "owner"}` === item.sender_item_id
            ) as any;

            await ctx.runMutation(internal.payouts.recordPayout.recordPayout, {
                orgId: intent.orgId,
                bookingId: intent.bookingId!,
                paymentIntentId: intent._id,
                recipientType: recipient!.type,
                staffId: recipient!.staffId,
                connectedAccountId: recipient!.stripeAccountId!, // This maps to stripeAccountId
                amountMinorUnits: Math.round(intent.amountMinorUnits * recipient!.sharePct / 100),
                currency: intent.currency,
                providerTransferId: item.payout_item_id, // This maps to stripeTransferId
                status: "in_transit",
            });
        }

        await ctx.runMutation(internal.payments.updatePaymentIntentStatus.updatePaymentIntentStatus, {
            providerTransactionId: args.providerTransactionId,
            status: "succeeded",
            succeededAt: Date.now(),
        });

        return null;
    },
});
