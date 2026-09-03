import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery, query } from "../_generated/server";
import { requireAuth, requirePaidPlan } from "../lib/auth";

export const saveMessage = internalMutation({
  args: {
    orgId: v.id("orgs"),
    conversationId: v.id("ai_conversations"),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
    content: v.string(),
    model: v.optional(v.string()),
    confidenceScore: v.optional(v.number()),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    actionType: v.optional(v.union(
      v.literal("booking_created"),
      v.literal("booking_cancelled"),
      v.literal("booking_rescheduled"),
      v.literal("handoff_triggered"),
    )),
    actionReferenceId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.orgId);
    if (!org || org.isDeleted) throw new ConvexError("Business not found");
    requirePaidPlan(org, "AI front desk");
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.orgId !== args.orgId) {
      throw new ConvexError("Conversation not found");
    }

    const messageId = await ctx.db.insert("ai_messages", {
      orgId: args.orgId,
      conversationId: args.conversationId,
      role: args.role,
      content: args.content,
      model: args.model,
      confidenceScore: args.confidenceScore,
      inputTokens: args.inputTokens,
      outputTokens: args.outputTokens,
      actionType: args.actionType,
      actionReferenceId: args.actionReferenceId,
      createdAt: Date.now(),
    });

    await ctx.db.patch(args.conversationId, { updatedAt: Date.now() });

    return messageId;
  },
});

export const listMessages = query({
  args: {
    orgId: v.id("orgs"),
    conversationId: v.id("ai_conversations"),
  },
  handler: async (ctx, args) => {
    const { org } = await requireAuth(ctx, args.orgId);
    requirePaidPlan(org, "AI front desk");
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.orgId !== args.orgId) return [];

    return await ctx.db
      .query("ai_messages")
      .withIndex("by_conversation", q => q.eq("conversationId", args.conversationId))
      .filter(q => q.neq(q.field("role"), "system"))
      .order("asc")
      .collect();
  },
});

// Used by the public webchat API route — no end-user auth, but verifies org ownership via conversation
export const listMessagesForWebchat = query({
  args: {
    orgId: v.id("orgs"),
    conversationId: v.id("ai_conversations"),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.orgId);
    if (!org || org.isDeleted) return [];
    requirePaidPlan(org, "AI front desk");

    // Security: verify the conversation belongs to the claimed org before returning messages
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.orgId !== args.orgId) return [];

    return await ctx.db
      .query("ai_messages")
      .withIndex("by_conversation", q => q.eq("conversationId", args.conversationId))
      .filter(q => q.neq(q.field("role"), "system"))
      .order("asc")
      .collect();
  },
});

// Used internally by the AI action — no auth, includes all roles
export const listMessagesInternal = internalQuery({
  args: {
    conversationId: v.id("ai_conversations"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return [];
    const org = await ctx.db.get(conversation.orgId);
    if (!org || org.isDeleted) return [];
    requirePaidPlan(org, "AI front desk");

    const all = await ctx.db
      .query("ai_messages")
      .withIndex("by_conversation", q => q.eq("conversationId", args.conversationId))
      .order("asc")
      .collect();

    const limit = args.limit ?? 20;
    return all.slice(-limit);
  },
});
