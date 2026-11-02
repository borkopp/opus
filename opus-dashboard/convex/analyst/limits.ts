import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { getSubscriptionAccess } from "../lib/subscriptionAccess";
import { getProTeamLimitForOrg } from "../lib/staffPlanLimits";
import {
  ASSISTANT_FREE_ALLOWANCE,
  ASSISTANT_TRIAL_ALLOWANCE,
  getAssistantTeamAllowance,
} from "../../../shared/assistant-allowances";

export const ANALYST_LIMITS = {
  ...getAssistantTeamAllowance(12),
  maxQuestionChars: 2_000,
  maxTurns: 60,
  maxBookings: 10_000,
  maxRangeDays: 366,
  maxToolCalls: 3,
  maxModelCalls: 3,
  maxOutputTokens: 1_500,
  maxInputBytes: 60_000,
  streamIntervalMs: 200,
  maxStreamUpdates: 50,
  leaseMs: 5 * 60_000,
} as const;

export function analystPlanLimits(
  plan: "free" | "paid",
  override?: { analystPromptLimit?: number; analystDeepPromptLimit?: number },
  allowance = plan === "paid"
    ? getAssistantTeamAllowance(12)
    : ASSISTANT_FREE_ALLOWANCE,
) {
  const answers = override?.analystPromptLimit ?? allowance.answers;
  return {
    ...ANALYST_LIMITS,
    ...allowance,
    answers,
    deepAnswers:
      plan === "paid"
        ? Math.min(
            answers,
            override?.analystDeepPromptLimit ?? allowance.deepAnswers,
          )
        : 0,
  };
}

/** Resolve entitlement from server-owned billing state, never current headcount. */
export async function analystOrgLimits(ctx: QueryCtx, org: Doc<"orgs">) {
  const access = getSubscriptionAccess(org);
  const allowance =
    access.accessState === "trial"
      ? ASSISTANT_TRIAL_ALLOWANCE
      : access.accessState === "paid"
        ? getAssistantTeamAllowance(await getProTeamLimitForOrg(ctx, org))
        : ASSISTANT_FREE_ALLOWANCE;
  return {
    // Explicit owner overrides change answer counts, not the package cost guard.
    limits: analystPlanLimits(access.effectivePlan, org, allowance),
    defaults: analystPlanLimits(access.effectivePlan, undefined, allowance),
  };
}

export function allowanceSpend(
  usage: {
    spentMicroUsd: number;
    resetSpentMicroUsd?: number;
  } | null,
) {
  return Math.max(
    0,
    (usage?.spentMicroUsd ?? 0) - (usage?.resetSpentMicroUsd ?? 0),
  );
}

// Micro-USD keeps cost accounting integer-based. Rates are conservative,
// uncached standard API prices; discounts never increase the allowance.
export const ANALYST_MODELS = {
  standard: {
    name: "gpt-5.6-luna",
    input: 0.2,
    output: 1.2,
    reservation: 30_000,
  },
  deep: { name: "gpt-5.6-terra", input: 2, output: 12, reservation: 200_000 },
} as const;

export function modelCost(
  depth: keyof typeof ANALYST_MODELS,
  input: number,
  output: number,
) {
  const rates = ANALYST_MODELS[depth];
  return Math.ceil(input * rates.input + output * rates.output);
}

export function usageMonth(now: number) {
  const date = new Date(now);
  return {
    startMs: Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1),
    resetAt: Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1),
  };
}

export function analystConfigured() {
  return (
    process.env.BUSINESS_ANALYST_ENABLED === "true" &&
    Boolean(process.env.BUSINESS_ANALYST_OPENAI_API_KEY)
  );
}
