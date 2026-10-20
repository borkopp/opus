"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarCheck2,
  Coins,
  Repeat2,
  UsersRound,
} from "lucide-react";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { Card } from "@/components/ui/card";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Appear } from "@/components/ui/appear";
import type { StudioAnalytics } from "@/lib/studio-analytics";

export function AnalyticsMetrics({ data }: { data: StudioAnalytics }) {
  const { t, locale } = useDashboardI18n();
  const { summary, previous } = data;
  const metrics = [
    {
      label: t(
        "Appointment value",
        "Вредност на термините",
        "Vlera e termineve",
      ),
      value: summary.appointmentValueMinorUnits,
      before: previous.summary.appointmentValueMinorUnits,
      displayValue: summary.appointmentValueMinorUnits / 100,
      unit: data.currency,
      icon: Coins,
      detail: t(
        "Completed appointments only",
        "Само завршени термини",
        "Vetëm terminet e përfunduara",
      ),
    },
    {
      label: t("Completed visits", "Завршени посети", "Vizita të përfunduara"),
      value: summary.completedVisits,
      before: previous.summary.completedVisits,
      displayValue: summary.completedVisits,
      icon: CalendarCheck2,
      detail: t(
        "Across all currencies",
        "За сите валути",
        "Në të gjitha monedhat",
      ),
    },
    {
      label: t("Clients served", "Услужени клиенти", "Klientë të shërbyer"),
      value: summary.visitedClients,
      before: previous.summary.visitedClients,
      displayValue: summary.visitedClients,
      icon: UsersRound,
      detail: t(
        "Distinct clients with a visit",
        "Клиенти со завршена посета",
        "Klientë unikë me një vizitë",
      ),
    },
    {
      label: t("Returning clients", "Повторни клиенти", "Klientë të rikthyer"),
      value: summary.returningClients,
      before: previous.summary.returningClients,
      displayValue: summary.returningClients,
      icon: Repeat2,
      detail: t(
        "Visited before this period",
        "Со посета пред овој период",
        "Me vizitë para kësaj periudhe",
      ),
    },
  ];
  return (
    <div className="grid min-w-0 grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4">
      {metrics.map((metric, index) => {
        const change =
          metric.before > 0
            ? ((metric.value - metric.before) / metric.before) * 100
            : null;
        const Direction =
          change !== null && change < 0 ? ArrowDownRight : ArrowUpRight;
        return (
          <Appear key={metric.label} delay={index * 45} className="min-w-0">
            <Card className="h-full min-w-0 gap-4 rounded-2xl border-0 p-4 shadow-none sm:rounded-3xl sm:p-5">
              <div
                data-appear
                className="flex items-start justify-between gap-2"
              >
                <p className="text-xs text-muted-foreground sm:text-sm">
                  {metric.label}
                </p>
                <metric.icon
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
              </div>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <AnimatedNumber
                  value={metric.displayValue}
                  locale={locale}
                  delay={index * 45}
                  className="text-[clamp(1.5rem,2.4vw,2.3rem)] leading-tight font-medium tracking-tight"
                />
                {metric.unit && (
                  <span className="text-xs font-medium text-muted-foreground">
                    {metric.unit}
                  </span>
                )}
              </div>
              <div data-appear className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  {change !== null ? (
                    <span
                      className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium tabular-nums ${change < 0 ? "bg-orange-50 text-orange-800" : "bg-emerald-50 text-emerald-800"}`}
                    >
                      <Direction className="size-3" />
                      <AnimatedNumber
                        value={change}
                        locale={locale}
                        maximumFractionDigits={1}
                        signDisplay="exceptZero"
                        suffix="%"
                        delay={index * 45}
                      />
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                  <span className="text-muted-foreground">
                    {t(
                      "vs. previous period",
                      "според претходниот период",
                      "kundrejt periudhës së kaluar",
                    )}
                  </span>
                </div>
                <p className="hidden text-[11px] text-muted-foreground sm:block">
                  {metric.detail}
                </p>
              </div>
            </Card>
          </Appear>
        );
      })}
    </div>
  );
}
