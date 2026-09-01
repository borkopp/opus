"use client";

import { cn } from "@/lib/utils";

export type BookingStep = "service" | "staff" | "datetime" | "details";

interface BookingStepProgressProps {
  currentStep: BookingStep;
  completedSteps: Set<BookingStep>;
  onStepClick: (step: BookingStep) => void;
  disabled?: boolean;
}

const STEPS: { id: BookingStep; label: string }[] = [
  { id: "service", label: "Услуга" },
  { id: "staff", label: "Специјалист" },
  { id: "datetime", label: "Термин" },
  { id: "details", label: "Податоци" },
];

export function BookingStepProgress({
  currentStep,
  completedSteps,
  onStepClick,
  disabled = false,
}: BookingStepProgressProps) {
  const currentIndex = STEPS.findIndex((step) => step.id === currentStep);
  const progress = ((currentIndex + 1) / STEPS.length) * 100;

  return (
    <nav aria-label="Прогрес на резервација" className="bg-secondary/45">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between gap-4 text-xs">
          <span className="font-medium text-foreground">
            Чекор {currentIndex + 1} од {STEPS.length}
          </span>
          <span className="text-muted-foreground">
            {STEPS[currentIndex]?.label}
          </span>
        </div>

        <div
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-valuenow={currentIndex + 1}
          className="h-1 overflow-hidden rounded-full bg-secondary"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>

        <ol className="hidden grid-cols-4 gap-4 sm:grid">
          {STEPS.map((step, index) => {
            const isCurrent = step.id === currentStep;
            const isCompleted = completedSteps.has(step.id);
            const isClickable =
              !disabled && (isCompleted || index < currentIndex);

            return (
              <li key={step.id}>
                <button
                  type="button"
                  disabled={!isClickable}
                  aria-current={isCurrent ? "step" : undefined}
                  onClick={() => isClickable && onStepClick(step.id)}
                  className={cn(
                    "w-full rounded-md text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isCurrent
                      ? "font-semibold text-foreground"
                      : isCompleted
                        ? "text-foreground hover:text-primary"
                        : "text-muted-foreground",
                  )}
                >
                  {index + 1}. {step.label}
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
