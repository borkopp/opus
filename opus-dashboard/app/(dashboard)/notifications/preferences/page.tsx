"use client";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { PushPreferencesCard } from "@/components/notifications/PushPreferencesCard";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
export default function NotificationPreferencesPage() {
  const { t } = useDashboardI18n();
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 pb-10">
      <DashboardPageHeader
        title={t(
          "Notification preferences",
          "Поставки за известувања",
          "Preferencat e njoftimeve",
        )}
        description={t(
          "Choose how OPUS alerts you across your devices.",
          "Избери како OPUS ќе те известува на твоите уреди.",
          "Zgjidhni si ju njofton OPUS në pajisjet tuaja.",
        )}
      />
      <PushPreferencesCard />
    </div>
  );
}
