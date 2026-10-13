import { ACTIVE_DASHBOARD_PATH } from "./product-scope";
import { UPGRADE_PATH, withProTeamLimit } from "./upgrade";
import { parseProTeamLimit } from "../../shared/pro-pricing";
import { parseBillingCurrency } from "../../shared/billing-currency";
import { hospitalityHome } from "./onboarding";
import { clientSignInDestination } from "./client-account";

export type AuthBusinessContext = {
  hasBusiness: boolean;
  industry?: string;
  role?: string;
  hospitalityOnboardingComplete?: boolean;
};

/** Resolve business onboarding without interrupting invitations or customer journeys. */
export function authDestination(
  callbackUrl: string | undefined,
  onboardingComplete: boolean,
  business?: AuthBusinessContext,
): string {
  const hospitality =
    business?.hasBusiness && business.industry === "hospitality";
  const fallback = hospitality
    ? hospitalityHome(
        business.hospitalityOnboardingComplete ?? false,
        business.role,
      )
    : onboardingComplete
      ? ACTIVE_DASHBOARD_PATH
      : "/onboarding";
  if (
    !callbackUrl?.startsWith("/") ||
    callbackUrl.startsWith("//") ||
    /[\\\x00-\x20]/.test(callbackUrl)
  )
    return fallback;
  const pathname = callbackUrl.split(/[?#]/)[0].replace(/\/+$/, "");
  const independentJourney =
    clientSignInDestination(callbackUrl) === callbackUrl ||
    pathname.startsWith("/invites/") ||
    pathname === "/business/switch";
  if (business && independentJourney) return callbackUrl;
  if (business && !business.hasBusiness) {
    if (pathname === "/onboarding") return callbackUrl;
    if (pathname === UPGRADE_PATH) {
      const params = new URL(callbackUrl, "https://studio.opus.mk")
        .searchParams;
      const onboarding = withProTeamLimit(
        "/onboarding?plan=pro",
        parseProTeamLimit(params.get("team")),
        parseBillingCurrency(params.get("currency")),
      );
      return onboarding;
    }
    return "/onboarding";
  }
  if (hospitality) {
    // A venue keeps its own setup and never inherits beauty Pro onboarding.
    if (
      pathname.startsWith("/hospitality") &&
      (business.hospitalityOnboardingComplete || business.role === "staff")
    )
      return callbackUrl;
    return fallback;
  }
  // A completed studio may be signing back in after starting Pro onboarding.
  // Resolve its current role/plan again instead of losing the Pro destination.
  if (
    onboardingComplete &&
    pathname === "/onboarding" &&
    new URL(callbackUrl, "https://studio.opus.mk").searchParams.get("plan") ===
      "pro"
  ) {
    return withProTeamLimit(
      UPGRADE_PATH,
      parseProTeamLimit(
        new URL(callbackUrl, "https://studio.opus.mk").searchParams.get("team"),
      ),
      parseBillingCurrency(
        new URL(callbackUrl, "https://studio.opus.mk").searchParams.get(
          "currency",
        ),
      ),
    );
  }
  if (
    pathname === "/login" ||
    pathname === "/signup" ||
    (onboardingComplete && pathname === "/onboarding")
  )
    return fallback;
  return callbackUrl;
}
