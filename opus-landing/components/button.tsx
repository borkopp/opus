"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline";
  children: React.ReactNode;
  ref?: React.Ref<HTMLButtonElement>;
}

export function Button({
  className,
  variant = "default",
  children,
  ref,
  ...props
}: ButtonProps) {
  return (
    <button
      ref={ref}
      className={cn(
        "relative inline-flex cursor-pointer items-center justify-center rounded-full px-6 py-3 text-base font-medium transition-all duration-200 active:scale-[0.98]",
        variant === "default" && [
          "from-brand-secondary to-brand-primary bg-linear-to-b",
          "text-white",
          "[text-shadow:0_1px_2px_rgba(0,0,0,0.2)]",
          "hover:from-brand-secondary hover:to-brand-primary",
          "hover:shadow-[0_1px_2px_rgba(0,0,0,0.1),0_3px_5px_rgba(206,93,69,0.5),inset_0_1px_0_rgba(255,255,255,0.25)]",
        ],
        variant === "outline" && [
          "bg-white",
          "text-neutral-700",
          "ring-1 ring-neutral-200",
          "shadow-[0_1px_2px_rgba(0,0,0,0.05)]",
          "hover:bg-neutral-50",
          "hover:ring-neutral-300",
          "dark:bg-neutral-800 dark:text-neutral-200 dark:ring-neutral-700 dark:hover:bg-neutral-700 dark:hover:ring-neutral-600",
        ],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
