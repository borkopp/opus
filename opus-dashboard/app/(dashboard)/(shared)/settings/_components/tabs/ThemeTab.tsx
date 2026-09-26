"use client";

import { toast } from "sonner";
import { DashboardThemePicker } from "@/components/dashboard/DashboardThemePicker";
import { useDashboardAppearance } from "@/components/dashboard/DashboardAppearanceProvider";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { TabsContent } from "@/components/ui/tabs";
import { useSaveDashboardTheme } from "@/hooks/use-dashboard-theme";
import {
  dashboardThemeDetails,
  type DashboardTheme,
} from "@/lib/dashboard-theme";
import { SettingsCard } from "../SettingsCard";

export function ThemeTab() {
  const { t } = useDashboardI18n();
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
        ),
      );
    } catch {
      toast.error(
        t(
          "Could not save your theme. Please try again.",
          "Темата не е зачувана. Обидете се повторно.",
        ),
      );
    }
  }

  return (
    <TabsContent value="themes" className="m-0">
      <SettingsCard
        title={t("Themes", "Теми")}
        description={t(
          "Choose a style that feels like you.",
          "Изберете изглед што ви одговара.",
        )}
      >
        <DashboardThemePicker
          value={theme}
          onValueChange={selectTheme}
          disabled={isSaving}
        />
        <p
          data-replay-public
          role="status"
          className="mt-4 min-h-5 text-sm text-muted-foreground"
        >
          {isSaving
            ? t("Saving your theme…", "Се зачувува темата…")
            : t(
                "Changes are saved automatically.",
                "Промените се зачувуваат автоматски.",
              )}
        </p>
      </SettingsCard>
    </TabsContent>
  );
}
