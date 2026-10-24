import type { MetadataRoute } from "next";
import { SUPPORTED_LOCALES } from "@/lib/i18n/locale";
import { LANDING_PATHS, localizedPath } from "@/lib/i18n/routing";
import { SITE_URL, languageAlternates } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return LANDING_PATHS.flatMap((path) =>
    SUPPORTED_LOCALES.map((locale) => ({
      url: SITE_URL + localizedPath(path, locale),
      alternates: { languages: languageAlternates(path) },
    })),
  );
}
