"use node";

import { ConvexError, v } from "convex/values";
import { internal } from "../_generated/api";
import { action } from "../_generated/server";

export const handleTransactionSettled = action({
  args: { providerTransactionId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const intent = await ctx.runQuery(
      internal.payments.getPaymentIntent.getPaymentIntent,
      { providerTransactionId: args.providerTransactionId },
    );

    if (!intent) throw new ConvexError("Transaction not found.");
    if (intent.status === "succeeded") return null;

    await ctx.runMutation(
      internal.payments.updatePaymentIntentStatus.updatePaymentIntentStatus,
      {
        providerTransactionId: args.providerTransactionId,
        status: "succeeded",
        succeededAt: Date.now(),
      },
    );

    if (intent.bookingId) {
      await ctx.runMutation(internal.bookings.confirmBooking, {
        orgId: intent.orgId,
        bookingId: intent.bookingId,
        paymentIntentId: intent._id,
      });
    }

    return null;
  },
});
