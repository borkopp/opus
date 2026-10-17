import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs";
import { getSessionCookie } from "better-auth/cookies";
import { headers } from "next/headers";
import { cache } from "react";

export const {
  handler,
  fetchAuthAction,
  fetchAuthMutation,
  fetchAuthQuery,
  getToken,
  isAuthenticated,
  preloadAuthQuery,
} = convexBetterAuthNextJs({
  convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL!,
  convexSiteUrl: process.env.NEXT_PUBLIC_CONVEX_SITE_URL!,
});

/** Bootstrap remembered sessions without delaying anonymous/public visitors. */
export const getInitialAuthToken = cache(async () => {
  if (!getSessionCookie(await headers())) return undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    // The browser can recover in place if the auth server is slow or offline.
    return await Promise.race([
      getToken(),
      new Promise<undefined>((resolve) => {
        timer = setTimeout(() => resolve(undefined), 2_000);
      }),
    ]);
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
});
