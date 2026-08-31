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
          "bg-primary text-primary-foreground",
          "hover:bg-primary/90",
          "hover:shadow-md hover:shadow-primary/20",
        ],
        variant === "outline" && [
          "bg-background text-foreground",
          "border border-border",
          "shadow-xs",
          "hover:bg-accent hover:text-accent-foreground",
        ],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
