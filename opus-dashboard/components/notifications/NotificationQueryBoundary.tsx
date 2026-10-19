"use client";

import { Component, type ReactNode } from "react";
import { Bell, TriangleAlert } from "lucide-react";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

function NotificationLoadError({
  compact,
  retry,
}: {
  compact?: boolean;
  retry: () => void;
}) {
  const { t } = useDashboardI18n();
  const message = (
    <div className="flex flex-col items-start gap-3 p-4" role="alert">
      <p className="text-sm font-semibold">
        {t(
          "Notifications couldn't load",
          "Известувањата не се вчитаа",
          "Njoftimet nuk u ngarkuan",
        )}
      </p>
      <p className="text-sm text-muted-foreground">
        {t(
          "Check your connection and try again.",
          "Провери ја врската и обиди се повторно.",
          "Kontrolloni lidhjen dhe provoni përsëri.",
        )}
      </p>
      <Button variant="outline" className="min-h-11" onClick={retry}>
        {t("Retry", "Обиди се повторно", "Provoni përsëri")}
      </Button>
    </div>
  );
  if (!compact)
    return (
      <div className="rounded-2xl border border-border bg-card">{message}</div>
    );
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative size-11 rounded-full"
          aria-label={t(
            "Notifications unavailable",
            "Известувањата се недостапни",
            "Njoftimet nuk janë të disponueshme",
          )}
        >
          <Bell aria-hidden="true" className="size-5" />
          <TriangleAlert
            aria-hidden="true"
            className="absolute -right-1 -top-1 size-4 rounded bg-card text-destructive"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="max-w-[calc(100vw-2rem)] p-0">
        {message}
      </PopoverContent>
    </Popover>
  );
}

/** A failed live query should leave a recoverable notification surface. */
export class NotificationQueryBoundary extends Component<
  { children: ReactNode; compact?: boolean },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <NotificationLoadError
        compact={this.props.compact}
        retry={() => this.setState({ failed: false })}
      />
    ) : (
      this.props.children
    );
  }
}
