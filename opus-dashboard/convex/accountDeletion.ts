import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireUser } from "./lib/auth";
import { deliverEmail, emailFromForRoute, providerOrderForRoute } from "./lib/emailDelivery";
import { eraseRequestedAccount } from "./lib/accountErasure";

const erasureArgs = { userId: v.id("users"), businessDataReviewed: v.literal(true), retentionReview: v.string() };

const PROCESSING_DAYS = 30;
const status = v.union(v.null(), v.object({ requestedAt: v.number(), dueAt: v.number() }));
const requestStatus = (requestedAt: number | undefined) => requestedAt === undefined ? null : ({ requestedAt, dueAt: requestedAt + PROCESSING_DAYS * 86400000 });

export const getStatus = query({
  args: {}, returns: status,
  handler: async (ctx) => requestStatus((await requireUser(ctx)).user.accountDeletionRequestedAt),
});

/** No caller-supplied identity, email, or studio. Filing does not change studio access or billing. */
export const request = mutation({
  args: { confirmation: v.literal("delete-my-account") }, returns: status,
  handler: async (ctx) => {
    const { user } = await requireUser(ctx);
    if (user.accountDeletionRequestedAt !== undefined) return requestStatus(user.accountDeletionRequestedAt);
    const now = Date.now();
    await ctx.db.patch(user._id, { accountDeletionRequestedAt: now, updatedAt: now });
    const members = await ctx.db.query("staff_members").withIndex("by_user", (q) => q.eq("userId", user._id)).collect();
    for (const member of members) {
      if (member.isDeleted) continue;
      await ctx.db.insert("audit_log", {
        orgId: member.orgId, actorType: "user", actorId: user._id,
        action: "account.deletion_requested", resourceType: "users", resourceId: user._id,
        after: { requestedAt: now }, createdAt: now,
      });
    }
    await ctx.scheduler.runAfter(0, internal.accountDeletion.notify, { userId: user._id, attempt: 0 });
    return requestStatus(now);
  },
});

export const pendingRequest = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    return user && !user.isDeleted && user.accountDeletionRequestedAt !== undefined && user.accountDeletionNotifiedAt === undefined ? user : null;
  },
});

export const markNotified = internalMutation({
  args: { userId: v.id("users"), requestedAt: v.number() },
  handler: async (ctx, { userId, requestedAt }) => {
    const user = await ctx.db.get(userId);
    if (user && user.accountDeletionRequestedAt === requestedAt)
      await ctx.db.patch(userId, { accountDeletionNotifiedAt: Date.now() });
  },
});

/** Provider delivery runs in an action and retries. The stored request survives delivery failure. */
export const notify = internalAction({
  args: { userId: v.id("users"), attempt: v.number() },
  handler: async (ctx, { userId, attempt }) => {
    const user = await ctx.runQuery(internal.accountDeletion.pendingRequest, { userId });
    if (!user) return;
    const requestedAt = user.accountDeletionRequestedAt!;
    const text = `An authenticated OPUS Studio user requested deletion of their OPUS account and associated personal data.\n\nAccount: ${user.email}\nUser reference: ${user._id}\nRequested: ${new Date(requestedAt).toISOString()}\nProcess by: ${new Date(requestedAt + PROCESSING_DAYS * 86400000).toISOString()}\n\nFollow docs/MOBILE_RELEASE.md. Review studio ownership, subscriptions and required retention before erasure. The user does not need to email or call to complete this request.`;
    try {
      await deliverEmail({
        from: emailFromForRoute("auth"), to: "hello@opus.mk", subject: "OPUS Studio account deletion request",
        text, html: `<pre>${text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>`,
        idempotencyKey: `account-deletion/${user._id}/${requestedAt}`,
        tags: [{ name: "category", value: "account_deletion" }],
      }, { providers: providerOrderForRoute("auth"), route: "auth" });
      await ctx.runMutation(internal.accountDeletion.markNotified, { userId, requestedAt });
    } catch (error) {
      if (attempt < 5) {
        await ctx.scheduler.runAfter(Math.min(3600000, 60000 * 2 ** attempt), internal.accountDeletion.notify, { userId, attempt: attempt + 1 });
        return;
      }
      throw error;
    }
  },
});

/** Deployment-operator query for the documented manual erasure process; never a public admin API. */
export const listPending = internalQuery({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").withIndex("by_account_deletion_requested", (q) => q.gt("accountDeletionRequestedAt", 0)).take(100);
    return users.filter((user) => !user.isDeleted).map((user) => ({
      userId: user._id, email: user.email, authUserId: user.authUserId,
      ...requestStatus(user.accountDeletionRequestedAt), notificationDelivered: user.accountDeletionNotifiedAt !== undefined,
    }));
  },
});

/** Operator-only, after studio records/media and billing have been reviewed. */
export const erase = internalMutation({
  args: erasureArgs,
  handler: async (ctx, { userId, retentionReview }): Promise<{ email: string; requestedAt: number } | null> =>
    eraseRequestedAccount(ctx, userId, retentionReview),
});

/** No public identity arguments. Erasure is atomic; completion email runs in an action. */
export const fulfil = internalAction({
  args: erasureArgs,
  handler: async (ctx, args): Promise<{ erased: boolean; confirmationDelivered: boolean }> => {
    const result = await ctx.runMutation(internal.accountDeletion.erase, args);
    if (!result) return { erased: true, confirmationDelivered: false };
    const text = "Your OPUS account and associated account data have been deleted. You can no longer access studios with this account. Any studio records required to be retained are handled under our privacy policy: https://opus.mk/privacy. Contact hello@opus.mk if you need help.\n\nТвојата OPUS сметка и поврзаните податоци за сметката се избришани. Веќе немаш пристап до студија преку оваа сметка. Записите од студиото што мора да се задржат се обработуваат според политиката за приватност: https://opus.mk/privacy. За помош, контактирај hello@opus.mk.";
    try {
      await deliverEmail({
        from: emailFromForRoute("auth"), to: result.email, subject: "OPUS account deleted / OPUS сметката е избришана",
        text, html: `<p>${text.replace(/\n/g, "<br/>")}</p>`,
        idempotencyKey: `account-deletion-complete/${args.userId}/${result.requestedAt}`,
        tags: [{ name: "category", value: "account_deletion" }],
      }, { providers: providerOrderForRoute("auth"), route: "auth" });
      return { erased: true, confirmationDelivered: true };
    } catch {
      // Do not retain the erased email or undo erasure to retry a notification.
      // The operator uses the original support request to follow up if necessary.
      return { erased: true, confirmationDelivered: false };
    }
  },
});
