// Marketplace chat message log. Append-only — never edit or delete
// after persistence. The Edge route persists user turns synchronously
// (so retrieve sees them in history) and assistant turns fire-and-forget
// after the Anthropic stream ends.

import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";

const RECOMMENDATION = v.object({
  orgId: v.id("orgs"),
  slug: v.string(),
  reason: v.string(),
  availabilityHint: v.optional(v.string()),
});

export const persistUserTurn = mutation({
  args: {
    conversationId: v.id("marketplace_conversations"),
    content: v.string(),
  },
  handler: async (ctx, { conversationId, content }): Promise<Id<"marketplace_messages">> => {
    const trimmed = content.trim().slice(0, 1000);
    return await ctx.db.insert("marketplace_messages", {
      conversationId,
      role: "user",
      content: trimmed,
      createdAt: Date.now(),
    });
  },
});

export const persistAssistantTurn = mutation({
  args: {
    conversationId: v.id("marketplace_conversations"),
    content: v.string(),
    recommendations: v.optional(v.array(RECOMMENDATION)),
    model: v.optional(v.string()),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Id<"marketplace_messages">> => {
    return await ctx.db.insert("marketplace_messages", {
      conversationId: args.conversationId,
      role: "assistant",
      content: args.content,
      recommendations: args.recommendations,
      model: args.model,
      inputTokens: args.inputTokens,
      outputTokens: args.outputTokens,
      createdAt: Date.now(),
    });
  },
});

// Internal variant — used by retrieve action so the user turn is
// guaranteed to be persisted before the model sees it.
export const persistUserTurnInternal = internalMutation({
  args: {
    conversationId: v.id("marketplace_conversations"),
    content: v.string(),
  },
  handler: async (ctx, { conversationId, content }): Promise<Id<"marketplace_messages">> => {
    const trimmed = content.trim().slice(0, 1000);
    return await ctx.db.insert("marketplace_messages", {
      conversationId,
      role: "user",
      content: trimmed,
      createdAt: Date.now(),
    });
  },
});

export const listMessages = query({
  args: {
    conversationId: v.id("marketplace_conversations"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { conversationId, limit }): Promise<Doc<"marketplace_messages">[]> => {
    return await ctx.db
      .query("marketplace_messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
      .order("asc")
      .take(limit ?? 50);
  },
});

// History pulled by the retrieve action — a small, model-ready slice.
export const recentForContext = internalQuery({
  args: {
    conversationId: v.id("marketplace_conversations"),
    take: v.optional(v.number()),
  },
  handler: async (
    ctx,
    { conversationId, take },
  ): Promise<Array<Pick<Doc<"marketplace_messages">, "role" | "content">>> => {
    const rows = await ctx.db
      .query("marketplace_messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
      .order("desc")
      .take(take ?? 10);
    // Reverse to chronological order for the LLM
    return rows
      .reverse()
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role, content: m.content }));
  },
});
