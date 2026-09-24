import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { internal } from "../_generated/api";

export async function logEvent(
  ctx: MutationCtx,
  orgId: Id<"orgs">,
  conversationId: string,
  action: string,
  after?: Record<string, unknown>,
  actorType: "ai" | "staff" | "system" | "webhook" = "ai",
  actorId?: string,
) {
  await ctx.db.insert("audit_log", {
    orgId,
    actorType,
    actorId,
    action,
    resourceType: "ai_conversations",
    resourceId: conversationId,
    after,
    createdAt: Date.now(),
  });
}

export async function handoff(
  ctx: MutationCtx,
  conversation: Doc<"ai_conversations">,
  reason: string,
  staffId?: Id<"staff_members">,
) {
  if (conversation.status === "handed_off") return;
  const now = Date.now();
  await ctx.db.patch(conversation._id, {
    status: "handed_off",
    handoffReason: reason.slice(0, 300),
    handedOffAt: now,
    handoffReviewedBy: staffId,
    pendingBooking: undefined,
    updatedAt: now,
  });
  await ctx.db.insert("ai_messages", {
    orgId: conversation.orgId,
    conversationId: conversation._id,
    role: "system",
    content: reason.slice(0, 300),
    actionType: "handoff_triggered",
    createdAt: now,
  });
  await ctx.db.insert("dashboard_notifications", {
    orgId: conversation.orgId,
    type: "ai_handoff",
    title: "AI conversation needs attention",
    body: reason.slice(0, 300),
    conversationId: conversation._id,
    isRead: false,
    isDismissed: false,
    createdAt: now,
  });
  await logEvent(
    ctx,
    conversation.orgId,
    conversation._id,
    "ai_conversation.handed_off",
    { reason: reason.slice(0, 300) },
    staffId ? "staff" : "ai",
    staffId,
  );
}

export async function reserveReply(
  ctx: MutationCtx,
  orgId: Id<"orgs">,
): Promise<boolean> {
  const date = new Date().toISOString().slice(0, 10);
  const configured = Number(process.env.AI_FRONTDESK_DAILY_REPLY_LIMIT ?? 500);
  const limit =
    Number.isInteger(configured) && configured > 0
      ? Math.min(configured, 10_000)
      : 500;
  const usage = await ctx.db
    .query("ai_daily_usage")
    .withIndex("by_org_date", (q) => q.eq("orgId", orgId).eq("date", date))
    .unique();
  if (usage && usage.replies >= limit) return false;
  if (usage)
    await ctx.db.patch(usage._id, {
      replies: usage.replies + 1,
      updatedAt: Date.now(),
    });
  else
    await ctx.db.insert("ai_daily_usage", {
      orgId,
      date,
      replies: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  return true;
}

export async function scheduleNext(
  ctx: MutationCtx,
  orgId: Id<"orgs">,
  conversationId: Id<"ai_conversations">,
) {
  await ctx.scheduler.runAfter(0, internal.ai.agent.processConversation, {
    orgId,
    conversationId,
  });
}
