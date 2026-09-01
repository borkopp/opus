"use client";

import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BookingStepShell({
  title,
  description,
  backLabel,
  onBack,
  children,
}: {
  title: string;
  description: string;
  backLabel: string;
  onBack: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="w-fit"
      >
        <ArrowLeft data-icon="inline-start" />
        {backLabel}
      </Button>

      <div className="flex max-w-2xl flex-col gap-3">
        <h1 className="text-balance font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {title}
        </h1>
        <p className="max-w-xl text-pretty leading-7 text-muted-foreground">
          {description}
        </p>
      </div>

      {children}
    </section>
  );
}
