"use client";

import { useEffect, useState } from "react";
import type { Locale } from "../../../shared/i18n/locale";
import type { WebsiteCanvasProps } from "./website-types";
import { WebsiteCanvas } from "./WebsiteCanvas";

export function PublishedWebsite(props: WebsiteCanvasProps) {
  const [locale, setLocale] = useState(props.locale);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  function changeLanguage(language: Locale) {
    setLocale(language);
    const url = new URL(window.location.href);
    url.searchParams.set("lang", language);
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  }
  return (
    <WebsiteCanvas {...props} locale={locale} onLocaleChange={changeLanguage} />
  );
}
