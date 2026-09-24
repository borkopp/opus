"use client";

import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { LogoPro } from "@/components/Logo";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { cn } from "@/lib/utils";

export interface PaidFeatureOverlayProps {
  locked: boolean;
  children: ReactNode;
  featureLabel?: string;
  compact?: boolean;
  className?: string;
  contentClassName?: string;
}

/**
 * Keeps premium functionality visible as a preview while making every
 * underlying control unfocusable and non-interactive for free-plan users.
 */
export function PaidFeatureOverlay({
  locked,
  children,
  featureLabel = "This feature requires OPUS Pro",
  compact = false,
  className,
  contentClassName,
}: PaidFeatureOverlayProps) {
  const { t } = useDashboardI18n();
  return (
    <div className={cn("relative overflow-hidden rounded-2xl", className)}>
      <div
        aria-hidden={locked || undefined}
        inert={locked ? true : undefined}
        className={cn(
          "h-full",
          locked &&
            "pointer-events-none select-none blur-[3px] opacity-35 saturate-50",
          contentClassName,
        )}
      >
        {children}
      </div>

      {locked && (
        <div
          role="note"
          aria-label={featureLabel}
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-3"
        >
          <span className="text-sm font-medium text-muted-foreground">
            {t("Available with", "Достапно со")}
          </span>
          <span aria-hidden="true">
            <LogoPro className={compact ? "text-lg" : "text-3xl sm:text-4xl"} />
          </span>
          <a
            href="https://opus.mk/#pricing"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t(
              "Learn more about OPUS Pro (opens in a new tab)",
              "Дознај повеќе за OPUS Pro (се отвора во нов таб)",
            )}
            className="inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {t("Learn more", "Дознај повеќе")}
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </a>
        </div>
      )}
    </div>
  );
}
