import type { Metadata, Viewport } from "next";
import "./globals.css";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import { Toaster } from "sonner";
import {
  Syne,
  DM_Sans,
  DM_Mono,
  Audiowide,
  Instrument_Serif,
} from "next/font/google";
import { FloatNav } from "@/components/FloatNav";

const syne = Syne({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-syne",
});
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-dm-sans",
});
const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-dm-mono",
});
const audiowide = Audiowide({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-audiowide",
});
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-instrument-serif",
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
        className={`${syne.variable} ${dmSans.variable} ${dmMono.variable} ${audiowide.variable} ${instrumentSerif.variable} font-sans antialiased`}
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
