import { convexClient } from "@convex-dev/better-auth/client/plugins";
import type { AuthClient } from "@convex-dev/better-auth/react";
import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [emailOTPClient(), convexClient()],
});

// Better Auth 1.6.22+ exposes a named client type that the current Convex
// component release has not yet adopted. Runtime APIs are compatible; keep the
// narrow compatibility cast at the provider boundary.
export const convexAuthClient = authClient as unknown as AuthClient;
