"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { cn } from "@/lib/utils";

export function StepFrame({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    heading.current?.focus({ preventScroll: true });
  }, [title]);
  return (
    <section className="flex w-full min-w-0 flex-col items-center">
      <h1
        ref={heading}
        tabIndex={-1}
        className="max-w-3xl text-balance text-center font-display text-[2rem] font-semibold leading-[1.1] tracking-tight outline-none sm:text-4xl lg:text-5xl"
      >
        {title}
      </h1>
      {description && (
        <p className="mt-3 max-w-lg text-pretty text-center text-sm leading-relaxed text-muted-foreground sm:text-base">
          {description}
        </p>
      )}
      <div className="mt-8 w-full min-w-0 max-w-xl sm:mt-10">{children}</div>
    </section>
  );
}

export function WizardActions({
  canGoBack,
  onBack,
  isSubmitting = false,
  disabled = false,
  label,
}: {
  canGoBack: boolean;
  onBack: () => void;
  isSubmitting?: boolean;
  disabled?: boolean;
  label?: string;
}) {
  const { t } = useDashboardI18n();
  return (
    <div
      className={cn(
        "mt-6 grid w-full items-center gap-3 border-t border-border/50 bg-background/95 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur-sm sm:static sm:mt-8 sm:flex sm:justify-center sm:gap-6 sm:border-0 sm:bg-transparent sm:pb-0",
        canGoBack && "grid-cols-[auto_minmax(0,1fr)]",
      )}
    >
      {canGoBack && (
        <Button
          type="button"
          variant="ghost"
          className="h-12 px-3"
          disabled={isSubmitting}
          onClick={onBack}
        >
          <ArrowLeft data-icon="inline-start" />
          {t("Back", "Назад")}
        </Button>
      )}
      <Button
        type="submit"
        size="lg"
        className="h-12 min-w-0 px-5 shadow-none sm:min-w-36"
        disabled={disabled || isSubmitting}
      >
        {isSubmitting ? <Spinner /> : null}
        {label ?? t("Next", "Следно")}
        <ArrowRight data-icon="inline-end" />
      </Button>
    </div>
  );
}
