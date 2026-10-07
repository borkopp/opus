"use client";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { PushPreferencesCard } from "@/components/notifications/PushPreferencesCard";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { AppearancePreferences } from "./_components/AppearancePreferences";
export default function NotificationPreferencesPage() {
  const { t } = useDashboardI18n();
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 pb-10">
      <DashboardPageHeader
        title={t("My preferences", "Мои поставки", "Preferencat e mia")}
        description={t(
          "Choose your dashboard style, language, and personal alerts.",
          "Изберете изглед, јазик и лични известувања за контролната табла.",
          "Zgjidhni pamjen e panelit, gjuhën dhe njoftimet personale.",
        )}
      />
      <AppearancePreferences />
      <PushPreferencesCard />
    </div>
  );
}
