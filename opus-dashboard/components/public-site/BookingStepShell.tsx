"use client";

import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BookingStepShell({
  title,
  description,
  backLabel,
  onBack,
  backDisabled = false,
  summary,
  children,
}: {
  title: string;
  description?: string;
  backLabel: string;
  onBack: () => void;
  backDisabled?: boolean;
  summary?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pt-5 pb-10 sm:gap-8 sm:px-6 sm:pt-7 sm:pb-14">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onBack}
        disabled={backDisabled}
        className="-ml-2.5 h-auto min-h-11 w-fit max-w-full justify-start py-2 text-left whitespace-normal"
      >
        <ArrowLeft data-icon="inline-start" />
        {backLabel}
      </Button>

      <div className="flex flex-col gap-2">
        <h1
          tabIndex={-1}
          data-booking-step-heading
          className="max-w-2xl text-balance font-display text-2xl font-semibold tracking-tight outline-none sm:text-3xl"
        >
          {title}
        </h1>
        {description && (
          <p className="max-w-xl text-pretty text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      {summary ? (
        <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start lg:gap-8">
          <aside className="min-w-0 lg:order-2 lg:sticky lg:top-24">
            {summary}
          </aside>
          <div className="flex min-w-0 flex-col gap-6 lg:order-1">
            {children}
          </div>
        </div>
      ) : (
        <div className="flex min-w-0 flex-col gap-6">{children}</div>
      )}
    </section>
  );
}
