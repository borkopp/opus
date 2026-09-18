"use client";

import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BookingStepShell({
  title,
  backLabel,
  onBack,
  children,
}: {
  title: string;
  backLabel: string;
  onBack: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-4 pb-8 sm:gap-8 sm:px-6 sm:py-12">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="h-auto min-h-11 w-fit max-w-full justify-start py-2 text-left whitespace-normal"
      >
        <ArrowLeft data-icon="inline-start" />
        {backLabel}
      </Button>

      <h1 className="max-w-2xl text-balance font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        {title}
      </h1>

      {children}
    </section>
  );
}
