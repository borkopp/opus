"use client";

import { Cookie } from "lucide-react";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
  consentCopy,
  openCookiePreferences,
} from "../../../shared/analytics/consent";

export function CookiePreferencesMenuItem() {
  const { t } = useDashboardI18n();

  return (
    <DropdownMenuItem
      onSelect={openCookiePreferences}
      className="cursor-pointer"
    >
      <Cookie aria-hidden="true" />
      <span>{t(consentCopy.en.preferences, consentCopy.mk.preferences)}</span>
    </DropdownMenuItem>
  );
}
