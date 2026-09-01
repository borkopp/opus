export const SUPPORTED_LOCALES = ["mk", "en"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "mk";
export const LOCALE_COOKIE_NAME = "opus_locale";

export function isLocale(value: string | null | undefined): value is Locale {
  return SUPPORTED_LOCALES.includes(value as Locale);
}

export function resolveLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) {
    return DEFAULT_LOCALE;
  }

  const preferences = acceptLanguage
    .split(",")
    .map((part, index) => {
      const [tag, ...parameters] = part.trim().split(";");
      const qualityParameter = parameters.find((parameter) =>
        parameter.trim().toLowerCase().startsWith("q="),
      );
      const parsedQuality = qualityParameter
        ? Number.parseFloat(qualityParameter.split("=")[1])
        : 1;

      return {
        index,
        language: tag.toLowerCase().split("-")[0],
        quality: Number.isFinite(parsedQuality) ? parsedQuality : 0,
      };
    })
    .filter(({ quality }) => quality > 0)
    .sort((a, b) => b.quality - a.quality || a.index - b.index);

  for (const preference of preferences) {
    if (isLocale(preference.language)) {
      return preference.language;
    }
  }

  return DEFAULT_LOCALE;
}
