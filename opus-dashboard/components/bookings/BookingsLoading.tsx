"use client";

import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { Spinner } from "@/components/ui/spinner";

export function BookingsLoading() {
  const { t } = useDashboardI18n();
  return (
    <div
      className="flex min-h-64 flex-1 items-center justify-center p-12"
      role="status"
      aria-label={t(
        "Loading bookings…",
        "Вчитување термини…",
        "Po ngarkohen terminet…",
      )}
    >
      <Spinner className="size-8 text-brand" aria-hidden="true" />
    </div>
  );
}
