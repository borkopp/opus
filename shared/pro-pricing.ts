/** Monthly Pro packages. Money is in MKD minor units (100 = 1 denar). */
export const PRO_TEAM_TIERS = [
  { teamLimit: 4, monthlyPriceMinorUnits: 149000 },
  { teamLimit: 5, monthlyPriceMinorUnits: 179000 },
  { teamLimit: 6, monthlyPriceMinorUnits: 209000 },
  { teamLimit: 8, monthlyPriceMinorUnits: 249000 },
  { teamLimit: 12, monthlyPriceMinorUnits: 329000 },
] as const;

export type ProTeamLimit = (typeof PRO_TEAM_TIERS)[number]["teamLimit"];

export function isProTeamLimit(value: unknown): value is ProTeamLimit {
  return PRO_TEAM_TIERS.some((tier) => tier.teamLimit === value);
}

export function proTierForTeamSize(teamSize: number) {
  return PRO_TEAM_TIERS.find((tier) => tier.teamLimit >= teamSize) ?? null;
}

/** Invalid URL input cannot pick a price, product, or arbitrary capacity. */
export function parseProTeamLimit(value: string | null | undefined) {
  const limit = value ? Number(value) : undefined;
  return isProTeamLimit(limit) ? limit : undefined;
}
