/** Studio-wide allowances per UTC calendar month. Detailed answers count in total. */
export const ASSISTANT_FREE_ALLOWANCE = {
  answers: 10,
  deepAnswers: 0,
  monthlyMicroUsd: 3_000_000,
} as const;

export const ASSISTANT_TEAM_ALLOWANCES = [
  { teamLimit: 1, answers: 400, deepAnswers: 40, monthlyMicroUsd: 6_000_000 },
  { teamLimit: 3, answers: 600, deepAnswers: 60, monthlyMicroUsd: 8_000_000 },
  { teamLimit: 4, answers: 800, deepAnswers: 80, monthlyMicroUsd: 11_000_000 },
  // Retained for existing subscriptions; not offered for new checkout.
  { teamLimit: 5, answers: 900, deepAnswers: 90, monthlyMicroUsd: 12_000_000 },
  {
    teamLimit: 6,
    answers: 1_000,
    deepAnswers: 100,
    monthlyMicroUsd: 13_000_000,
  },
  {
    teamLimit: 8,
    answers: 1_200,
    deepAnswers: 120,
    monthlyMicroUsd: 16_000_000,
  },
  {
    teamLimit: 12,
    answers: 1_600,
    deepAnswers: 160,
    monthlyMicroUsd: 21_000_000,
  },
] as const;

// Trial team capacity is independent of its entry-package AI allowance.
export const ASSISTANT_TRIAL_ALLOWANCE = ASSISTANT_TEAM_ALLOWANCES[0];

/** Missing legacy/manual Pro capacity retains the largest supported package. */
export function getAssistantTeamAllowance(teamLimit: number) {
  return (
    ASSISTANT_TEAM_ALLOWANCES.find((tier) => tier.teamLimit === teamLimit) ??
    ASSISTANT_TEAM_ALLOWANCES[ASSISTANT_TEAM_ALLOWANCES.length - 1]
  );
}
