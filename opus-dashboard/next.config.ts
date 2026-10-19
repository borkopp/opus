import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.0.200"],
  experimental: { externalDir: true },
  // Shared TypeScript lives above this app. Keep that resolution root while
  // postcss.config.mjs and globals.css limit Tailwind to dashboard UI sources.
  turbopack: { root: path.resolve(__dirname, "..") },
  outputFileTracingRoot: path.resolve(__dirname, ".."),
  output: "standalone",
  async rewrites() {
    // Safari also probes these conventional paths. Restrict the fallback to
    // the studio host so tenant websites do not inherit OPUS install branding.
    return ["/apple-touch-icon.png", "/apple-touch-icon-precomposed.png"].map(
      (source) => ({
        source,
        has: [
          {
            type: "host" as const,
            value: "(?:studio\\.opus\\.mk|localhost|127\\.0\\.0\\.1)",
          },
        ],
        destination: "/studio-apple-touch-icon.png",
      }),
    );
  },
  async headers() {
    return [
      {
        source: "/opus-push-sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self'; object-src 'none'",
          },
        ],
      },
    ];
  },
  images: {
    qualities: [75, 90],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
