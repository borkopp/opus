import { action } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { ConvexError } from "convex/values";

export const handleTransactionFailed = action({
    args: {
        providerTransactionId: v.string(), // Maps to stripePaymentIntentId
        reason: v.string(),
    },
    handler: async (ctx, args) => {
        const intent = await ctx.runQuery(internal.payments.getPaymentIntent.getPaymentIntent, {
            providerTransactionId: args.providerTransactionId,
        });

        if (!intent) throw new ConvexError("Transaction not found.");
        if (intent.status === "failed") return null;

        await ctx.runMutation(internal.payments.updatePaymentIntentStatus.updatePaymentIntentStatus, {
            providerTransactionId: args.providerTransactionId,
            status: "failed",
        });

        // In a fuller implementation, we would either enqueue a notification to the customer
        // or flag the booking for the staff to manually review if deposit required.
        // Right now, an audit log will be generated inherently by `updatePaymentIntentStatus`.

        return null;
    },
});
