import { DashboardI18nProvider } from "@/components/dashboard-i18n-provider";
import { getRequestLocale } from "@/lib/i18n/server";
import type { Metadata } from "next";
import "./globals.css";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";
import { CookieConsent } from "@/components/privacy/CookieConsent";
import { DM_Sans, Manrope, Audiowide, IBM_Plex_Mono } from "next/font/google";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-manrope",
  display: "swap",
});

const audiowide = Audiowide({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-audiowide",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  referrer: "strict-origin",
  title: {
    default: "OPUS",
    template: "%s | OPUS",
  },
  description: "Manage appointments for your beauty studio with OPUS.",
  icons: {
    icon: "/opus-mark.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getRequestLocale();
  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${dmSans.variable} ${manrope.variable} ${audiowide.variable} ${ibmPlexMono.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <ConvexClientProvider>
            <DashboardI18nProvider locale={locale}>
              {children}
              <Toaster richColors position="bottom-right" />
              <CookieConsent />
            </DashboardI18nProvider>
          </ConvexClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
