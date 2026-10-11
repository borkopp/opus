import { isProTeamLimit, type ProTeamLimit } from "../../shared/pro-pricing";
import {
  parseBillingCurrency,
  type BillingCurrency,
} from "../../shared/billing-currency";

export const UPGRADE_PATH = "/upgrade";
export const BILLING_PATH = "/settings?tab=billing";
export const PRO_ONBOARDING_PATH = "/onboarding?plan=pro";
export const UPGRADE_LOGIN_PATH = "/login?callbackUrl=%2Fupgrade";

export function withProTeamLimit(
  path: string,
  teamLimit?: ProTeamLimit,
  currency?: BillingCurrency,
) {
  const destination = isProTeamLimit(teamLimit)
    ? `${path}${path.includes("?") ? "&" : "?"}team=${teamLimit}`
    : path;
  return parseBillingCurrency(currency)
    ? `${destination}${destination.includes("?") ? "&" : "?"}currency=${currency}`
    : destination;
}

export function upgradeLoginPath(
  teamLimit?: ProTeamLimit,
  currency?: BillingCurrency,
) {
  return teamLimit || currency
    ? `/login?callbackUrl=${encodeURIComponent(withProTeamLimit(UPGRADE_PATH, teamLimit, currency))}`
    : UPGRADE_LOGIN_PATH;
}

/** Navigation only: billing still checks the current owner and plan server-side. */
export function upgradeDestination({
  hasStudio,
  role,
  plan,
  operationalSetupComplete,
  teamLimit,
  currency,
}: {
  hasStudio: boolean;
  role?: "owner" | "manager" | "staff";
  plan?: "free" | "paid";
  operationalSetupComplete: boolean;
  teamLimit?: ProTeamLimit;
  currency?: BillingCurrency;
}): string {
  if (!hasStudio)
    return withProTeamLimit(PRO_ONBOARDING_PATH, teamLimit, currency);
  // Staff see the owner-only notice; existing Pro studios manage their plan.
  if (role !== "owner" || plan === "paid" || operationalSetupComplete) {
    return withProTeamLimit(BILLING_PATH, teamLimit, currency);
  }
  return withProTeamLimit(PRO_ONBOARDING_PATH, teamLimit, currency);
}
