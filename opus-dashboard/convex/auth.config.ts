import { AuthConfig } from "convex/server";

export default {
  providers: [
    {
      domain: "https://delicate-hyena-31.clerk.accounts.dev",
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
