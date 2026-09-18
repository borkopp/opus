export const SUPPORTED_LOCALES = ["mk", "en"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "mk";
export const LOCALE_COOKIE_NAME = "opus_locale";

export function isLocale(value: string | null | undefined): value is Locale {
  return SUPPORTED_LOCALES.includes(value as Locale);
}

export function getClientLocale(): Locale {
  if (typeof document === "undefined") return DEFAULT_LOCALE;
  try {
    const match = document.cookie.match(
      new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE_NAME}=([^;]*)`),
    );
    const value = match ? decodeURIComponent(match[1]) : null;
    return isLocale(value) ? value : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

export function setClientLocale(locale: Locale) {
  if (typeof document === "undefined") return;
  try {
    const isHttps = window.location.protocol === "https:";
    document.cookie = `${LOCALE_COOKIE_NAME}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax${
      isHttps ? "; Secure" : ""
    }`;
  } catch {
    // Cookies may be blocked or restricted
  }
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
