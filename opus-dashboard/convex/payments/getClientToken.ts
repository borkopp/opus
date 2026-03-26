"use node";
import { action } from "../_generated/server";
import { v } from "convex/values";
import { getGateway } from "../lib/braintree";
import { internal } from "../_generated/api";
import { ConvexError } from "convex/values";

export const getClientToken = action({
    args: { orgId: v.id("orgs") },
    returns: v.string(),
    handler: async (ctx, args) => {
        const org = await ctx.runQuery(internal.orgs.getById, { orgId: args.orgId });
        if (!org?.stripeAccountId) throw new ConvexError("Org has no payment account configured.");

        const gateway = getGateway();
        const response = await gateway.clientToken.generate({
            merchantAccountId: org.stripeAccountId,
        });
        return response.clientToken;
    },
});
