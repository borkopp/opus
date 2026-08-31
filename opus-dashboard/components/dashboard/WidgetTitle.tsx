import * as React from "react";

import { cn } from "@/lib/utils";

export const widgetTitleClassName =
  "font-display text-xl font-semibold leading-none tracking-tight text-foreground";

export function WidgetTitle({
  className,
  ...props
}: React.ComponentProps<"h2">) {
  return (
    <h2
      data-slot="dashboard-widget-title"
      className={cn(widgetTitleClassName, className)}
      {...props}
    />
  );
}
