"use client";

import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { cn } from "@/lib/utils";

export function OnboardingProgress({
  step,
  total,
  label,
  description,
}: {
  step: number;
  total: number;
  label: string;
  description: string;
}) {
  const { t } = useDashboardI18n();
  return (
    <div
      className="mb-8 w-full max-w-xl sm:mb-12"
      role="progressbar"
      aria-label={label}
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={step}
    >
      <div className="mb-3 flex justify-between gap-4 text-xs font-medium text-muted-foreground">
        <span data-replay-public>{description}</span>
        <span data-replay-public>
          {t(
            `Step ${step} of ${total}`,
            `Чекор ${step} од ${total}`,
            `Hapi ${step} nga ${total}`,
          )}
        </span>
      </div>
      <div className="flex gap-1.5" aria-hidden="true">
        {Array.from({ length: total }, (_, index) => (
          <span
            key={index}
            className={cn(
              "h-1 flex-1 rounded-full",
              index < step ? "bg-primary" : "bg-secondary",
            )}
          />
        ))}
      </div>
    </div>
  );
}
