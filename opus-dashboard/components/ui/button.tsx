import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-[color,background-color,border-color,box-shadow,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.97] motion-reduce:transform-none outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring/70 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-xs shadow-black/5 hover:bg-primary/90",
        dark:
          "bg-[#25292f] text-white shadow-[0_3px_1px_rgba(0,0,0,0.08),inset_0_1px_1px_rgba(255,255,255,0.17)] hover:bg-[#3b424c] hover:shadow-[0_5px_15px_rgba(24,46,66,0.12)] dark:bg-foreground dark:text-background",
        brand:
          "bg-brand text-white shadow-xs hover:bg-brand/90 hover:shadow-sm",
        navSolid:
          "bg-foreground text-background hover:bg-foreground/90",
        navGlass:
          "border border-foreground/15 bg-foreground/10 text-foreground backdrop-blur-md hover:bg-foreground/15",
        hero:
          "bg-white text-neutral-900 shadow-xs hover:bg-white/90 focus-visible:outline-white",
        heroGlass:
          "border border-white/15 bg-white/20 text-white backdrop-blur-md hover:bg-white/30 focus-visible:outline-white",
        destructive:
          "bg-destructive text-destructive-foreground shadow-xs shadow-black/5 hover:bg-destructive/90 focus-visible:outline-destructive",
        outline:
          "border border-input bg-card text-foreground shadow-xs shadow-black/5 hover:bg-secondary hover:text-foreground dark:bg-card/40 dark:hover:bg-card",
        secondary:
          "border border-[#e6eef4] bg-secondary text-secondary-foreground shadow-xs shadow-black/5 hover:bg-[#e8f2f9] dark:border-border dark:hover:bg-secondary/80",
        ghost:
          "text-foreground hover:bg-secondary/80 hover:text-foreground",
        link:
          "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 rounded-lg gap-1.5 px-3 has-[>svg]:px-2.5 text-xs",
        lg: "h-10 rounded-lg px-6 has-[>svg]:px-4 text-sm font-medium",
        hero: "min-h-11 rounded-full px-5 py-3 text-sm",
        icon: "size-9 rounded-lg",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 rounded-lg",
        "icon-lg": "size-10 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
