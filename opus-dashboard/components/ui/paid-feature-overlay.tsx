import type { ReactNode } from "react";
import { LogoPro } from "@/components/Logo";
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
          className="absolute inset-0 flex items-center justify-center"
        >
          <span aria-hidden="true">
            <LogoPro className={compact ? "text-lg" : "text-3xl sm:text-4xl"} />
          </span>
        </div>
      )}
    </div>
  );
}
