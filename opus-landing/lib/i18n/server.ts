import "server-only";

import { cookies, headers } from "next/headers";
import { isLocale, LOCALE_COOKIE_NAME, resolveLocale } from "./locale";

export async function getRequestLocale() {
  const cookieStore = await cookies();
  const savedLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;

  if (isLocale(savedLocale)) {
    return savedLocale;
  }

  const requestHeaders = await headers();

  return resolveLocale(requestHeaders.get("accept-language"));
}
