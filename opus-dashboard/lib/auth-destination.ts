import { ACTIVE_DASHBOARD_PATH } from "./product-scope";

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
  if (
    pathname === "/login" ||
    pathname === "/signup" ||
    (onboardingComplete && pathname === "/onboarding")
  )
    return fallback;
  return callbackUrl;
}
