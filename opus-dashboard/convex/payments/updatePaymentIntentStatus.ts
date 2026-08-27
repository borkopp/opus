import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import type { Doc } from "../_generated/dataModel";

export const updatePaymentIntentStatus = internalMutation({
    args: {
        providerTransactionId: v.string(),
        status: v.union(
            v.literal("requires_payment_method"),
            v.literal("requires_confirmation"),
            v.literal("requires_action"),
            v.literal("processing"),
            v.literal("succeeded"),
            v.literal("canceled"),
            v.literal("failed")
        ),
        succeededAt: v.optional(v.number()),
        receiptUrl: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const intent = await ctx.db
            .query("payment_intents")
            .withIndex("by_provider_transaction", (q) =>
                q.eq("providerTransactionId", args.providerTransactionId)
            )
            .first();

        if (!intent) {
            throw new ConvexError("Payment intent not found.");
        }

        const updates: Partial<Doc<"payment_intents">> = {
            status: args.status,
            updatedAt: Date.now(),
        };

        if (args.succeededAt !== undefined) updates.succeededAt = args.succeededAt;
        if (args.receiptUrl !== undefined) updates.receiptUrl = args.receiptUrl;

        await ctx.db.patch(intent._id, updates);

        await ctx.db.insert("audit_log", {
            orgId: intent.orgId,
            actorType: "webhook",
            actorId: "braintree_webhook",
            action: "payment.status_changed",
            resourceType: "payment_intents",
            resourceId: intent._id,
            before: { status: intent.status },
            after: { status: args.status },
            createdAt: Date.now(),
        });

        return intent._id;
    },
});
