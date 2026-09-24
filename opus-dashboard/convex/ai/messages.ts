import { v } from "convex/values";
import { query } from "../_generated/server";
import { requireAuth, requirePaidPlan } from "../lib/auth";

export const listMessages = query({
  args: { orgId: v.id("orgs"), conversationId: v.id("ai_conversations") },
  handler: async (ctx, args) => {
    const { org } = await requireAuth(ctx, args.orgId);
    requirePaidPlan(org, "AI front desk");
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.orgId !== args.orgId) return [];
    const messages = await ctx.db
      .query("ai_messages")
      .withIndex("by_org_conversation", (q) =>
        q.eq("orgId", args.orgId).eq("conversationId", args.conversationId),
      )
      .order("desc")
      .take(200);
    return messages.reverse();
  },
});
