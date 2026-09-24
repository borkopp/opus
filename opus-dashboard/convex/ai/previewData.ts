import { ConvexError, v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { requirePaidPlan, requireRole } from "../lib/auth";
import { reserveReply, logEvent } from "./state";
import { providerReadiness } from "./connections";

export const reserve = internalMutation({
  args: { question: v.string() },
  handler: async (ctx, { question }) => {
    const { org, orgId, staffMember } = await requireRole(
      ctx,
      undefined,
      "owner",
    );
    requirePaidPlan(org, "AI front desk");
    if (org.industry !== "beauty_wellness" || !providerReadiness().ai)
      throw new ConvexError("The AI frontdesk provider is not configured yet.");
    const settings = await ctx.db
      .query("org_settings")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .first();
    if (!settings) throw new ConvexError("Settings not found.");
    if (!(await reserveReply(ctx, orgId)))
      throw new ConvexError("The daily AI reply allowance has been reached.");
    const services = (
      await ctx.db
        .query("services")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .collect()
    )
      .filter((s) => !s.isDeleted && s.isActive)
      .slice(0, 100);
    await logEvent(
      ctx,
      orgId,
      settings._id,
      "ai.context_tested",
      undefined,
      "staff",
      staffMember._id,
    );
    const conversationId = await ctx.db.insert("ai_conversations", {
      orgId,
      isPreview: true,
      channel: "webchat",
      channelThreadId: `setup-preview:${Date.now()}`,
      status: "resolved",
      bookingIds: [],
      totalInputTokens: 0,
      totalOutputTokens: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await ctx.db.insert("ai_messages", {
      orgId,
      conversationId,
      role: "user",
      content: question,
      createdAt: Date.now(),
    });
    return {
      orgId,
      conversationId,
      settings,
      studio: {
        name: org.name,
        address: org.address,
        city: org.city,
        phone: org.phone,
        bio: org.bio,
        openingHours: org.openingHours,
        services: services.map((s, i) => ({
          reference: `service_${i + 1}`,
          name: s.name,
          description: s.description,
          durationMins: s.durationMins,
          priceMinorUnits: s.priceMinorUnits,
          currency: s.currency,
        })),
      },
    };
  },
});

export const complete = internalMutation({
  args: {
    orgId: v.id("orgs"),
    conversationId: v.id("ai_conversations"),
    content: v.string(),
    confidenceScore: v.number(),
    inputTokens: v.number(),
    outputTokens: v.number(),
    model: v.string(),
    failed: v.boolean(),
  },
  handler: async (ctx, args) => {
    const conv = await ctx.db.get(args.conversationId);
    if (!conv || conv.orgId !== args.orgId || !conv.isPreview)
      throw new ConvexError("Preview not found.");
    await ctx.db.insert("ai_messages", {
      orgId: args.orgId,
      conversationId: conv._id,
      role: "assistant",
      author: "ai",
      content: args.content,
      confidenceScore: args.confidenceScore,
      model: args.model,
      inputTokens: args.inputTokens,
      outputTokens: args.outputTokens,
      deliveryStatus: "withheld",
      createdAt: Date.now(),
    });
    await ctx.db.patch(conv._id, {
      totalInputTokens: args.inputTokens,
      totalOutputTokens: args.outputTokens,
      updatedAt: Date.now(),
    });
    await logEvent(
      ctx,
      args.orgId,
      conv._id,
      args.failed ? "ai.preview_failed" : "ai.preview_completed",
      { confidenceScore: args.confidenceScore },
    );
  },
});
