import "server-only";

import { headers } from "next/headers";
import { DEFAULT_LOCALE, isLocale } from "./locale";

export async function getRequestLocale() {
  const locale = (await headers()).get("x-opus-locale");
  return isLocale(locale) ? locale : DEFAULT_LOCALE;
}
