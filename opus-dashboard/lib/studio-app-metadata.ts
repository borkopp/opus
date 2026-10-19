import type { Metadata, Viewport } from "next";

/** Studio-only install metadata; public tenant websites do not inherit it. */
export const studioAppMetadata: Metadata = {
  applicationName: "OPUS Studio",
  manifest: "/studio.webmanifest",
  appleWebApp: {
    capable: true,
    title: "OPUS Studio",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/opus-mark.svg", type: "image/svg+xml", sizes: "any" },
      { url: "/studio-icon-192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: {
      url: "/studio-apple-touch-icon.png",
      type: "image/png",
      sizes: "180x180",
    },
  },
};

/** Safe-area insets are handled by the studio shell; keep pinch zoom available. */
export const studioAppViewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};
