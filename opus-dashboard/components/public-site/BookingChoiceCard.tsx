"use client";

import { ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function BookingChoiceCard({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "group flex w-full min-w-0 items-center gap-3 rounded-2xl border bg-card p-4 text-left transition-[border-color,background-color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:gap-4 sm:p-5",
        selected
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/40 hover:bg-accent/40 active:bg-accent",
      )}
    >
      <div className="min-w-0 flex-1">{children}</div>
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center",
          selected
            ? "text-primary"
            : "text-muted-foreground group-hover:text-primary",
        )}
        aria-hidden="true"
      >
        {selected ? (
          <Check className="size-5" />
        ) : (
          <ArrowRight className="size-5" />
        )}
      </span>
    </button>
  );
}
