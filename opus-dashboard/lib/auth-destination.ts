import { ACTIVE_DASHBOARD_PATH } from "./product-scope";
import { UPGRADE_PATH, withProTeamLimit } from "./upgrade";
import { parseProTeamLimit } from "../../shared/pro-pricing";
import { parseBillingCurrency } from "../../shared/billing-currency";

/** Polar's return credential is unused by OPUS and must not reach page analytics. */
export function stripCheckoutSessionToken(destination: string): string {
  const hashIndex = destination.indexOf("#");
  const fragment = hashIndex < 0 ? "" : destination.slice(hashIndex);
  const pathAndQuery =
    hashIndex < 0 ? destination : destination.slice(0, hashIndex);
  const queryIndex = pathAndQuery.indexOf("?");
  if (queryIndex < 0) return destination;
  const pathname = pathAndQuery.slice(0, queryIndex);
  const params = new URLSearchParams(pathAndQuery.slice(queryIndex + 1));
  let changed = params.has("customer_session_token");
  params.delete("customer_session_token");

  // Older sign-in URLs may already wrap the return URL in an encoded callback.
  const callbacks = params.getAll("callbackUrl");
  const cleanedCallbacks = callbacks.map(stripCheckoutSessionToken);
  if (
    callbacks.some((callback, index) => callback !== cleanedCallbacks[index])
  ) {
    params.delete("callbackUrl");
    cleanedCallbacks.forEach((callback) =>
      params.append("callbackUrl", callback),
    );
    changed = true;
  }
  if (!changed) return destination;
  const search = params.toString();
  return `${pathname}${search ? `?${search}` : ""}${fragment}`;
}

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
  return stripCheckoutSessionToken(callbackUrl);
}
