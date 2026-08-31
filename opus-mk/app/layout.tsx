import type { Metadata, Viewport } from "next";
import "./globals.css";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import { Toaster } from "sonner";
import {
  Commissioner,
  Manrope,
  IBM_Plex_Mono,
} from "next/font/google";
import { FloatNav } from "@/components/FloatNav";

const commissioner = Commissioner({
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600", "700"],
  variable: "--font-commissioner",
});

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-manrope",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500"],
  variable: "--font-ibm-plex-mono",
});

export const metadata: Metadata = {
  title: {
    default: "OPUS — Discover & Book",
    template: "%s | OPUS",
  },
  description:
    "Discover beauty and wellness studios in Macedonia and book an appointment on opus.mk.",
  icons: { icon: "/opus-mark.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F6F6F3",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="mk">
      <body
        className={`${commissioner.variable} ${manrope.variable} ${ibmPlexMono.variable} font-sans antialiased`}
      >
        <ConvexClientProvider>
          {children}
          <FloatNav />
          <Toaster richColors position="top-center" />
        </ConvexClientProvider>
      </body>
    </html>
  );
}
