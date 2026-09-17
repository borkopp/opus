import type { Metadata, Viewport } from "next";
import { Audiowide, DM_Sans, Manrope } from "next/font/google";
import { SiteHeader } from "@/components/landing/site-header";
import { SiteFooter } from "@/components/landing/site-footer";
import { CookieConsent } from "@/components/privacy/cookie-consent";
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
const title = "OPUS — More time for your craft.";
const description =
  "Your own free booking website, one organized team calendar, and AI that helps your beauty business grow. Made for studios in Macedonia.";

export const metadata: Metadata = {
  metadataBase: new URL("https://opus.mk"),
  title,
  description,
  referrer: "strict-origin",
  alternates: { canonical: "/" },
  icons: { icon: "/opus-mark.svg" },
  openGraph: {
    title,
    description,
    siteName: "OPUS",
    type: "website",
    images: [
      {
        url: "/assets/opus-cta-wide.jpg",
        width: 2172,
        height: 724,
        alt: "OPUS studio intelligence",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/assets/opus-cta-wide.jpg"],
  },
};
export const viewport: Viewport = { themeColor: "#f4faff" };

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${bodyFont.variable} ${headingFont.variable} ${logoFont.variable}`}
    >
      <body>
        <a className="skip" href="#main">
          Skip to content
        </a>
        <div className="site-shell">
          <SiteHeader />
          {children}
          <SiteFooter />
        </div>
        <CookieConsent />
      </body>
    </html>
  );
}
