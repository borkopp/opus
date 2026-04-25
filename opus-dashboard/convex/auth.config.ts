import { AuthConfig } from "convex/server";

export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN ?? "https://clerk.opus.mk",
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
