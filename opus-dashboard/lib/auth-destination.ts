import { ACTIVE_DASHBOARD_PATH } from "./product-scope";
import { UPGRADE_PATH } from "./upgrade";

/** Keep explicit local destinations, but never return a finished studio to setup. */
export function authDestination(
  callbackUrl: string | undefined,
  onboardingComplete: boolean,
): string {
  const fallback = onboardingComplete ? ACTIVE_DASHBOARD_PATH : "/onboarding";
  if (
    !callbackUrl?.startsWith("/") ||
    callbackUrl.startsWith("//") ||
    /[\\\x00-\x20]/.test(callbackUrl)
  )
    return fallback;
  const pathname = callbackUrl.split(/[?#]/)[0].replace(/\/+$/, "");
  // A completed studio may be signing back in after starting Pro onboarding.
  // Resolve its current role/plan again instead of losing the Pro destination.
  if (
    onboardingComplete &&
    pathname === "/onboarding" &&
    new URL(callbackUrl, "https://studio.opus.mk").searchParams.get("plan") ===
      "pro"
  ) {
    return UPGRADE_PATH;
  }
  if (
    pathname === "/login" ||
    pathname === "/signup" ||
    (onboardingComplete && pathname === "/onboarding")
  )
    return fallback;
  return callbackUrl;
}
