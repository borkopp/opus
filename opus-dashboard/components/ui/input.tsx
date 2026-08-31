import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const inputVariants = cva(
  "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground border-input w-full min-w-0 border outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
  {
    variants: {
      variant: {
        default:
          "h-9 rounded-md bg-card px-3 py-1 text-base shadow-xs transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 md:text-sm",
        surface:
          "h-11 rounded-xl border-transparent bg-secondary px-4 py-2 text-sm shadow-none transition-[background-color,border-color,box-shadow] focus-visible:border-ring focus-visible:bg-card focus-visible:ring-3 focus-visible:ring-ring/20",
        prominent:
          "h-16 rounded-2xl bg-card px-5 py-3 text-lg shadow-s transition-[background-color,border-color,box-shadow] placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 sm:h-[4.5rem] sm:px-6 sm:text-xl"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
)

function Input({
  className,
  type,
  variant = "default",
  ...props
}: React.ComponentProps<"input"> & VariantProps<typeof inputVariants>) {
  return (
    <input
      type={type}
      data-slot="input"
      data-variant={variant}
      className={cn(inputVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Input, inputVariants }
