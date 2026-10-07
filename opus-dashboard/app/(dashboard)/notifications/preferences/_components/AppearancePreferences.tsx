"use client";

import { toast } from "sonner";
import { DashboardThemePicker } from "@/components/dashboard/DashboardThemePicker";
import { useDashboardAppearance } from "@/components/dashboard/DashboardAppearanceProvider";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { SettingsCard } from "@/components/settings/SettingsCard";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSaveDashboardTheme } from "@/hooks/use-dashboard-theme";
import type { DashboardLanguage } from "@/lib/i18n/types";
import {
  dashboardThemeDetails,
  type DashboardTheme,
} from "@/lib/dashboard-theme";

export function AppearancePreferences() {
  const { t, language, setLanguage } = useDashboardI18n();
  const theme = useDashboardAppearance();
  const { saveTheme, isSaving } = useSaveDashboardTheme();

  async function selectTheme(next: DashboardTheme) {
    if (next === theme) return;
    try {
      await saveTheme(next);
      toast.success(
        t(
          `${dashboardThemeDetails[next].name} theme saved`,
          `Темата ${dashboardThemeDetails[next].name} е зачувана`,
          `Tema ${dashboardThemeDetails[next].name} u ruajt`,
        ),
      );
    } catch {
      toast.error(
        t(
          "Could not save your theme. Please try again.",
          "Темата не е зачувана. Обидете се повторно.",
          "Tema nuk mund të ruhej. Provoni përsëri.",
        ),
      );
    }
  }

  return (
    <SettingsCard
      title={t("Appearance & language", "Изглед и јазик", "Pamja dhe gjuha")}
      description={t(
        "Personalize your dashboard. These choices do not change the studio’s booking page.",
        "Прилагодете ја вашата контролна табла. Овие поставки не ја менуваат страницата за закажување на студиото.",
        "Personalizoni panelin tuaj. Këto zgjedhje nuk ndryshojnë faqen e rezervimit të studios.",
      )}
      contentClassName="flex flex-col gap-6"
    >
      <Field className="max-w-sm">
        <FieldLabel htmlFor="dashboard-language">
          {t("Language", "Јазик", "Gjuha")}
        </FieldLabel>
        <Select
          value={language}
          onValueChange={(value) => setLanguage(value as DashboardLanguage)}
        >
          <SelectTrigger id="dashboard-language">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mk">Македонски</SelectItem>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="sq">Shqip</SelectItem>
          </SelectContent>
        </Select>
        <FieldDescription>
          {t(
            "Saved for this browser.",
            "Зачувано за овој прелистувач.",
            "Ruhet për këtë shfletues.",
          )}
        </FieldDescription>
      </Field>
      <Field>
        <FieldLabel>
          {t("Dashboard theme", "Тема на контролната табла", "Tema e panelit")}
        </FieldLabel>
        <DashboardThemePicker
          value={theme}
          onValueChange={selectTheme}
          disabled={isSaving}
        />
        <FieldDescription role="status">
          {isSaving
            ? t(
                "Saving your theme…",
                "Се зачувува темата…",
                "Po ruhet tema juaj…",
              )
            : t(
                "Your theme is saved automatically.",
                "Вашата тема се зачувува автоматски.",
                "Tema juaj ruhet automatikisht.",
              )}
        </FieldDescription>
      </Field>
    </SettingsCard>
  );
}
