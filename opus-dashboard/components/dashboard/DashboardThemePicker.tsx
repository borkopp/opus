"use client";

import Image from "next/image";
import { Check } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { FieldDescription, FieldLegend, FieldSet } from "@/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  DASHBOARD_THEMES,
  dashboardThemeDetails,
  isDashboardTheme,
  type DashboardTheme,
} from "@/lib/dashboard-theme";
import s from "./theme-picker.module.css";

export function DashboardThemePicker({
  value,
  onValueChange,
  disabled = false,
}: {
  value: DashboardTheme;
  onValueChange: (theme: DashboardTheme) => void;
  disabled?: boolean;
}) {
  const { t } = useDashboardI18n();
  return (
    <FieldSet disabled={disabled} className="min-w-0">
      <FieldLegend className="sr-only">
        {t("Dashboard theme", "Тема на контролната табла")}
      </FieldLegend>
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={(next) => {
          if (isDashboardTheme(next)) onValueChange(next);
        }}
        disabled={disabled}
        spacing={4}
        aria-label={t("Dashboard theme", "Тема на контролната табла")}
        className={s.options}
      >
        {DASHBOARD_THEMES.map((theme) => {
          const details = dashboardThemeDetails[theme];
          return (
            <ToggleGroupItem
              key={theme}
              value={theme}
              aria-label={details.name}
              data-theme-option={theme}
              className={s.option}
            >
              <span className={s.preview}>
                <Image
                  src={details.preview}
                  width={3600}
                  height={theme === "clarity" ? 1898 : 1894}
                  alt={t(
                    `${details.name} dashboard preview`,
                    `Преглед на темата ${details.name}`,
                  )}
                  sizes="(max-width: 639px) 90vw, (max-width: 1023px) 45vw, 520px"
                />
              </span>
              <span className={s.caption}>
                <span className={s.heading}>
                  <span className={s.indicator} aria-hidden="true">
                    {value === theme && <Check />}
                  </span>
                  <span className={s.name}>{details.name}</span>
                  <Logo className={s.logo} markClassName={s.logoMark} />
                </span>
                <span className={s.description}>
                  {t(details.description.en, details.description.mk)}
                </span>
              </span>
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>
      <FieldDescription data-replay-public>
        {t(
          "Your theme is personal. You can change it anytime in Settings.",
          "Темата важи само за вас. Можете да ја промените во Поставки.",
        )}
      </FieldDescription>
    </FieldSet>
  );
}
