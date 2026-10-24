"use client";

import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";
import { localizedPath } from "@/lib/i18n/routing";
import { cn } from "@/lib/utils";

export function LanguageToggle({ className }: { className?: string }) {
  const { locale, setLocale, messages } = useI18n();
  const pathname = usePathname();
  const languages = [
    {
      value: "mk",
      label: "MK",
      title: messages.accessibility.switchToMacedonian,
    },
    {
      value: "sq",
      label: "SQ",
      title: messages.accessibility.switchToAlbanian,
    },
    { value: "en", label: "EN", title: messages.accessibility.switchToEnglish },
  ] as const;
  return (
    <div
      className={cn("locale-toggle", className)}
      role="group"
      aria-label={messages.accessibility.languageToggle}
    >
      {languages.map((language) => (
        <a
          key={language.value}
          href={localizedPath(pathname, language.value)}
          hrefLang={language.value}
          lang={language.value}
          className={cn(
            "locale-toggle-btn",
            locale === language.value && "is-active",
          )}
          aria-current={locale === language.value ? "page" : undefined}
          aria-label={language.title}
          onClick={(event) => {
            if (
              event.button !== 0 ||
              event.metaKey ||
              event.ctrlKey ||
              event.shiftKey ||
              event.altKey
            )
              return;
            event.preventDefault();
            setLocale(language.value);
          }}
        >
          {language.label}
        </a>
      ))}
    </div>
  );
}
