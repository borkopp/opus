"use client";

import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

interface LanguageToggleProps {
  className?: string;
}

export function LanguageToggle({ className }: LanguageToggleProps) {
  const { locale, setLocale, messages } = useI18n();

  return (
    <div
      className={cn("locale-toggle", className)}
      role="group"
      aria-label={messages.accessibility.languageToggle}
    >
      <button
        type="button"
        className={cn("locale-toggle-btn", locale === "mk" && "is-active")}
        onClick={() => setLocale("mk")}
        aria-pressed={locale === "mk"}
        aria-label={messages.accessibility.switchToMacedonian}
      >
        MK
      </button>
      <button
        type="button"
        className={cn("locale-toggle-btn", locale === "en" && "is-active")}
        onClick={() => setLocale("en")}
        aria-pressed={locale === "en"}
        aria-label={messages.accessibility.switchToEnglish}
      >
        EN
      </button>
    </div>
  );
}
