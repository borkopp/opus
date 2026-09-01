import type { Metadata } from "next";
import { Geist_Mono, Lora, Commissioner } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { ThemeProvider } from "@/components/theme-provider";
import { I18nProvider } from "@/components/i18n-provider";
import { getMessages } from "@/lib/i18n/messages";
import { getRequestLocale } from "@/lib/i18n/server";

const manrope = Commissioner({
  variable: "--font-manrope-family",
  subsets: ["cyrillic", "latin"],
  weight: ["400", "500", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--font-lora-family",
  subsets: ["cyrillic", "latin"],
  style: "italic",
  weight: "500",
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const { home } = getMessages(locale).metadata;

  return {
    title: home.title,
    description: home.description,
    icons: {
      icon: "/opus-mark.svg",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getRequestLocale();
  const messages = getMessages(locale);

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${manrope.variable} ${geistMono.variable} ${lora.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          disableTransitionOnChange
        >
          <I18nProvider locale={locale} messages={messages}>
            <Navbar />
            {children}
            <Footer />
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
