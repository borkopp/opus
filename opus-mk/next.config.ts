import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    // User-uploaded images (logos, covers, galleries) can be hosted anywhere.
    // Convex storage, external CDNs, and arbitrary HTTP origins all need to work.
    dangerouslyAllowLocalIP: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      }
    ],
  },
};

export default nextConfig;
