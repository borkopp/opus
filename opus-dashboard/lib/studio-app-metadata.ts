import type { Metadata } from "next";

/** Studio-only install metadata; public tenant websites do not inherit it. */
export const studioAppMetadata: Metadata = {
  manifest: "/studio.webmanifest",
  appleWebApp: {
    capable: true,
    title: "OPUS Studio",
    statusBarStyle: "default",
  },
  icons: { icon: "/opus-mark.svg", apple: "/studio-icon-192.png" },
};
