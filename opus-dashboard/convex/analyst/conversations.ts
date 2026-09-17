import { v, ConvexError } from "convex/values";
import {
  query,
  mutation,
  internalQuery,
  internalMutation,
} from "../_generated/server";
import { internal } from "../_generated/api";
import { requireAuth } from "../lib/auth";
import { isActiveIndustry } from "../lib/productScope";
import {
  answerValidator,
  depthValidator,
  reportValidator,
  type AnalystReport,
} from "./contracts";
import {
  ANALYST_LIMITS,
  ANALYST_MODELS,
  analystConfigured,
  modelCost,
  usageMonth,
} from "./limits";
import { authorAccess, ownedConversation, requireAnalyst } from "./access";
import { ensureScheduleBaseline } from "./schedules";

export function previewReport(report: AnalystReport) {
  return { ...report, rows: report.rows.slice(0, 7) };
}

export const getAccess = query({
  args: {},
  handler: async (ctx) => {
    const { orgId, org, staffMember } = await requireAuth(ctx);
    const month = usageMonth(Date.now());
    const allowed =
      isActiveIndustry(org.industry) && staffMember.role !== "staff";
    const usage =
      allowed && org.plan === "paid"
        ? await ctx.db
            .query("analyst_usage")
            .withIndex("by_org_month", (q) =>
              q.eq("orgId", orgId).eq("monthStartMs", month.startMs),
            )
            .first()
        : null;
    const active =
      allowed && org.plan === "paid"
        ? await ctx.db
            .query("analyst_turns")
            .withIndex("by_org_created", (q) =>
              q
                .eq("orgId", orgId)
                .gte("createdAt", Date.now() - ANALYST_LIMITS.leaseMs),
            )
            .order("desc")
            .take(30)
        : [];
    const spent = (usage?.spentMicroUsd ?? 0) + (usage?.reservedMicroUsd ?? 0);
    const budgetAvailable =
      spent + ANALYST_MODELS.standard.reservation <=
      ANALYST_LIMITS.monthlyMicroUsd;
    const deepBudgetAvailable =
      spent + ANALYST_MODELS.deep.reservation <= ANALYST_LIMITS.monthlyMicroUsd;
    return {
      orgId,
      allowed,
      paid: org.plan === "paid",
      configured: analystConfigured(),
      resetAt: month.resetAt,
      remaining: budgetAvailable
        ? Math.max(0, ANALYST_LIMITS.answers - (usage?.answers ?? 0))
        : 0,
      deepRemaining: deepBudgetAvailable
        ? Math.max(0, ANALYST_LIMITS.deepAnswers - (usage?.deepAnswers ?? 0))
        : 0,
      busy:
        (usage?.reservedMicroUsd ?? 0) > 0 ||
        active.some((t) => t.status === "pending" || t.status === "running"),
      budgetAvailable,
      deepBudgetAvailable,
      limit: ANALYST_LIMITS.answers,
      deepLimit: ANALYST_LIMITS.deepAnswers,
    };
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const { orgId, user } = await requireAnalyst(ctx);
    return ctx.db
      .query("analyst_conversations")
      .withIndex("by_org_user", (q) =>
        q.eq("orgId", orgId).eq("userId", user._id),
      )
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .order("desc")
      .take(30);
  },
});

export const get = query({
  args: { conversationId: v.id("analyst_conversations") },
  handler: async (ctx, { conversationId }) => {
    const { orgId, user } = await requireAnalyst(ctx);
    const conversation = await ownedConversation(
      ctx,
      orgId,
      user._id,
      conversationId,
    );
    const turns = await ctx.db
      .query("analyst_turns")
      .withIndex("by_org_conversation", (q) =>
        q.eq("orgId", orgId).eq("conversationId", conversationId),
      )
      .order("asc")
      .take(ANALYST_LIMITS.maxTurns);
    return {
      conversation,
      turns: turns
        .filter((t) => !t.isDeleted)
        .map((t) => ({
          _id: t._id,
          question: t.question,
          answer: t.answer,
          depth: t.depth,
          status: t.status,
          errorCode: t.errorCode,
          createdAt: t.createdAt,
          reports: t.reports.map(previewReport),
        })),
    };
  },
});

export const getReport = query({
  args: { turnId: v.id("analyst_turns") },
  handler: async (ctx, { turnId }) => {
    const { orgId, user } = await requireAnalyst(ctx);
    const turn = await ctx.db.get(turnId);
    if (
      !turn ||
      turn.orgId !== orgId ||
      turn.userId !== user._id ||
      turn.isDeleted ||
      turn.status !== "completed"
    ) {
      throw new ConvexError("ANALYST_NOT_FOUND");
    }
    await ownedConversation(ctx, orgId, user._id, turn.conversationId);
    return {
      question: turn.question,
      reports: turn.reports,
      createdAt: turn.createdAt,
    };
  },
});

export const send = mutation({
  args: {
    conversationId: v.optional(v.id("analyst_conversations")),
    requestId: v.string(),
    question: v.string(),
    language: v.union(v.literal("en"), v.literal("mk")),
    depth: depthValidator,
  },
  handler: async (ctx, args) => {
    const { orgId, user, staffMember } = await requireAnalyst(ctx);
    const question = args.question.trim();
    if (
      !question ||
      question.length > ANALYST_LIMITS.maxQuestionChars ||
      !/^[a-zA-Z0-9-]{16,64}$/.test(args.requestId)
    ) {
      throw new ConvexError("ANALYST_INVALID_MESSAGE");
    }
    const existing = await ctx.db
      .query("analyst_turns")
      .withIndex("by_org_request", (q) =>
        q
          .eq("orgId", orgId)
          .eq("userId", user._id)
          .eq("requestId", args.requestId),
      )
      .first();
    if (existing) {
      if (existing.isDeleted) throw new ConvexError("ANALYST_NOT_FOUND");
      await ownedConversation(ctx, orgId, user._id, existing.conversationId);
      if (
        existing.question !== question ||
        existing.depth !== args.depth ||
        existing.language !== args.language ||
        (args.conversationId && existing.conversationId !== args.conversationId)
      )
        throw new ConvexError("ANALYST_REQUEST_CONFLICT");
      return { conversationId: existing.conversationId, turnId: existing._id };
    }
    if (!analystConfigured()) throw new ConvexError("ANALYST_NOT_CONFIGURED");
    const now = Date.now(),
      month = usageMonth(now);
    const recent = await ctx.db
      .query("analyst_turns")
      .withIndex("by_org_created", (q) =>
        q.eq("orgId", orgId).gte("createdAt", now - 60_000),
      )
      .take(5);
    const active = await ctx.db
      .query("analyst_turns")
      .withIndex("by_org_created", (q) =>
        q.eq("orgId", orgId).gte("createdAt", now - ANALYST_LIMITS.leaseMs),
      )
      .order("desc")
      .take(30);
    if (active.some((t) => t.status === "pending" || t.status === "running"))
      throw new ConvexError("ANALYST_BUSY");
    if (recent.length >= 5) throw new ConvexError("ANALYST_RATE_LIMIT");
    let conversationId = args.conversationId;
    if (conversationId) {
      await ownedConversation(ctx, orgId, user._id, conversationId);
      const turns = await ctx.db
        .query("analyst_turns")
        .withIndex("by_org_conversation", (q) =>
          q.eq("orgId", orgId).eq("conversationId", conversationId!),
        )
        .take(ANALYST_LIMITS.maxTurns);
      if (turns.length >= ANALYST_LIMITS.maxTurns)
        throw new ConvexError("ANALYST_CONVERSATION_FULL");
    }
    const usage = await ctx.db
      .query("analyst_usage")
      .withIndex("by_org_month", (q) =>
        q.eq("orgId", orgId).eq("monthStartMs", month.startMs),
      )
      .first();
    const reservation = ANALYST_MODELS[args.depth].reservation;
    if ((usage?.reservedMicroUsd ?? 0) > 0)
      throw new ConvexError("ANALYST_BUSY");
    if (
      (usage?.answers ?? 0) >= ANALYST_LIMITS.answers ||
      (args.depth === "deep" &&
        (usage?.deepAnswers ?? 0) >= ANALYST_LIMITS.deepAnswers) ||
      (usage?.spentMicroUsd ?? 0) + reservation > ANALYST_LIMITS.monthlyMicroUsd
    )
      throw new ConvexError("ANALYST_ALLOWANCE_REACHED");
    if (!conversationId)
      conversationId = await ctx.db.insert("analyst_conversations", {
        orgId,
        userId: user._id,
        title: question.slice(0, 90),
        createdAt: now,
        updatedAt: now,
        isDeleted: false,
      });
    else await ctx.db.patch(conversationId, { updatedAt: now });
    const fields = {
      orgId,
      monthStartMs: month.startMs,
      answers: (usage?.answers ?? 0) + 1,
      deepAnswers: (usage?.deepAnswers ?? 0) + (args.depth === "deep" ? 1 : 0),
      spentMicroUsd: usage?.spentMicroUsd ?? 0,
      reservedMicroUsd: reservation,
      updatedAt: now,
    };
    if (usage) await ctx.db.patch(usage._id, fields);
    else await ctx.db.insert("analyst_usage", fields);
    await ensureScheduleBaseline(ctx, orgId);
    const turnId = await ctx.db.insert("analyst_turns", {
      orgId,
      userId: user._id,
      conversationId,
      requestId: args.requestId,
      question,
      language: args.language,
      depth: args.depth,
      model: ANALYST_MODELS[args.depth].name,
      status: "pending",
      reports: [],
      inputTokens: 0,
      outputTokens: 0,
      costMicroUsd: 0,
      reservationMicroUsd: reservation,
      usageMonthMs: month.startMs,
      createdAt: now,
      expiresAt: now + ANALYST_LIMITS.leaseMs,
      isDeleted: false,
    });
    await ctx.db.insert("audit_log", {
      orgId,
      actorType: "staff",
      actorId: staffMember._id,
      action: "analyst.question_submitted",
      resourceType: "analyst_turns",
      resourceId: turnId,
      after: { depth: args.depth },
      createdAt: now,
    });
    await ctx.scheduler.runAfter(0, internal.analyst.agent.run, { turnId });
    await ctx.scheduler.runAfter(
      ANALYST_LIMITS.leaseMs,
      internal.analyst.conversations.expire,
      { turnId },
    );
    return { conversationId, turnId };
  },
});

export const claim = internalMutation({
  args: { turnId: v.id("analyst_turns") },
  handler: async (ctx, { turnId }) => {
    const turn = await ctx.db.get(turnId);
    if (!turn || turn.status !== "pending" || turn.expiresAt <= Date.now())
      return false;
    await authorAccess(ctx, turn);
    await ctx.db.patch(turnId, { status: "running" });
    return true;
  },
});

export const runtime = internalQuery({
  args: { turnId: v.id("analyst_turns") },
  handler: async (ctx, { turnId }) => {
    const turn = await ctx.db.get(turnId);
    if (!turn || turn.status !== "running" || turn.expiresAt <= Date.now())
      throw new ConvexError("ANALYST_EXPIRED");
    const { org } = await authorAccess(ctx, turn);
    const [settings, history, staff, services] = await Promise.all([
      ctx.db
        .query("org_settings")
        .withIndex("by_org", (q) => q.eq("orgId", turn.orgId))
        .first(),
      ctx.db
        .query("analyst_turns")
        .withIndex("by_org_conversation", (q) =>
          q.eq("orgId", turn.orgId).eq("conversationId", turn.conversationId),
        )
        .order("desc")
        .take(5),
      ctx.db
        .query("staff_members")
        .withIndex("by_org", (q) => q.eq("orgId", turn.orgId))
        .take(201),
      ctx.db
        .query("services")
        .withIndex("by_org", (q) => q.eq("orgId", turn.orgId))
        .take(301),
    ]);
    return {
      turn,
      timezone: settings?.timezone ?? "Europe/Skopje",
      businessName: org.name.slice(0, 100),
      staffNames: staff
        .filter((s) => !s.isDeleted)
        .map((s) => s.displayName.slice(0, 100)),
      serviceNames: services
        .filter((s) => !s.isDeleted)
        .map((s) => s.name.slice(0, 100)),
      history: history
        .filter((t) => t._id !== turnId && t.status === "completed")
        .reverse()
        .map((t) => ({
          question: t.question,
          answer: t.answer?.text.slice(0, 1500),
          analyses: t.reports.map((r) => r.request),
        })),
    };
  },
});

export const recordUsage = internalMutation({
  args: {
    turnId: v.id("analyst_turns"),
    input: v.number(),
    output: v.number(),
  },
  handler: async (ctx, { turnId, input, output }) => {
    if (![input, output].every((n) => Number.isSafeInteger(n) && n >= 0))
      throw new Error("Invalid model usage");
    const turn = await ctx.db.get(turnId);
    if (!turn || turn.status !== "running") return;
    await ctx.db.patch(turnId, {
      inputTokens: turn.inputTokens + input,
      outputTokens: turn.outputTokens + output,
      costMicroUsd: turn.costMicroUsd + modelCost(turn.depth, input, output),
    });
  },
});

export const finish = internalMutation({
  args: {
    turnId: v.id("analyst_turns"),
    answer: v.optional(answerValidator),
    reports: v.array(reportValidator),
    errorCode: v.optional(v.string()),
    uncertainCost: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const turn = await ctx.db.get(args.turnId);
    if (!turn || (turn.status !== "running" && turn.status !== "pending"))
      return;
    let errorCode = args.errorCode;
    if (!errorCode) {
      try {
        await authorAccess(ctx, turn);
      } catch {
        errorCode = "ANALYST_ACCESS_CHANGED";
      }
    }
    const success = !errorCode && Boolean(args.answer);
    const usage = await ctx.db
      .query("analyst_usage")
      .withIndex("by_org_month", (q) =>
        q.eq("orgId", turn.orgId).eq("monthStartMs", turn.usageMonthMs),
      )
      .unique();
    const cost = args.uncertainCost
      ? Math.max(turn.costMicroUsd, turn.reservationMicroUsd)
      : turn.costMicroUsd;
    if (usage)
      await ctx.db.patch(usage._id, {
        reservedMicroUsd: Math.max(
          0,
          usage.reservedMicroUsd - turn.reservationMicroUsd,
        ),
        spentMicroUsd: usage.spentMicroUsd + cost,
        answers: Math.max(0, usage.answers - (success ? 0 : 1)),
        deepAnswers: Math.max(
          0,
          usage.deepAnswers - (!success && turn.depth === "deep" ? 1 : 0),
        ),
        updatedAt: Date.now(),
      });
    await ctx.db.patch(turn._id, {
      status: success ? "completed" : "failed",
      completedAt: Date.now(),
      answer: success ? args.answer : undefined,
      reports: success ? args.reports : [],
      errorCode: success ? undefined : (errorCode ?? "ANALYST_FAILED"),
      costMicroUsd: cost,
    });
    await ctx.db.insert("audit_log", {
      orgId: turn.orgId,
      actorType: "ai",
      actorId: turn.model,
      action: success ? "analyst.answer_completed" : "analyst.answer_failed",
      resourceType: "analyst_turns",
      resourceId: turn._id,
      after: {
        inputTokens: turn.inputTokens,
        outputTokens: turn.outputTokens,
        costMicroUsd: cost,
        reportCount: success ? args.reports.length : 0,
      },
      createdAt: Date.now(),
    });
  },
});

export const expire = internalMutation({
  args: { turnId: v.id("analyst_turns") },
  handler: async (ctx, { turnId }) => {
    const turn = await ctx.db.get(turnId);
    if (
      !turn ||
      turn.expiresAt > Date.now() ||
      (turn.status !== "pending" && turn.status !== "running")
    )
      return;
    await ctx.runMutation(internal.analyst.conversations.finish, {
      turnId,
      reports: [],
      errorCode: "ANALYST_EXPIRED",
      uncertainCost: turn.status === "running",
    });
  },
});
