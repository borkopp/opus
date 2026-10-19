import type { Metadata, Viewport } from "next";
import { studioAppleTouchIcon } from "./studio-apple-touch-icon.generated";

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
    apple: [
      {
        // Avoid the separate download that can fail in iOS 27.2's install sheet.
        url: studioAppleTouchIcon,
        type: "image/png",
        sizes: "180x180",
      },
      {
        // Older Safari ignores data URLs. Leave this fallback unsized so newer
        // Safari prefers the explicitly sized embedded icon above.
        url: "/studio-apple-touch-icon.png?v=2",
        type: "image/png",
      },
    ],
  },
};

/** Safe-area insets are handled by the studio shell; keep pinch zoom available. */
export const studioAppViewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};
