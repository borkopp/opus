export const ACTIVE_INDUSTRY = "beauty_wellness" as const;
export const DEFAULT_MARKET_CITY = "Skopje" as const;

export function isActiveIndustry(industry: string | null | undefined): boolean {
  return industry === ACTIVE_INDUSTRY;
}
