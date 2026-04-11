import { v, ConvexError } from "convex/values";
import { internalMutation, mutation, query } from "../_generated/server";
import { internal } from "../_generated/api";
import { requireAuth, requireRole } from "../lib/auth";

export const createConversation = mutation({
  args: {
    orgId: v.id("orgs"),
    channel: v.union(v.literal("instagram"), v.literal("webchat")),
    channelThreadId: v.string(),
    customerId: v.optional(v.id("customers")),
  },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("org_settings")
      .withIndex("by_org", q => q.eq("orgId", args.orgId))
      .first();

    if (!settings?.aiEnabled) {
      throw new ConvexError("AI front-desk is not enabled for this business.");
    }

    const channelEnabled =
      args.channel === "webchat" ? settings.aiWebchatEnabled : settings.aiInstagramEnabled;

    if (!channelEnabled) {
      throw new ConvexError(`AI is not enabled for ${args.channel}.`);
    }

    const conversationId = await ctx.db.insert("ai_conversations", {
      orgId: args.orgId,
      customerId: args.customerId,
      channel: args.channel,
      channelThreadId: args.channelThreadId,
      status: "active",
      bookingIds: [],
      totalInputTokens: 0,
      totalOutputTokens: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await ctx.db.insert("audit_log", {
      orgId: args.orgId,
      actorType: "ai",
      actorId: "system",
      action: "ai_conversation.created",
      resourceType: "ai_conversations",
      resourceId: conversationId,
      after: { channel: args.channel },
      createdAt: Date.now(),
    });

    // Send greeting message if configured
    if (settings.aiGreetingMessage) {
      await ctx.db.insert("ai_messages", {
        orgId: args.orgId,
        conversationId,
        role: "assistant",
        content: settings.aiGreetingMessage,
        confidenceScore: 1.0,
        createdAt: Date.now(),
      });
    }

    return conversationId;
  },
});

export const getConversationByThread = query({
  args: {
    channel: v.union(v.literal("instagram"), v.literal("webchat")),
    channelThreadId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("ai_conversations")
      .withIndex("by_channel_thread", q =>
        q.eq("channel", args.channel).eq("channelThreadId", args.channelThreadId)
      )
      .first();
  },
});

export const listConversations = query({
  args: {
    orgId: v.id("orgs"),
    status: v.optional(v.union(
      v.literal("active"),
      v.literal("handed_off"),
      v.literal("resolved"),
    )),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.orgId);

    const conversations = args.status
      ? await ctx.db
          .query("ai_conversations")
          .withIndex("by_org_status", q => q.eq("orgId", args.orgId).eq("status", args.status!))
          .order("desc")
          .take(args.limit ?? 50)
      : await ctx.db
          .query("ai_conversations")
          .withIndex("by_org", q => q.eq("orgId", args.orgId))
          .order("desc")
          .take(args.limit ?? 50);

    return await Promise.all(
      conversations.map(async conv => {
        const customer = conv.customerId ? await ctx.db.get(conv.customerId) : null;

        const lastMessage = await ctx.db
          .query("ai_messages")
          .withIndex("by_conversation", q => q.eq("conversationId", conv._id))
          .order("desc")
          .first();

        return {
          _id: conv._id,
          channel: conv.channel,
          status: conv.status,
          customerName: customer?.name ?? null,
          lastMessagePreview: lastMessage?.content
            ? lastMessage.content.slice(0, 80)
            : null,
          lastMessageAt: conv.updatedAt,
          bookingCount: conv.bookingIds.length,
          handoffReason: conv.handoffReason,
          createdAt: conv.createdAt,
        };
      })
    );
  },
});

export const getConversation = query({
  args: {
    orgId: v.id("orgs"),
    conversationId: v.id("ai_conversations"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.orgId);

    const conv = await ctx.db.get(args.conversationId);
    if (!conv || conv.orgId !== args.orgId) return null;

    const customer = conv.customerId ? await ctx.db.get(conv.customerId) : null;

    return { ...conv, customer: customer ?? null };
  },
});

export const resolveConversation = mutation({
  args: {
    orgId: v.id("orgs"),
    conversationId: v.id("ai_conversations"),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.orgId, "staff");

    const conv = await ctx.db.get(args.conversationId);
    if (!conv || conv.orgId !== args.orgId) throw new ConvexError("Conversation not found.");

    await ctx.db.patch(args.conversationId, {
      status: "resolved",
      updatedAt: Date.now(),
    });

    await ctx.db.insert("audit_log", {
      orgId: args.orgId,
      actorType: "staff",
      action: "ai_conversation.resolved",
      resourceType: "ai_conversations",
      resourceId: args.conversationId,
      createdAt: Date.now(),
    });
  },
});

export const handoffConversation = mutation({
  args: {
    orgId: v.id("orgs"),
    conversationId: v.id("ai_conversations"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const conv = await ctx.db.get(args.conversationId);
    if (!conv || conv.orgId !== args.orgId) throw new ConvexError("Conversation not found.");
    if (conv.status !== "active") return; // already handed off or resolved

    await ctx.db.patch(args.conversationId, {
      status: "handed_off",
      handedOffAt: Date.now(),
      handoffReason: args.reason,
      updatedAt: Date.now(),
    });

    await ctx.db.insert("ai_messages", {
      orgId: args.orgId,
      conversationId: args.conversationId,
      role: "assistant",
      content: `Conversation handed off to a human. Reason: ${args.reason}`,
      actionType: "handoff_triggered",
      createdAt: Date.now(),
    });

    await ctx.db.insert("audit_log", {
      orgId: args.orgId,
      actorType: "ai",
      actorId: "system",
      action: "ai_conversation.handed_off",
      resourceType: "ai_conversations",
      resourceId: args.conversationId,
      after: { reason: args.reason },
      createdAt: Date.now(),
    });
  },
});

export const updateTokenUsage = internalMutation({
  args: {
    conversationId: v.id("ai_conversations"),
    inputTokens: v.number(),
    outputTokens: v.number(),
  },
  handler: async (ctx, args) => {
    const conv = await ctx.db.get(args.conversationId);
    if (!conv) return;

    await ctx.db.patch(args.conversationId, {
      totalInputTokens: conv.totalInputTokens + args.inputTokens,
      totalOutputTokens: conv.totalOutputTokens + args.outputTokens,
      updatedAt: Date.now(),
    });
  },
});

export const addBookingToConversation = internalMutation({
  args: {
    conversationId: v.id("ai_conversations"),
    bookingId: v.id("bookings"),
  },
  handler: async (ctx, args) => {
    const conv = await ctx.db.get(args.conversationId);
    if (!conv) return;

    await ctx.db.patch(args.conversationId, {
      bookingIds: [...conv.bookingIds, args.bookingId],
      updatedAt: Date.now(),
    });
  },
});
