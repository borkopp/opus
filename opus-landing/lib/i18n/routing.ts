import { DEFAULT_LOCALE, isLocale, type Locale } from "./locale";

export const LANDING_PATHS = [
  "/",
  "/pricing",
  "/contact",
  "/privacy",
  "/terms",
] as const;

export function splitLocalePath(pathname: string) {
  const [, prefix, ...rest] = pathname.split("/");
  return isLocale(prefix)
    ? { locale: prefix, pathname: `/${rest.join("/")}` || "/" }
    : { locale: DEFAULT_LOCALE, pathname };
}

/** Only local page links receive a language prefix; assets and external links do not. */
export function localizedPath(href: string, locale: Locale): string {
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  const suffixIndex = href.search(/[?#]/);
  const path = suffixIndex < 0 ? href : href.slice(0, suffixIndex);
  const suffix = suffixIndex < 0 ? "" : href.slice(suffixIndex);
  const { pathname } = splitLocalePath(path);
  if (!LANDING_PATHS.some((page) => page === pathname)) return href;
  const prefix = locale === DEFAULT_LOCALE ? "" : `/${locale}`;
  return `${prefix}${pathname === "/" && prefix ? "" : pathname}${suffix}`;
}
