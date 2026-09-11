"use client";

import type { ReactNode } from "react";
import { ChartNoAxesCombined } from "lucide-react";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { WidgetTitle } from "@/components/dashboard/WidgetTitle";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";

export function AnalyticsWidgetFrame({
  title,
  isLoading,
  isEmpty,
  children,
  footer,
}: {
  title: string;
  isLoading: boolean;
  isEmpty: boolean;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { t } = useDashboardI18n();

  return (
    <Card className="h-full min-h-0 overflow-hidden" aria-busy={isLoading}>
      <CardHeader>
        <CardTitle>
          <WidgetTitle>{title}</WidgetTitle>
        </CardTitle>
        <CardDescription>
          {t("Last 30 days", "Последни 30 дена")}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-5 pb-5">
        {isLoading ? (
          <div
            className="flex flex-col gap-5"
            role="status"
            aria-label={t("Loading analytics", "Се вчитува аналитиката")}
          >
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-4/5" />
            <Skeleton className="h-6 w-3/5" />
          </div>
        ) : isEmpty ? (
          <Empty className="h-full min-h-48 p-3">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ChartNoAxesCombined />
              </EmptyMedia>
              <EmptyTitle>
                {t("No completed visits", "Нема завршени посети")}
              </EmptyTitle>
              <EmptyDescription>
                {t(
                  "Insights appear here as you complete appointments.",
                  "Увидите ќе се појават тука кога ќе завршите термини.",
                )}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          children
        )}
      </CardContent>
      {!isLoading && !isEmpty && footer && (
        <CardFooter className="mt-auto pb-5">{footer}</CardFooter>
      )}
    </Card>
  );
}
