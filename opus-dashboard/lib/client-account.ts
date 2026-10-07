import { isLocale } from "../../shared/i18n/locale";

/** Central client area uses the existing studio origin, keeping business cookies host-scoped. */
export function clientAreaUrl(path = "/account", currentOrigin?: string) {
  const configured = process.env.NEXT_PUBLIC_CLIENT_ACCOUNT_URL;
  const origin =
    configured ||
    (process.env.NODE_ENV !== "production" && currentOrigin
      ? currentOrigin
      : "https://studio.opus.mk");
  return new URL(path, origin).toString();
}

export function clientBookingPath(
  slug: string,
  query: Record<string, string | string[] | undefined> = {},
) {
  const params = new URLSearchParams();
  for (const key of ["service", "staff", "date", "at", "offer"] as const) {
    const value = Array.isArray(query[key]) ? query[key][0] : query[key];
    if (value) params.set(key, value);
  }
  const language = Array.isArray(query.lang) ? query.lang[0] : query.lang;
  if (isLocale(language)) params.set("lang", language);
  const search = params.toString();
  return `/book/${encodeURIComponent(slug)}${search ? `?${search}` : ""}`;
}

export function clientSignInDestination(callbackUrl?: string) {
  if (
    !callbackUrl?.startsWith("/") ||
    callbackUrl.startsWith("//") ||
    /[\\\x00-\x20]/.test(callbackUrl)
  )
    return "/account";
  const pathname = new URL(callbackUrl, "https://studio.opus.mk").pathname;
  return pathname === "/account" || pathname.startsWith("/book/")
    ? callbackUrl
    : "/account";
}
