import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
import { connectionForOrg, providerReadiness } from "./connections";
import { handoff, logEvent, reserveReply, scheduleNext } from "./state";
import {
  handoffReply,
  LEASE_MS,
  REPLY_LIMIT,
  REPLY_WINDOW_MS,
  responseLanguage,
} from "./rules";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

export async function automationReady(
  ctx: Pick<QueryCtx, "db">,
  orgId: Id<"orgs">,
) {
  const org = await ctx.db.get(orgId);
  if (
    !org ||
    org.isDeleted ||
    org.plan !== "paid" ||
    org.industry !== "beauty_wellness"
  )
    return null;
  const settings = await ctx.db
    .query("org_settings")
    .withIndex("by_org", (q) => q.eq("orgId", orgId))
    .first();
  const connection = await connectionForOrg(ctx, orgId);
  const provider = providerReadiness();
  if (
    !settings?.aiEnabled ||
    !settings.aiInstagramEnabled ||
    !provider.ai ||
    !provider.instagram ||
    connection?.status !== "connected" ||
    !connection.tokenCiphertext ||
    !connection.accountId ||
    org.instagramFrontdeskAccountId !== connection.accountId ||
    (connection.tokenExpiresAt ?? 0) <= Date.now()
  )
    return null;
  return { org, settings, connection };
}

export async function leasedConversation(
  ctx: Pick<QueryCtx, "db">,
  args: {
    orgId: Id<"orgs">;
    conversationId: Id<"ai_conversations">;
    lease: string;
  },
) {
  const conversation = await ctx.db.get(args.conversationId);
  if (
    !conversation ||
    conversation.orgId !== args.orgId ||
    conversation.processingLease !== args.lease ||
    (conversation.processingUntil ?? 0) <= Date.now()
  )
    return null;
  const connection = await connectionForOrg(ctx, args.orgId);
  if (
    !connection?.accountId ||
    conversation.channel !== "instagram" ||
    !conversation.channelThreadId.startsWith(`${connection.accountId}:`)
  )
    return null;
  return conversation;
}

export const ingest = internalMutation({
  args: {
    accountId: v.string(),
    senderId: v.string(),
    messageId: v.string(),
    text: v.string(),
    timestamp: v.number(),
    unsupported: v.boolean(),
    echo: v.boolean(),
  },
  handler: async (ctx, event) => {
    const org = await ctx.db
      .query("orgs")
      .withIndex("by_frontdesk_instagram", (q) =>
        q.eq("instagramFrontdeskAccountId", event.accountId),
      )
      .unique();
    if (
      !org ||
      org.isDeleted ||
      org.industry !== "beauty_wellness" ||
      org.plan !== "paid"
    )
      return;
    const orgId = org._id;
    const connection = await connectionForOrg(ctx, orgId);
    if (
      !connection ||
      connection.status === "disconnected" ||
      connection.accountId !== event.accountId
    )
      return;
    const duplicate = await ctx.db
      .query("ai_messages")
      .withIndex("by_org_provider_message", (q) =>
        q.eq("orgId", orgId).eq("providerMessageId", event.messageId),
      )
      .first();
    if (duplicate) return;
    const now = Date.now();
    let conversation = await ctx.db
      .query("ai_conversations")
      .withIndex("by_org_channel_thread", (q) =>
        q
          .eq("orgId", orgId)
          .eq("channel", "instagram")
          .eq("channelThreadId", `${event.accountId}:${event.senderId}`),
      )
      .unique();
    if (event.echo && !conversation) return;
    if (!conversation) {
      const id = await ctx.db.insert("ai_conversations", {
        orgId,
        channel: "instagram",
        channelThreadId: `${event.accountId}:${event.senderId}`,
        status: "active",
        bookingIds: [],
        totalInputTokens: 0,
        totalOutputTokens: 0,
        createdAt: now,
        updatedAt: now,
      });
      conversation = (await ctx.db.get(id))!;
      await logEvent(
        ctx,
        orgId,
        id,
        "ai_conversation.created",
        { channel: "instagram" },
        "webhook",
      );
    }
    const conversationId = conversation._id;
    if (event.echo) {
      // Provider echoes can arrive before our send request returns. Reconcile
      // the in-flight reply instead of treating it as a human takeover.
      const recent = await ctx.db
        .query("ai_messages")
        .withIndex("by_org_conversation", (q) =>
          q.eq("orgId", orgId).eq("conversationId", conversationId),
        )
        .order("desc")
        .take(12);
      const own = recent.find(
        (m) =>
          m.role === "assistant" &&
          m.content === event.text &&
          (m.deliveryStatus === "sending" || m.deliveryStatus === "uncertain"),
      );
      if (own) {
        await ctx.db.patch(own._id, {
          providerMessageId: event.messageId,
          deliveryStatus: "sent",
          sentAt: event.timestamp,
          deliveryError: undefined,
        });
        await logEvent(ctx, orgId, conversationId, "ai.message_sent", {
          messageId: own._id,
          confirmedBy: "echo",
        });
        return;
      }
      await ctx.db.insert("ai_messages", {
        orgId,
        conversationId,
        role: "assistant",
        author: "staff",
        content: event.text || "[Instagram attachment]",
        providerMessageId: event.messageId,
        providerTimestamp: event.timestamp,
        deliveryStatus: "sent",
        createdAt: now,
      });
      await handoff(
        ctx,
        conversation,
        "A team member replied in Instagram. AI is paused.",
      );
      await logEvent(
        ctx,
        orgId,
        conversationId,
        "ai.staff_message_received",
        undefined,
        "webhook",
      );
      return;
    }
    const outOfOrder = event.timestamp < (conversation.lastInboundAt ?? 0);
    if (conversation.status === "resolved" && !outOfOrder) {
      await ctx.db.patch(conversationId, {
        status: "active",
        pendingBooking: undefined,
        handoffReason: undefined,
      });
      conversation = { ...conversation, status: "active" };
    }
    const messageId = await ctx.db.insert("ai_messages", {
      orgId,
      conversationId,
      role: "user",
      content: event.text || "[Instagram attachment — review in Instagram]",
      providerMessageId: event.messageId,
      providerTimestamp: event.timestamp,
      processingStatus: outOfOrder ? "done" : "pending",
      createdAt: now,
    });
    await ctx.db.patch(conversationId, {
      lastInboundAt: Math.max(conversation.lastInboundAt ?? 0, event.timestamp),
      updatedAt: now,
    });
    await ctx.db.patch(connection._id, { lastInboundAt: now });
    await logEvent(
      ctx,
      orgId,
      conversationId,
      "ai.message_received",
      { messageId },
      "webhook",
    );
    if (outOfOrder) return;
    const recent = await ctx.db
      .query("ai_messages")
      .withIndex("by_org_conversation", (q) =>
        q.eq("orgId", orgId).eq("conversationId", conversationId),
      )
      .order("desc")
      .take(80);
    const rateLimited =
      recent.filter((m) => m.role === "user" && m.createdAt > now - 15 * 60_000)
        .length > 30;
    if (
      event.unsupported ||
      event.timestamp <= now - REPLY_WINDOW_MS ||
      rateLimited ||
      !(await automationReady(ctx, orgId))
    ) {
      await ctx.db.patch(messageId, { processingStatus: "done" });
      await handoff(
        ctx,
        conversation,
        event.unsupported
          ? "Review this attachment or long message in Instagram."
          : rateLimited
            ? "This conversation reached the automatic reply limit."
            : "Automatic replies are unavailable or the reply window has expired.",
      );
      return;
    }
    if (conversation.status === "handed_off") {
      await ctx.db.patch(messageId, { processingStatus: "done" });
      return;
    }
    await scheduleNext(ctx, orgId, conversationId);
  },
});

export const claim = internalMutation({
  args: {
    orgId: v.id("orgs"),
    conversationId: v.id("ai_conversations"),
    lease: v.string(),
  },
  handler: async (ctx, args) => {
    const conv = await ctx.db.get(args.conversationId);
    if (
      !conv ||
      conv.orgId !== args.orgId ||
      conv.status !== "active" ||
      conv.channel !== "instagram" ||
      (conv.processingUntil ?? 0) > Date.now()
    )
      return null;
    if (!(await automationReady(ctx, args.orgId))) return null;
    const message = await ctx.db
      .query("ai_messages")
      .withIndex("by_org_pending", (q) =>
        q
          .eq("orgId", args.orgId)
          .eq("conversationId", conv._id)
          .eq("processingStatus", "pending"),
      )
      .first();
    if (!message) return null;
    if (
      (conv.lastInboundAt ?? 0) <= Date.now() - REPLY_WINDOW_MS ||
      !(await reserveReply(ctx, args.orgId))
    ) {
      await handoff(
        ctx,
        conv,
        "Automatic reply allowance or Instagram reply window reached.",
      );
      return null;
    }
    await ctx.db.patch(message._id, { processingStatus: "processing" });
    await ctx.db.patch(conv._id, {
      processingMessageId: message._id,
      processingLease: args.lease,
      processingUntil: Date.now() + LEASE_MS,
    });
    await ctx.scheduler.runAfter(LEASE_MS + 1_000, internal.ai.queue.recover, {
      ...args,
    });
    return message._id;
  },
});

export const runtime = internalQuery({
  args: {
    orgId: v.id("orgs"),
    conversationId: v.id("ai_conversations"),
    lease: v.string(),
  },
  handler: async (ctx, args) => {
    const conversation = await leasedConversation(ctx, args);
    const ready = await automationReady(ctx, args.orgId);
    if (
      !conversation ||
      conversation.status !== "active" ||
      !conversation.processingMessageId ||
      !ready
    )
      return null;
    const message = await ctx.db.get(conversation.processingMessageId);
    if (
      !message ||
      message.orgId !== args.orgId ||
      message.conversationId !== conversation._id
    )
      return null;
    const history = await ctx.db
      .query("ai_messages")
      .withIndex("by_org_conversation", (q) =>
        q.eq("orgId", args.orgId).eq("conversationId", conversation._id),
      )
      .order("desc")
      .take(50);
    const services = (
      await ctx.db
        .query("services")
        .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
        .collect()
    )
      .filter((s) => s.isActive && !s.isDeleted)
      .slice(0, 100);
    return {
      conversation,
      message,
      settings: ready.settings,
      org: ready.org,
      services,
      history: history
        .reverse()
        .filter(
          (m) =>
            m._id !== message._id &&
            m.createdAt <= message.createdAt &&
            !m.actionType &&
            (m.role === "user"
              ? m.processingStatus === "done"
              : m.deliveryStatus === "sent"),
        )
        .slice(-20)
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
    };
  },
});

export const recordUsage = internalMutation({
  args: {
    orgId: v.id("orgs"),
    conversationId: v.id("ai_conversations"),
    input: v.number(),
    output: v.number(),
  },
  handler: async (ctx, args) => {
    const conv = await ctx.db.get(args.conversationId);
    if (!conv || conv.orgId !== args.orgId) return;
    await ctx.db.patch(conv._id, {
      totalInputTokens: conv.totalInputTokens + args.input,
      totalOutputTokens: conv.totalOutputTokens + args.output,
    });
  },
});

export async function storeReply(
  ctx: MutationCtx,
  conv: Doc<"ai_conversations">,
  content: string,
  confidenceScore: number,
  options: {
    model?: string;
    withheld?: boolean;
    staffId?: string;
    handoffNotice?: boolean;
  } = {},
) {
  const messageId = await ctx.db.insert("ai_messages", {
    orgId: conv.orgId,
    conversationId: conv._id,
    role: "assistant",
    author: options.staffId ? "staff" : "ai",
    content: content.slice(0, REPLY_LIMIT),
    confidenceScore,
    model: options.model,
    replyToMessageId: conv.processingMessageId,
    handoffNotice: options.handoffNotice,
    deliveryStatus: options.withheld ? "withheld" : "queued",
    createdAt: Date.now(),
  });
  await logEvent(
    ctx,
    conv.orgId,
    conv._id,
    options.withheld ? "ai.reply_withheld" : "ai.reply_queued",
    { messageId, confidenceScore },
    options.staffId ? "staff" : "ai",
    options.staffId,
  );
  return messageId;
}

export const finish = internalMutation({
  args: {
    orgId: v.id("orgs"),
    conversationId: v.id("ai_conversations"),
    lease: v.string(),
    reply: v.string(),
    confidenceScore: v.number(),
    needsHandoff: v.boolean(),
    model: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const conv = await leasedConversation(ctx, args),
      ready = await automationReady(ctx, args.orgId);
    if (
      !conv ||
      conv.status !== "active" ||
      !conv.processingMessageId ||
      !ready
    )
      return null;
    const existing = await ctx.db
      .query("ai_messages")
      .withIndex("by_org_reply", (q) =>
        q
          .eq("orgId", args.orgId)
          .eq("replyToMessageId", conv.processingMessageId),
      )
      .filter((q) => q.eq(q.field("deliveryStatus"), "queued"))
      .first();
    if (existing) return existing._id;
    const needsHandoff =
      args.needsHandoff ||
      !Number.isFinite(args.confidenceScore) ||
      args.confidenceScore <
        Math.max(0.7, ready.settings.aiConfidenceThreshold) ||
      !args.reply.trim();
    if (needsHandoff) {
      if (args.reply.trim())
        await storeReply(ctx, conv, args.reply, args.confidenceScore, {
          model: args.model,
          withheld: true,
        });
      await handoff(
        ctx,
        conv,
        args.reason ?? "The AI needs the studio team to answer this question.",
      );
      const inbound = await ctx.db.get(conv.processingMessageId);
      return storeReply(
        ctx,
        conv,
        handoffReply(
          responseLanguage(ready.settings.aiLanguage, inbound?.content ?? ""),
          ready.settings.aiHandoffPhoneNumber,
        ),
        1,
        { handoffNotice: true },
      );
    }
    return storeReply(ctx, conv, args.reply, args.confidenceScore, {
      model: args.model,
    });
  },
});

export const release = internalMutation({
  args: {
    orgId: v.id("orgs"),
    conversationId: v.id("ai_conversations"),
    lease: v.string(),
  },
  handler: async (ctx, args) => {
    const conv = await leasedConversation(ctx, args);
    if (!conv) return;
    if (conv.processingMessageId)
      await ctx.db.patch(conv.processingMessageId, {
        processingStatus: "done",
      });
    await ctx.db.patch(conv._id, {
      processingMessageId: undefined,
      processingLease: undefined,
      processingUntil: undefined,
      updatedAt: Date.now(),
    });
    if (conv.status === "active") await scheduleNext(ctx, args.orgId, conv._id);
  },
});

export const recover = internalMutation({
  args: {
    orgId: v.id("orgs"),
    conversationId: v.id("ai_conversations"),
    lease: v.string(),
  },
  handler: async (ctx, args) => {
    const conv = await ctx.db.get(args.conversationId);
    if (
      !conv ||
      conv.orgId !== args.orgId ||
      conv.processingLease !== args.lease ||
      (conv.processingUntil ?? 0) > Date.now()
    )
      return;
    if (conv.processingMessageId) {
      await ctx.db.patch(conv.processingMessageId, {
        processingStatus: "done",
      });
      const replies = await ctx.db
        .query("ai_messages")
        .withIndex("by_org_reply", (q) =>
          q
            .eq("orgId", args.orgId)
            .eq("replyToMessageId", conv.processingMessageId),
        )
        .collect();
      for (const reply of replies)
        if (
          reply.deliveryStatus === "sending" ||
          reply.deliveryStatus === "queued"
        )
          await ctx.db.patch(reply._id, {
            deliveryStatus:
              reply.deliveryStatus === "sending" ? "uncertain" : "failed",
            deliveryError:
              "Processing stopped. Check Instagram before replying.",
          });
    }
    await ctx.db.patch(conv._id, {
      processingMessageId: undefined,
      processingLease: undefined,
      processingUntil: undefined,
    });
    await handoff(
      ctx,
      conv,
      "Message processing stopped. Check Instagram before replying.",
    );
  },
});
