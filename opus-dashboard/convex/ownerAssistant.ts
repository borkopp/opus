import { ConvexError, v } from "convex/values";
import { mutation, query, type QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { ownerBusiness } from "./lib/ownerControls";
import {
  allowanceSpend,
  analystPlanLimits,
  usageMonth,
  ANALYST_LIMITS,
} from "./analyst/limits";
import {
  OWNER_MAX_PROMPTS,
  type AssistantAllowance,
} from "../../shared/owner-controls";

async function allowance(
  ctx: QueryCtx,
  org: Doc<"orgs">,
): Promise<AssistantAllowance> {
  const month = usageMonth(Date.now());
  const usage = await ctx.db
    .query("analyst_usage")
    .withIndex("by_org_month", (q) =>
      q.eq("orgId", org._id).eq("monthStartMs", month.startMs),
    )
    .unique();
  const turns = await ctx.db
    .query("analyst_turns")
    .withIndex("by_org_created", (q) =>
      q
        .eq("orgId", org._id)
        .gte("createdAt", Date.now() - ANALYST_LIMITS.leaseMs),
    )
    .take(100);
  const limits = analystPlanLimits(org.plan, org);
  const defaults = analystPlanLimits(org.plan);
  return {
    orgId: org._id,
    plan: org.plan,
    limit: limits.answers,
    deepLimit: limits.deepAnswers,
    defaultLimit: defaults.answers,
    defaultDeepLimit: defaults.deepAnswers,
    custom:
      org.analystPromptLimit !== undefined ||
      org.analystDeepPromptLimit !== undefined,
    used: usage?.answers ?? 0,
    deepUsed: usage?.deepAnswers ?? 0,
    budgetUsedMicroUsd: allowanceSpend(usage),
    budgetMicroUsd: limits.monthlyMicroUsd,
    resetAt: month.resetAt,
    busy:
      (usage?.reservedMicroUsd ?? 0) > 0 ||
      turns.some((t) => t.status === "pending" || t.status === "running"),
  };
}

export const get = query({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, { orgId }) =>
    allowance(ctx, (await ownerBusiness(ctx, orgId)).org),
});

export const update = mutation({
  args: {
    orgId: v.id("orgs"),
    operation: v.union(
      v.literal("reset"),
      v.literal("defaults"),
      v.literal("custom"),
    ),
    limit: v.optional(v.number()),
    deepLimit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<AssistantAllowance> => {
    const { owner, org } = await ownerBusiness(ctx, args.orgId);
    const before = await allowance(ctx, org);
    if (before.busy)
      throw new ConvexError(
        "Wait for the current AI Assistant response to finish, then try again.",
      );
    if (args.operation === "custom") {
      if (
        ![args.limit, args.deepLimit].every(
          (n) =>
            n !== undefined &&
            Number.isSafeInteger(n) &&
            n >= 0 &&
            n <= OWNER_MAX_PROMPTS,
        ) ||
        args.deepLimit! > args.limit! ||
        (org.plan === "free" && args.deepLimit !== 0)
      ) {
        throw new ConvexError(
          "Enter whole-number allowances from 0 to 10,000. Detailed prompts must fit within the total and require Pro.",
        );
      }
      await ctx.db.patch(org._id, {
        analystPromptLimit: args.limit,
        analystDeepPromptLimit: args.deepLimit,
        updatedAt: Date.now(),
      });
    } else if (args.operation === "defaults") {
      await ctx.db.patch(org._id, {
        analystPromptLimit: undefined,
        analystDeepPromptLimit: undefined,
        updatedAt: Date.now(),
      });
    } else {
      const usage = await ctx.db
        .query("analyst_usage")
        .withIndex("by_org_month", (q) =>
          q
            .eq("orgId", org._id)
            .eq("monthStartMs", usageMonth(Date.now()).startMs),
        )
        .unique();
      if (usage)
        await ctx.db.patch(usage._id, {
          answers: 0,
          deepAnswers: 0,
          resetSpentMicroUsd: usage.spentMicroUsd,
          updatedAt: Date.now(),
        });
    }
    const result = await allowance(ctx, (await ctx.db.get(org._id))!);
    await ctx.db.insert("audit_log", {
      orgId: org._id,
      actorType: "user",
      actorId: owner._id,
      action: `owner.assistant_${args.operation}`,
      resourceType: "orgs",
      resourceId: org._id,
      before: {
        limit: before.limit,
        deepLimit: before.deepLimit,
        used: before.used,
        deepUsed: before.deepUsed,
        budgetUsedMicroUsd: before.budgetUsedMicroUsd,
      },
      after: {
        limit: result.limit,
        deepLimit: result.deepLimit,
        used: result.used,
        deepUsed: result.deepUsed,
        budgetUsedMicroUsd: result.budgetUsedMicroUsd,
      },
      createdAt: Date.now(),
    });
    return result;
  },
});
