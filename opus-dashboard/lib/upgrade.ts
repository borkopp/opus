export const UPGRADE_PATH = "/upgrade";
export const BILLING_PATH = "/settings?tab=billing";
export const PRO_ONBOARDING_PATH = "/onboarding?plan=pro";
export const UPGRADE_LOGIN_PATH = "/login?callbackUrl=%2Fupgrade";

/** Navigation only: billing still checks the current owner and plan server-side. */
export function upgradeDestination({
  hasStudio,
  role,
  plan,
  operationalSetupComplete,
}: {
  hasStudio: boolean;
  role?: "owner" | "manager" | "staff";
  plan?: "free" | "paid";
  operationalSetupComplete: boolean;
}): string {
  if (!hasStudio) return PRO_ONBOARDING_PATH;
  // Staff see the owner-only notice; existing Pro studios manage their plan.
  if (role !== "owner" || plan === "paid" || operationalSetupComplete) {
    return BILLING_PATH;
  }
  return PRO_ONBOARDING_PATH;
}
