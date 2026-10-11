import { isProTeamLimit, type ProTeamLimit } from "../../shared/pro-pricing";

export const UPGRADE_PATH = "/upgrade";
export const BILLING_PATH = "/settings?tab=billing";
export const PRO_ONBOARDING_PATH = "/onboarding?plan=pro";
export const UPGRADE_LOGIN_PATH = "/login?callbackUrl=%2Fupgrade";

export function withProTeamLimit(path: string, teamLimit?: ProTeamLimit) {
  return isProTeamLimit(teamLimit)
    ? `${path}${path.includes("?") ? "&" : "?"}team=${teamLimit}`
    : path;
}

export function upgradeLoginPath(teamLimit?: ProTeamLimit) {
  return teamLimit
    ? `/login?callbackUrl=${encodeURIComponent(withProTeamLimit(UPGRADE_PATH, teamLimit))}`
    : UPGRADE_LOGIN_PATH;
}

/** Navigation only: billing still checks the current owner and plan server-side. */
export function upgradeDestination({
  hasStudio,
  role,
  plan,
  operationalSetupComplete,
  teamLimit,
}: {
  hasStudio: boolean;
  role?: "owner" | "manager" | "staff";
  plan?: "free" | "paid";
  operationalSetupComplete: boolean;
  teamLimit?: ProTeamLimit;
}): string {
  if (!hasStudio) return withProTeamLimit(PRO_ONBOARDING_PATH, teamLimit);
  // Staff see the owner-only notice; existing Pro studios manage their plan.
  if (role !== "owner" || plan === "paid" || operationalSetupComplete) {
    return withProTeamLimit(BILLING_PATH, teamLimit);
  }
  return withProTeamLimit(PRO_ONBOARDING_PATH, teamLimit);
}
