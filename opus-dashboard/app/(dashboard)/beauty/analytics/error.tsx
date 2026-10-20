"use client";

import Link from "next/link";
import { ChartNoAxesCombined } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";

export default function AnalyticsError({ reset }: { reset: () => void }) {
  const { t } = useDashboardI18n();
  return (
    <div className="flex min-h-96 flex-col items-center justify-center gap-4 rounded-3xl bg-card px-6 py-12 text-center">
      <ChartNoAxesCombined className="size-8 text-muted-foreground" />
      <h1>
        {t(
          "Analytics couldn’t load",
          "Аналитиката не се вчита",
          "Analitika nuk mund të ngarkohej",
        )}
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">
        {t(
          "Try again to refresh your studio access and report data. If this continues, contact support for help with your report.",
          "Обидете се повторно за да ги освежите пристапот и податоците. Ако проблемот продолжи, контактирајте со поддршката.",
          "Provoni përsëri për të rifreskuar qasjen dhe të dhënat. Nëse vazhdon, kontaktoni mbështetjen.",
        )}
      </p>
      <div className="flex gap-3">
        <Button onClick={reset}>
          {t("Try again", "Обиди се повторно", "Provo përsëri")}
        </Button>
        <Button asChild variant="outline">
          <Link href="/beauty">
            {t("Back to dashboard", "Назад кон таблата", "Kthehu te paneli")}
          </Link>
        </Button>
      </div>
    </div>
  );
}
