import type { Metadata } from "next";
// import { Geist_Mono, Figtree } from "next/font/google";
import "./globals.css";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";
import {
  Syne,
  DM_Sans,
  DM_Mono,
  Outfit,
  Playfair_Display,
} from "next/font/google";

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
const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-outfit",
});
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600"],
  style: "italic",
  variable: "--font-playfair",
});

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

// const figtree = Figtree({
//   variable: "--font-figtree",
//   subsets: ["latin"],
// });

export const metadata: Metadata = {
  title: {
    default: "OPUS",
    template: "%s | OPUS",
  },
  description: "Manage appointments for your beauty studio with OPUS.",
  icons: {
    icon: "/opus-mark.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${syne.variable} ${dmSans.variable} ${dmMono.variable} ${outfit.variable} ${playfair.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <ConvexClientProvider>
            {children}
            <Toaster richColors position="bottom-right" />
          </ConvexClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
