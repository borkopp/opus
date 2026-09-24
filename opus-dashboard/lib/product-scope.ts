export const ACTIVE_INDUSTRY = "beauty_wellness" as const;
export const ACTIVE_DASHBOARD_PATH = "/beauty" as const;

export const ACTIVE_CAPABILITIES = {
  businessAnalyst: true,
  aiFrontDesk: true,
  // Legacy flag name: enables staff-approved opening recovery, never autonomous campaigns.
  automatedGapOptimizer: true,
} as const;

export function isActiveIndustry(industry: string | null | undefined): boolean {
  return industry === ACTIVE_INDUSTRY;
}
