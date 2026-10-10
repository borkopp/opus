"use client";

import { usePublicBookingI18n } from "./PublicBookingI18n";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export type BookingStep = "service" | "staff" | "datetime" | "details";

interface BookingStepProgressProps {
  currentStep: BookingStep;
  completedSteps: Set<BookingStep>;
  onStepClick: (step: BookingStep) => void;
  disabled?: boolean;
}

export function BookingStepProgress({
  currentStep,
  completedSteps,
  onStepClick,
  disabled = false,
}: BookingStepProgressProps) {
  const { text } = usePublicBookingI18n();
  const STEPS: { id: BookingStep; label: string }[] = [
    { id: "service", label: text("Услуга") },
    { id: "staff", label: text("Тим") },
    { id: "datetime", label: text("Термин") },
    { id: "details", label: text("Податоци") },
  ];
  const currentIndex = STEPS.findIndex((step) => step.id === currentStep);
  return (
    <nav
      aria-label={text("Прогрес на резервација")}
      className="mx-auto w-full max-w-5xl px-4 pt-5 sm:px-6 sm:pt-7"
    >
      <p className="sr-only" aria-live="polite">
        {text("Чекор")} {currentIndex + 1} {text("од")} {STEPS.length}:{" "}
        {STEPS[currentIndex]?.label}
      </p>
      <div className="relative">
        <div
          className="absolute top-4 right-[12.5%] left-[12.5%] h-px bg-border sm:hidden"
          aria-hidden="true"
        />
        <ol className="relative grid grid-cols-4 gap-1 sm:gap-3">
          {STEPS.map((step, index) => {
            const isCurrent = step.id === currentStep;
            const isCompleted =
              index < currentIndex && completedSteps.has(step.id);
            const isClickable =
              !disabled &&
              !isCurrent &&
              STEPS.slice(0, index).every((previous) =>
                completedSteps.has(previous.id),
              );

            return (
              <li key={step.id}>
                <button
                  type="button"
                  disabled={!isClickable}
                  aria-current={isCurrent ? "step" : undefined}
                  onClick={() => isClickable && onStepClick(step.id)}
                  className={cn(
                    "flex min-h-14 w-full flex-col items-center gap-2 rounded-xl px-1 py-1 text-center text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-12 sm:flex-row sm:gap-2.5 sm:px-3 sm:py-2 sm:text-left sm:text-sm",
                    isCurrent
                      ? "bg-transparent font-semibold text-primary sm:bg-primary/5"
                      : isClickable
                        ? "text-foreground hover:bg-accent"
                        : "text-muted-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full border bg-background font-medium",
                      isCurrent
                        ? "border-primary bg-primary text-primary-foreground"
                        : isCompleted
                          ? "border-primary/25 bg-accent text-primary"
                          : "border-border",
                    )}
                    aria-hidden="true"
                  >
                    {isCompleted ? <Check className="size-4" /> : index + 1}
                  </span>
                  <span>{step.label}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
