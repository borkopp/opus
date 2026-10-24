import type { Metadata, Viewport } from "next";
import { Audiowide, DM_Sans, Manrope } from "next/font/google";
import { SiteHeader } from "@/components/landing/site-header";
import { SiteFooter } from "@/components/landing/site-footer";
import { CookieConsent } from "@/components/privacy/cookie-consent";
import { I18nProvider } from "@/lib/i18n/context";
import { getRequestLocale } from "@/lib/i18n/server";
import { getMessages } from "@/lib/i18n/messages";
import { headers } from "next/headers";
import { requestBillingCurrency } from "../../shared/billing-currency";
import { BillingCurrencyProvider } from "@/components/pricing/billing-currency-provider";
import "./globals.css";

const bodyFont = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});
const headingFont = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-manrope",
  display: "swap",
});
const logoFont = Audiowide({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-audiowide",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://opus.mk"),
  applicationName: "OPUS",
  referrer: "strict-origin-when-cross-origin",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon-48.png", type: "image/png", sizes: "48x48" },
      { url: "/opus-mark.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = { themeColor: "#f4faff" };

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getRequestLocale();
  const messages = getMessages(locale);

  return (
    <html
      lang={locale}
      className={`${bodyFont.variable} ${headingFont.variable} ${logoFont.variable}`}
    >
      <body>
        <I18nProvider initialLocale={locale}>
          <BillingCurrencyProvider
            initialCurrency={requestBillingCurrency(await headers())}
          >
            <a className="skip" href="#main">
              {messages.accessibility.skipToContent}
            </a>
            <div className="site-shell">
              <SiteHeader />
              {children}
              <SiteFooter />
            </div>
            <CookieConsent />
          </BillingCurrencyProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
