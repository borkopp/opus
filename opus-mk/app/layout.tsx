import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import { Toaster } from "sonner";
import { Syne, DM_Sans, DM_Mono, Audiowide } from "next/font/google";

const syne = Syne({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-syne" });
const dmSans = DM_Sans({ subsets: ["latin"], weight: ["300", "400", "500"], variable: "--font-dm-sans" });
const dmMono = DM_Mono({ subsets: ["latin"], weight: ["400"], variable: "--font-dm-mono" });
const audiowide = Audiowide({ subsets: ["latin"], weight: "400", variable: "--font-audiowide" });

export const metadata: Metadata = {
  title: {
    default: "OPUS — Discover & Book",
    template: "%s | OPUS",
  },
  description: "Discover the best beauty, wellness, and hospitality businesses near you. Book instantly on opus.mk.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FAF9F7",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${syne.variable} ${dmSans.variable} ${dmMono.variable} ${audiowide.variable} font-sans antialiased`}
      >
        <ClerkProvider>
          <ConvexClientProvider>
            {children}
            <Toaster richColors position="top-center" />
          </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
