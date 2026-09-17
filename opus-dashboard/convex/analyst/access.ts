import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { requireRole } from "../lib/auth";
import { isActiveIndustry } from "../lib/productScope";

export async function requireAnalyst(ctx: QueryCtx) {
  const auth = await requireRole(ctx, undefined, "manager");
  if (!isActiveIndustry(auth.org.industry))
    throw new ConvexError("ANALYST_UNAVAILABLE");
  if (auth.org.plan !== "paid")
    throw new ConvexError("ANALYST_PAID_PLAN_REQUIRED");
  return auth;
}

export async function ownedConversation(
  ctx: QueryCtx,
  orgId: Id<"orgs">,
  userId: Id<"users">,
  id: Id<"analyst_conversations">,
) {
  const conversation = await ctx.db.get(id);
  if (
    !conversation ||
    conversation.orgId !== orgId ||
    conversation.userId !== userId ||
    conversation.isDeleted
  ) {
    throw new ConvexError("ANALYST_NOT_FOUND");
  }
  return conversation;
}

/** Scheduled workers recheck the author's current membership on every read. */
export async function authorAccess(ctx: QueryCtx, turn: Doc<"analyst_turns">) {
  const [org, user, member, conversation] = await Promise.all([
    ctx.db.get(turn.orgId),
    ctx.db.get(turn.userId),
    ctx.db
      .query("staff_members")
      .withIndex("by_org_user", (q) =>
        q.eq("orgId", turn.orgId).eq("userId", turn.userId),
      )
      .first(),
    ctx.db.get(turn.conversationId),
  ]);
  if (
    !org ||
    org.isDeleted ||
    org.plan !== "paid" ||
    !isActiveIndustry(org.industry) ||
    !user ||
    user.isDeleted ||
    !member ||
    member.isDeleted ||
    !member.isActive ||
    member.role === "staff" ||
    !conversation ||
    conversation.isDeleted ||
    conversation.orgId !== turn.orgId ||
    conversation.userId !== turn.userId
  ) {
    throw new ConvexError("ANALYST_ACCESS_CHANGED");
  }
  return { org, user, member };
}
