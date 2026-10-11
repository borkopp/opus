import type { BillingCurrency } from "./billing-currency";

/** Fixed monthly prices in minor units: 100 = 1 denar or 1 euro. */
export const PRO_TEAM_TIERS = [
  {
    teamLimit: 4,
    monthlyPriceMinorUnits: 149000,
    monthlyPriceEurMinorUnits: 2490,
  },
  {
    teamLimit: 5,
    monthlyPriceMinorUnits: 179000,
    monthlyPriceEurMinorUnits: 2990,
  },
  {
    teamLimit: 6,
    monthlyPriceMinorUnits: 209000,
    monthlyPriceEurMinorUnits: 3490,
  },
  {
    teamLimit: 8,
    monthlyPriceMinorUnits: 249000,
    monthlyPriceEurMinorUnits: 3990,
  },
  {
    teamLimit: 12,
    monthlyPriceMinorUnits: 329000,
    monthlyPriceEurMinorUnits: 5490,
  },
] as const;

export function proPriceMinorUnits(
  tier: { monthlyPriceMinorUnits: number; monthlyPriceEurMinorUnits: number },
  currency: BillingCurrency,
) {
  return currency === "eur"
    ? tier.monthlyPriceEurMinorUnits
    : tier.monthlyPriceMinorUnits;
}

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
