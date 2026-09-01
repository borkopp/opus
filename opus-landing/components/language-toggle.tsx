"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LOCALE_COOKIE_NAME } from "@/lib/i18n/locale";
import { useI18n } from "./i18n-provider";

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

export function LanguageToggle() {
  const router = useRouter();
  const { locale, messages } = useI18n();
  const [isPending, startTransition] = useTransition();
  const nextLocale = locale === "mk" ? "en" : "mk";
  const label =
    nextLocale === "en"
      ? messages.accessibility.switchToEnglish
      : messages.accessibility.switchToMacedonian;

  function switchLanguage() {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";

    document.cookie = `${LOCALE_COOKIE_NAME}=${nextLocale}; Path=/; Max-Age=${ONE_YEAR_IN_SECONDS}; SameSite=Lax${secure}`;
    document.documentElement.lang = nextLocale;
    startTransition(() => router.refresh());
  }

  return (
    <button
      type="button"
      onClick={switchLanguage}
      disabled={isPending}
      aria-label={label}
      title={label}
      className="inline-flex h-8 min-w-10 cursor-pointer items-center justify-center rounded-full border border-neutral-200 px-2.5 text-[11px] font-bold tracking-[0.12em] text-neutral-500 transition-colors hover:border-neutral-300 hover:text-neutral-900 disabled:cursor-wait disabled:opacity-60 dark:border-white/15 dark:text-neutral-400 dark:hover:border-white/25 dark:hover:text-white"
    >
      {nextLocale === "en" ? "EN" : "МК"}
    </button>
  );
}
