import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { connectionForOrg, providerReadiness } from "./connections";
import { automationReady } from "./queue";
import { handoff, logEvent } from "./state";
import { REPLY_WINDOW_MS } from "./rules";
import { hasPersonalBookingAccess } from "../lib/staffAccess";

export const claim = internalMutation({
  args: { orgId: v.id("orgs"), messageId: v.id("ai_messages") },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (
      !message ||
      message.orgId !== args.orgId ||
      message.deliveryStatus !== "queued"
    )
      return null;
    const conv = await ctx.db.get(message.conversationId),
      org = await ctx.db.get(args.orgId);
    const connection = await connectionForOrg(ctx, args.orgId);
    if (
      !conv ||
      conv.orgId !== args.orgId ||
      !org ||
      org.isDeleted ||
      org.plan !== "paid" ||
      org.industry !== "beauty_wellness"
    )
      return null;
    if (message.author === "staff") {
      const member = message.authorStaffId
        ? await ctx.db.get(message.authorStaffId)
        : null;
      const user = message.authorUserId
        ? await ctx.db.get(message.authorUserId)
        : null;
      // A scheduled reply does not retain permissions after its author loses
      // studio access. Legacy queued replies lack verifiable authorship.
      if (
        !member ||
        member.orgId !== args.orgId ||
        member.isDeleted ||
        !member.isActive ||
        hasPersonalBookingAccess(member) ||
        !user ||
        user.isDeleted ||
        member.userId !== user._id
      ) {
        await ctx.db.patch(message._id, {
          deliveryStatus: "failed",
          deliveryError: "The reply author's studio access changed.",
        });
        await handoff(
          ctx,
          conv,
          "Reply was not sent because the author's studio access changed.",
        );
        await logEvent(ctx, args.orgId, conv._id, "ai.message_failed", {
          messageId: message._id,
          reason: "author_access_changed",
        });
        return null;
      }
    }
    const ready =
      message.author === "staff"
        ? providerReadiness().instagram
        : !!(await automationReady(ctx, args.orgId));
    const validState =
      message.author === "staff"
        ? conv.status === "handed_off"
        : conv.processingMessageId === message.replyToMessageId &&
          !!conv.processingMessageId &&
          (conv.status === "active" ||
            (conv.status === "handed_off" && message.handoffNotice));
    const matchesAccount =
      connection?.accountId &&
      conv.channelThreadId.startsWith(`${connection.accountId}:`);
    if (
      !ready ||
      !validState ||
      !matchesAccount ||
      connection?.status !== "connected" ||
      !connection.tokenCiphertext ||
      (connection.tokenExpiresAt ?? 0) <= Date.now() ||
      (conv.lastInboundAt ?? 0) <= Date.now() - REPLY_WINDOW_MS
    ) {
      await ctx.db.patch(message._id, {
        deliveryStatus: "failed",
        deliveryError:
          "Reply paused, connection unavailable, or Instagram reply window expired.",
      });
      await handoff(
        ctx,
        conv,
        "Reply was not sent. Check the channel connection and Instagram reply window.",
      );
      return null;
    }
    await ctx.db.patch(message._id, { deliveryStatus: "sending" });
    await ctx.scheduler.runAfter(60_000, internal.ai.delivery.recover, args);
    return {
      content: message.content,
      accountId: connection.accountId!,
      recipientId: conv.channelThreadId.slice(connection.accountId!.length + 1),
      tokenCiphertext: connection.tokenCiphertext,
    };
  },
});

export const complete = internalMutation({
  args: {
    orgId: v.id("orgs"),
    messageId: v.id("ai_messages"),
    status: v.union(
      v.literal("sent"),
      v.literal("failed"),
      v.literal("uncertain"),
    ),
    providerMessageId: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (
      !message ||
      message.orgId !== args.orgId ||
      message.deliveryStatus === "sent"
    )
      return;
    const conv = await ctx.db.get(message.conversationId);
    if (!conv || conv.orgId !== args.orgId) return;
    await ctx.db.patch(message._id, {
      deliveryStatus: args.status,
      providerMessageId: args.providerMessageId,
      deliveryError: args.error,
      sentAt: args.status === "sent" ? Date.now() : undefined,
    });
    await logEvent(ctx, args.orgId, conv._id, `ai.message_${args.status}`, {
      messageId: message._id,
      error: args.error,
    });
    if (args.status === "sent") {
      const connection = await connectionForOrg(ctx, args.orgId);
      if (connection)
        await ctx.db.patch(connection._id, { lastSentAt: Date.now() });
    } else
      await handoff(
        ctx,
        conv,
        args.status === "uncertain"
          ? "Delivery could not be confirmed. Check Instagram before replying to avoid a duplicate."
          : "Instagram rejected the reply. The team needs to follow up.",
      );
  },
});

export const recover = internalMutation({
  args: { orgId: v.id("orgs"), messageId: v.id("ai_messages") },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (
      !message ||
      message.orgId !== args.orgId ||
      !["queued", "sending"].includes(message.deliveryStatus ?? "")
    )
      return;
    const conv = await ctx.db.get(message.conversationId);
    if (!conv || conv.orgId !== args.orgId) return;
    await ctx.db.patch(message._id, {
      deliveryStatus:
        message.deliveryStatus === "sending" ? "uncertain" : "failed",
      deliveryError: "Delivery stopped. Check Instagram before replying.",
    });
    await handoff(
      ctx,
      conv,
      "Delivery stopped. Check Instagram before replying.",
    );
  },
});
