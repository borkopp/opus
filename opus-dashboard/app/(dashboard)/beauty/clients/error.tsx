"use client";

import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { Button } from "@/components/ui/button";

export default function ClientsError({ reset }: { reset: () => void }) {
  const { t } = useDashboardI18n();
  return (
    <div className="flex flex-col items-start gap-4 rounded-3xl bg-card p-8">
      <h1 data-replay-public className="text-xl font-medium">
        {t("Couldn't load clients", "Клиентите не можеа да се вчитаат")}
      </h1>
      <p data-replay-public className="text-sm text-muted-foreground">
        {t(
          "Check your connection and try again.",
          "Проверете ја врската и обидете се повторно.",
        )}
      </p>
      <Button data-replay-public variant="outline" onClick={reset}>
        {t("Try again", "Обиди се повторно")}
      </Button>
    </div>
  );
}
