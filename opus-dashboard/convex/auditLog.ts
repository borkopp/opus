import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const insertAuditLog = internalMutation({
  args: {
    orgId: v.id("orgs"),
    actorType: v.union(
      v.literal("user"),
      v.literal("staff"),
      v.literal("ai"),
      v.literal("system"),
      v.literal("webhook"),
      v.literal("opus_user"),
    ),
    actorId: v.optional(v.string()),
    action: v.string(),
    resourceType: v.string(),
    resourceId: v.string(),
    before: v.optional(v.any()),
    after: v.optional(v.any()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("audit_log", {
      ...args,
      createdAt: Date.now(),
    });
  },
});
