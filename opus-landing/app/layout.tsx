import type { Metadata, Viewport } from "next";
import { Audiowide, DM_Sans, Manrope } from "next/font/google";
import { SiteHeader } from "@/components/landing/site-header";
import { SiteFooter } from "@/components/landing/site-footer";
import { CookieConsent } from "@/components/privacy/cookie-consent";
import { I18nProvider } from "@/lib/i18n/context";
import { getRequestLocale } from "@/lib/i18n/server";
import { getMessages } from "@/lib/i18n/messages";
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

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const messages = getMessages(locale);
  const title = messages.metadata.home.title;
  const description = messages.metadata.home.description;

  return {
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
}

export const viewport: Viewport = { themeColor: "#f4faff" };

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getRequestLocale();

  return (
    <html
      lang={locale}
      className={`${bodyFont.variable} ${headingFont.variable} ${logoFont.variable}`}
    >
      <body>
        <I18nProvider initialLocale={locale}>
          <a className="skip" href="#main">
            {locale === "mk" ? "Прескокни до содржина" : "Skip to content"}
          </a>
          <div className="site-shell">
            <SiteHeader />
            {children}
            <SiteFooter />
          </div>
          <CookieConsent />
        </I18nProvider>
      </body>
    </html>
  );
}
