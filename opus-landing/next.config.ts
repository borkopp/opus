import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Consent utilities are shared with the dashboard from the monorepo root.
  outputFileTracingRoot: path.resolve(__dirname, ".."),
  async redirects() {
    return [
      { source: "/pricing", destination: "/#pricing", permanent: true },
      { source: "/hero-original", destination: "/", permanent: true },
      {
        source: "/login",
        destination: "https://studio.opus.mk/login",
        permanent: true,
      },
      {
        source: "/signup",
        destination: "https://studio.opus.mk/signup",
        permanent: true,
      },
    ];
  },
};
export default nextConfig;
