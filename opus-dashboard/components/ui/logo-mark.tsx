import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function LogoMark({ className, ...props }: ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 40 48"
      aria-hidden="true"
      className={cn("h-[1.35em] w-auto shrink-0 fill-current", className)}
      {...props}
    >
      <path
        d="m40 32v-16c0-6.62742-5.3726-12-12-12h-16l-12 12h22c3.3137 0 6 2.6863 6 6v22z"
        opacity=".3"
      />
      <path d="m.0000014 16-.0000014 16c-.00000058 6.6274 5.37258 12 12 12h16l12-12h-20c-4.4183 0-8-3.5817-8-8v-20z" />
    </svg>
  );
}
