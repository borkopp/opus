export const ACTIVE_INDUSTRY = "beauty_wellness" as const;
export const ACTIVE_DASHBOARD_PATH = "/beauty" as const;

export const ACTIVE_CAPABILITIES = {
  aiFrontDesk: false,
  automatedGapOptimizer: true,
} as const;

export function isActiveIndustry(industry: string | null | undefined): boolean {
  return industry === ACTIVE_INDUSTRY;
}
