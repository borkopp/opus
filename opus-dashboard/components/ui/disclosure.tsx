import type { ComponentProps, ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Native disclosure keeps optional controls accessible without extra runtime state. */
export function Disclosure({
  title,
  description,
  children,
  className,
  ...props
}: Omit<ComponentProps<"details">, "title"> & {
  title: ReactNode;
  description?: ReactNode;
}) {
  return (
    <details
      className={cn(
        "group/disclosure rounded-xl border border-border",
        className,
      )}
      {...props}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 flex-col gap-1">
          <span className="text-sm font-medium">{title}</span>
          {description && (
            <span className="text-xs text-muted-foreground">{description}</span>
          )}
        </span>
        <ChevronDown
          aria-hidden
          className="size-4 shrink-0 group-open/disclosure:rotate-180"
        />
      </summary>
      <div className="flex flex-col gap-5 px-4 pb-4">{children}</div>
    </details>
  );
}
