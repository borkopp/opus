import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border border-transparent px-2.5 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/70 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,background-color,border-color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        pro: "pro-badge relative isolate overflow-visible",
        secondary:
          "bg-secondary text-secondary-foreground border border-border/60 [a&]:hover:bg-[#e8f2f9]",
        destructive:
          "bg-destructive text-primary-foreground [a&]:hover:bg-destructive/90",
        danger:
          "bg-danger/15 text-danger border-danger/30 [a&]:hover:bg-danger/20",
        success:
          "bg-success/15 text-success border-success/30 [a&]:hover:bg-success/20",
        highlight:
          "bg-highlight/20 text-foreground border-highlight/40 [a&]:hover:bg-highlight/30",
        "brand-soft":
          "bg-accent text-accent-foreground border-accent [a&]:hover:bg-accent/80",
        outline:
          "border-border bg-card text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        ghost: "[a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        link: "text-primary underline-offset-4 [a&]:hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span";

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
