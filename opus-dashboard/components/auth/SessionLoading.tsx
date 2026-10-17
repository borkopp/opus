"use client";

import { useEffect, useState } from "react";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export function SessionLoading({
  recovering,
  onRetry,
}: {
  recovering: boolean;
  onRetry: () => void;
}) {
  const { t } = useDashboardI18n();
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), 8_000);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <section
      className="flex min-h-40 flex-col items-center justify-center gap-4 px-6 text-center"
      aria-busy="true"
      aria-live="polite"
    >
      <Spinner className="size-6 text-brand" />
      <p className="text-sm text-muted-foreground" data-replay-public>
        {recovering
          ? t(
              "Reconnecting to your session…",
              "Повторно се поврзуваме со вашата сесија…",
              "Po rilidhemi me sesionin tuaj…",
            )
          : t(
              "Restoring your session…",
              "Ја обновуваме вашата сесија…",
              "Po rikthejmë sesionin tuaj…",
            )}
      </p>
      {(recovering || slow) && (
        <Button variant="outline" onClick={onRetry}>
          {t("Try again", "Обиди се повторно", "Provoni përsëri")}
        </Button>
      )}
    </section>
  );
}
