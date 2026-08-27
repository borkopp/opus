import { internalQuery } from "../_generated/server";
import { v } from "convex/values";

export const getPaymentIntent = internalQuery({
    args: {
        id: v.optional(v.id("payment_intents")),
        providerTransactionId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        if (args.id) {
            return await ctx.db.get(args.id);
        }

        if (args.providerTransactionId) {
            return await ctx.db
                .query("payment_intents")
                .withIndex("by_provider_transaction", (q) =>
                    q.eq("providerTransactionId", args.providerTransactionId!)
                )
                .first();
        }

        return null;
    },
});
