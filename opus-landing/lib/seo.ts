import type { Metadata } from "next";
import { SUPPORTED_LOCALES, type Locale } from "./i18n/locale";
import { localizedPath } from "./i18n/routing";

export const SITE_URL = "https://opus.mk";
export const SOCIAL_IMAGE = "/assets/opus-social-preview.jpg";
const ogLocales = { mk: "mk_MK", en: "en_GB", sq: "sq_MK" } as const;

export function languageAlternates(path: string) {
  return {
    ...Object.fromEntries(
      SUPPORTED_LOCALES.map((locale) => [
        locale,
        SITE_URL + localizedPath(path, locale),
      ]),
    ),
    "x-default": SITE_URL + localizedPath(path, "mk"),
  };
}

export function pageMetadata({
  locale,
  path,
  title,
  description,
}: {
  locale: Locale;
  path: string;
  title: string;
  description: string;
}): Metadata {
  const url = SITE_URL + localizedPath(path, locale);
  const image = {
    url: SOCIAL_IMAGE,
    width: 1200,
    height: 630,
    type: "image/jpeg",
    alt: "OPUS — Your studio. Beautifully booked. Website, online booking and calendar.",
  };
  return {
    title,
    description,
    alternates: { canonical: url, languages: languageAlternates(path) },
    openGraph: {
      title,
      description,
      url,
      siteName: "OPUS",
      type: "website",
      locale: ogLocales[locale],
      alternateLocale: SUPPORTED_LOCALES.filter(
        (other) => other !== locale,
      ).map((other) => ogLocales[other]),
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export function homeStructuredData(locale: Locale, description: string) {
  const url = SITE_URL + localizedPath("/", locale);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: "OPUS",
        url: SITE_URL,
        logo: `${SITE_URL}/opus-seo-logo.png`,
        email: "hello@opus.mk",
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        name: "OPUS",
        alternateName: "OPUS.mk",
        url: SITE_URL,
        inLanguage: ["mk", "en", "sq"],
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        url,
        name: "OPUS",
        description,
        inLanguage: locale,
        isPartOf: { "@id": `${SITE_URL}/#website` },
        about: { "@id": `${SITE_URL}/#organization` },
      },
    ],
  };
}
