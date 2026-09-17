export const ANALYST_LIMITS = {
  answers: 200,
  deepAnswers: 20,
  monthlyMicroUsd: 3_000_000,
  maxQuestionChars: 2_000,
  maxTurns: 60,
  maxBookings: 10_000,
  maxRangeDays: 366,
  maxToolCalls: 3,
  maxModelCalls: 3,
  maxOutputTokens: 1_500,
  maxInputBytes: 60_000,
  leaseMs: 5 * 60_000,
} as const;

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
