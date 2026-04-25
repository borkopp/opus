// Marketplace chat conversation lifecycle. Anonymous-first:
// the client owns a sessionId (UUID in localStorage). On Clerk sign-in,
// linkSessionToOpusUser promotes the row to an opus_users record.

import { v } from "convex/values";
import { mutation, query, internalMutation } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";

export const getOrCreateBySession = mutation({
  args: {
    sessionId: v.string(),
    initialCity: v.optional(v.string()),
    initialCoords: v.optional(v.object({
      lat: v.number(),
      lng: v.number(),
    })),
    locale: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"marketplace_conversations">> => {
    const existing = await ctx.db
      .query("marketplace_conversations")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    const now = Date.now();
    if (existing) {
      // Best-effort updates of derived context — don't overwrite if newer
      // values are absent from the latest call.
      const patch: Partial<Doc<"marketplace_conversations">> = { updatedAt: now };
      if (args.initialCity && !existing.initialCity) patch.initialCity = args.initialCity;
      if (args.initialCoords && !existing.initialCoords) patch.initialCoords = args.initialCoords;
      if (args.locale && !existing.locale) patch.locale = args.locale;
      await ctx.db.patch(existing._id, patch);
      return existing._id;
    }

    return await ctx.db.insert("marketplace_conversations", {
      sessionId: args.sessionId,
      initialCity: args.initialCity,
      initialCoords: args.initialCoords,
      locale: args.locale,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const linkSessionToOpusUser = mutation({
  args: {
    sessionId: v.string(),
    opusUserId: v.id("opus_users"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("marketplace_conversations")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .unique();
    if (!existing) return null;
    if (existing.opusUserId === args.opusUserId) return existing._id;

    await ctx.db.patch(existing._id, {
      opusUserId: args.opusUserId,
      updatedAt: Date.now(),
    });
    return existing._id;
  },
});

export const getBySession = query({
  args: { sessionId: v.string() },
  handler: async (ctx, { sessionId }): Promise<Doc<"marketplace_conversations"> | null> => {
    return await ctx.db
      .query("marketplace_conversations")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .unique();
  },
});

// Internal mirror of getOrCreateBySession — keeps retrieve.ts using
// only internal.* references (cleaner separation between public API
// and action-internal calls).
export const getOrCreateBySessionInternal = internalMutation({
  args: {
    sessionId: v.string(),
    initialCity: v.optional(v.string()),
    initialCoords: v.optional(v.object({
      lat: v.number(),
      lng: v.number(),
    })),
    locale: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"marketplace_conversations">> => {
    const existing = await ctx.db
      .query("marketplace_conversations")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    const now = Date.now();
    if (existing) {
      const patch: Partial<Doc<"marketplace_conversations">> = { updatedAt: now };
      if (args.initialCity && !existing.initialCity) patch.initialCity = args.initialCity;
      if (args.initialCoords && !existing.initialCoords) patch.initialCoords = args.initialCoords;
      if (args.locale && !existing.locale) patch.locale = args.locale;
      await ctx.db.patch(existing._id, patch);
      return existing._id;
    }
    return await ctx.db.insert("marketplace_conversations", {
      sessionId: args.sessionId,
      initialCity: args.initialCity,
      initialCoords: args.initialCoords,
      locale: args.locale,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Internal — called by retrieve action to bump token counters.
export const addTokens = internalMutation({
  args: {
    conversationId: v.id("marketplace_conversations"),
    inputTokens: v.number(),
    outputTokens: v.number(),
  },
  handler: async (ctx, { conversationId, inputTokens, outputTokens }) => {
    const c = await ctx.db.get(conversationId);
    if (!c) return;
    await ctx.db.patch(conversationId, {
      totalInputTokens: c.totalInputTokens + inputTokens,
      totalOutputTokens: c.totalOutputTokens + outputTokens,
      updatedAt: Date.now(),
    });
  },
});
