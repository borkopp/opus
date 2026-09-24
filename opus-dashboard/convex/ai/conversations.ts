import { v, ConvexError } from "convex/values";
import { mutation, query } from "../_generated/server";
import { internal } from "../_generated/api";
import { requireAuth, requirePaidPlan, requireRole } from "../lib/auth";
import { handoff, logEvent } from "./state";
import { automationReady, storeReply } from "./queue";
import { REPLY_LIMIT, REPLY_WINDOW_MS } from "./rules";
import { connectionForOrg } from "./connections";

export const listConversations = query({
  args: {
    orgId: v.id("orgs"),
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("handed_off"),
        v.literal("resolved"),
      ),
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { org } = await requireAuth(ctx, args.orgId);
    requirePaidPlan(org, "AI front desk");
    const scoped = args.status
      ? ctx.db
          .query("ai_conversations")
          .withIndex("by_org_status_updated", (q) =>
            q.eq("orgId", args.orgId).eq("status", args.status!),
          )
      : ctx.db
          .query("ai_conversations")
          .withIndex("by_org_updated", (q) => q.eq("orgId", args.orgId));
    const conversations = await scoped
      .filter((q) => q.neq(q.field("isPreview"), true))
      .order("desc")
      .take(Math.max(1, Math.min(args.limit ?? 50, 100)));
    return Promise.all(
      conversations.map(async (conv) => {
        const customer = conv.customerId
          ? await ctx.db.get(conv.customerId)
          : null;
        const lastMessage = await ctx.db
          .query("ai_messages")
          .withIndex("by_org_conversation", (q) =>
            q.eq("orgId", args.orgId).eq("conversationId", conv._id),
          )
          .order("desc")
          .first();
        return {
          _id: conv._id,
          channel: conv.channel,
          status: conv.status,
          customerName: customer?.orgId === args.orgId ? customer.name : null,
          lastMessagePreview: lastMessage?.content.slice(0, 80) ?? null,
          lastMessageAt: conv.updatedAt,
          bookingCount: conv.bookingIds.length,
          handoffReason: conv.handoffReason,
          createdAt: conv.createdAt,
        };
      }),
    );
  },
});

export const getConversation = query({
  args: { orgId: v.id("orgs"), conversationId: v.id("ai_conversations") },
  handler: async (ctx, args) => {
    const { org } = await requireAuth(ctx, args.orgId);
    requirePaidPlan(org, "AI front desk");
    const conv = await ctx.db.get(args.conversationId);
    if (!conv || conv.orgId !== args.orgId) return null;
    const customer = conv.customerId ? await ctx.db.get(conv.customerId) : null;
    return {
      ...conv,
      customer: customer?.orgId === args.orgId ? customer : null,
    };
  },
});

export const resolveConversation = mutation({
  args: { orgId: v.id("orgs"), conversationId: v.id("ai_conversations") },
  handler: async (ctx, args) => {
    const { org, staffMember } = await requireRole(ctx, args.orgId, "staff");
    requirePaidPlan(org, "AI front desk");
    const conv = await ctx.db.get(args.conversationId);
    if (!conv || conv.orgId !== args.orgId)
      throw new ConvexError("Conversation not found.");
    await ctx.db.patch(conv._id, {
      status: "resolved",
      pendingBooking: undefined,
      updatedAt: Date.now(),
    });
    await logEvent(
      ctx,
      args.orgId,
      conv._id,
      "ai_conversation.resolved",
      undefined,
      "staff",
      staffMember._id,
    );
  },
});

export const handoffConversation = mutation({
  args: {
    orgId: v.id("orgs"),
    conversationId: v.id("ai_conversations"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { org, staffMember } = await requireRole(ctx, args.orgId, "staff");
    requirePaidPlan(org, "AI front desk");
    const conv = await ctx.db.get(args.conversationId);
    if (!conv || conv.orgId !== args.orgId)
      throw new ConvexError("Conversation not found.");
    await handoff(ctx, conv, args.reason || "Staff takeover", staffMember._id);
  },
});

export const resumeConversation = mutation({
  args: { orgId: v.id("orgs"), conversationId: v.id("ai_conversations") },
  handler: async (ctx, args) => {
    const { org, staffMember } = await requireRole(ctx, args.orgId, "staff");
    requirePaidPlan(org, "AI front desk");
    const conv = await ctx.db.get(args.conversationId);
    if (!conv || conv.orgId !== args.orgId)
      throw new ConvexError("Conversation not found.");
    const ready = await automationReady(ctx, args.orgId);
    if (!ready)
      throw new ConvexError("Enable AI and connect Instagram before resuming.");
    if (
      conv.channel !== "instagram" ||
      !conv.channelThreadId.startsWith(`${ready.connection.accountId}:`)
    )
      throw new ConvexError(
        "This conversation belongs to a different Instagram connection.",
      );
    const outgoing = await ctx.db
      .query("ai_messages")
      .withIndex("by_org_conversation", (q) =>
        q.eq("orgId", args.orgId).eq("conversationId", conv._id),
      )
      .order("desc")
      .take(20);
    if (
      outgoing.some(
        (message) =>
          message.author === "staff" &&
          ["queued", "sending"].includes(message.deliveryStatus ?? ""),
      )
    )
      throw new ConvexError(
        "Wait for your reply to finish sending before resuming AI.",
      );
    const pending = await ctx.db
      .query("ai_messages")
      .withIndex("by_org_pending", (q) =>
        q
          .eq("orgId", args.orgId)
          .eq("conversationId", conv._id)
          .eq("processingStatus", "pending"),
      )
      .collect();
    for (const message of pending)
      await ctx.db.patch(message._id, { processingStatus: "done" });
    await ctx.db.patch(conv._id, {
      status: "active",
      pendingBooking: undefined,
      handoffReason: undefined,
      processingMessageId: undefined,
      processingLease: undefined,
      processingUntil: undefined,
      updatedAt: Date.now(),
    });
    await logEvent(
      ctx,
      args.orgId,
      conv._id,
      "ai_conversation.resumed",
      { behavior: "Reply to the next incoming message" },
      "staff",
      staffMember._id,
    );
  },
});

export const replyAsStaff = mutation({
  args: {
    orgId: v.id("orgs"),
    conversationId: v.id("ai_conversations"),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const { org, staffMember } = await requireRole(ctx, args.orgId, "staff");
    requirePaidPlan(org, "AI front desk");
    const conv = await ctx.db.get(args.conversationId),
      connection = await connectionForOrg(ctx, args.orgId);
    if (!conv || conv.orgId !== args.orgId || conv.channel !== "instagram")
      throw new ConvexError("Instagram conversation not found.");
    const text = args.text.trim();
    if (!text || text.length > REPLY_LIMIT)
      throw new ConvexError("Enter a reply of 1–1,000 characters.");
    if (
      connection?.status !== "connected" ||
      !connection.accountId ||
      !conv.channelThreadId.startsWith(`${connection.accountId}:`) ||
      (connection.tokenExpiresAt ?? 0) <= Date.now()
    )
      throw new ConvexError("Reconnect Instagram before replying.");
    if ((conv.lastInboundAt ?? 0) <= Date.now() - REPLY_WINDOW_MS)
      throw new ConvexError(
        "The Instagram reply window has closed. Ask the customer to message the studio again.",
      );
    const recent = await ctx.db
      .query("ai_messages")
      .withIndex("by_org_conversation", (q) =>
        q.eq("orgId", args.orgId).eq("conversationId", conv._id),
      )
      .order("desc")
      .take(20);
    if (
      recent.some(
        (m) =>
          m.deliveryStatus === "sending" ||
          (m.author === "staff" && m.deliveryStatus === "queued"),
      )
    )
      throw new ConvexError("Wait for the previous reply to finish sending.");
    await handoff(ctx, conv, "Staff takeover", staffMember._id);
    const messageId = await storeReply(
      ctx,
      { ...conv, processingMessageId: undefined },
      text,
      1,
      { staffId: staffMember._id },
    );
    await ctx.scheduler.runAfter(0, internal.ai.instagram.sendMessage, {
      orgId: args.orgId,
      messageId,
    });
    await ctx.scheduler.runAfter(60_000, internal.ai.delivery.recover, {
      orgId: args.orgId,
      messageId,
    });
    return messageId;
  },
});
