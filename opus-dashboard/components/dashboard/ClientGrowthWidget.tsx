"use client";

import type { FunctionReturnType } from "convex/server";
import { ArrowRight } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { useFreePlanAnalytics } from "@/hooks/use-free-plan-analytics";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { AnalyticsWidgetFrame } from "@/components/dashboard/AnalyticsWidgetFrame";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type ClientGrowth = FunctionReturnType<
  typeof api.dashboard.getFreePlanAnalytics
>["clientGrowth"];

export function ClientGrowthWidget({
  formatMoney,
}: {
  formatMoney: (amount: number, currency: string) => string;
}) {
  const { locale, t } = useDashboardI18n();
  const data = useFreePlanAnalytics()?.clientGrowth;
  const current = data?.current;
  const previous = data?.previous;
  const averageValue = (period: ClientGrowth["current"]) =>
    period.averageValueMinorUnits !== null && period.currency
      ? formatMoney(period.averageValueMinorUnits, period.currency)
      : "—";
  const number = (value: number) => value.toLocaleString(locale);

  const comparisonRows =
    current && previous
      ? [
          {
            label: t("Unique clients served", "Услужени различни клиенти"),
            current: number(current.clients),
            previous: number(previous.clients),
          },
          {
            label: t("First-time clients", "Клиенти со прва посета"),
            current: number(current.newClients),
            previous: number(previous.newClients),
          },
          {
            label: t("Returning clients", "Повратни клиенти"),
            current: number(current.returningClients),
            previous: number(previous.returningClients),
          },
          {
            label: t("Completed appointments", "Завршени термини"),
            current: number(current.completedAppointments),
            previous: number(previous.completedAppointments),
          },
          {
            label: t(
              "Average appointment value",
              "Просечна вредност на термин",
            ),
            current: averageValue(current),
            previous: averageValue(previous),
          },
        ]
      : [];

  return (
    <Dialog>
      <AnalyticsWidgetFrame
        title={t("Client Growth", "Раст на клиенти")}
        isLoading={data === undefined}
        isEmpty={current?.clients === 0 && previous?.clients === 0}
        footer={
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between"
            >
              {t("View details", "Види детали")}
              <ArrowRight data-icon="inline-end" />
            </Button>
          </DialogTrigger>
        }
      >
        {data && current && (
          <>
            <div className="flex flex-col gap-2">
              <span className="font-display text-5xl font-semibold leading-none tracking-tight tabular-nums">
                {number(current.clients)}
              </span>
              <p className="text-sm text-muted-foreground">
                {t("unique clients served", "услужени различни клиенти")}
              </p>
              <p
                className={cn(
                  "text-xs",
                  data.clientChange > 0
                    ? "text-success"
                    : "text-muted-foreground",
                )}
              >
                {data.clientChange === 0
                  ? t(
                      "Same as the previous 30 days",
                      "Исто како во претходните 30 дена",
                    )
                  : `${data.clientChange.toLocaleString(locale, { signDisplay: "always" })} ${t("vs. previous 30 days", "во споредба со претходните 30 дена")}`}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <svg
                viewBox="0 0 100 8"
                preserveAspectRatio="none"
                className="h-2 w-full overflow-hidden rounded-full"
                aria-hidden="true"
              >
                <rect width="100" height="8" className="fill-muted" />
                <rect
                  width={current.newClientShare}
                  height="8"
                  className="fill-primary"
                />
                <rect
                  x={current.newClientShare}
                  width={current.returningClientShare}
                  height="8"
                  className="fill-muted-foreground"
                />
              </svg>
              <dl className="flex flex-col gap-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="flex items-center gap-2">
                    <span
                      className="size-2 shrink-0 rounded-full bg-primary"
                      aria-hidden="true"
                    />
                    {t("First-time", "Прва посета")}
                  </dt>
                  <dd className="font-display font-semibold tabular-nums">
                    {number(current.newClients)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="flex items-center gap-2">
                    <span
                      className="size-2 shrink-0 rounded-full bg-muted-foreground"
                      aria-hidden="true"
                    />
                    {t("Returning", "Повратни")}
                  </dt>
                  <dd className="font-display font-semibold tabular-nums">
                    {number(current.returningClients)}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="mt-auto flex flex-col gap-1">
              <p className="text-xs text-muted-foreground">
                {t("Average appointment value", "Просечна вредност на термин")}
              </p>
              <p className="font-display text-lg font-semibold tabular-nums">
                {averageValue(current)}
              </p>
              {current.completedAppointments > 0 && !current.currency && (
                <p className="text-xs text-muted-foreground">
                  {t(
                    "Unavailable across different currencies.",
                    "Не е достапно за различни валути.",
                  )}
                </p>
              )}
            </div>
          </>
        )}
      </AnalyticsWidgetFrame>

      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("Client Growth", "Раст на клиенти")}</DialogTitle>
          <DialogDescription>
            {t(
              "A comparison of two equal 30-day periods, based on completed visits.",
              "Споредба на два еднакви периоди од 30 дена, врз основа на завршени посети.",
            )}
          </DialogDescription>
        </DialogHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("Metric", "Показател")}</TableHead>
              <TableHead className="text-right">
                {t("Last 30 days", "Последни 30 дена")}
              </TableHead>
              <TableHead className="text-right">
                {t("Previous 30 days", "Претходни 30 дена")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {comparisonRows.map((row) => (
              <TableRow key={row.label}>
                <TableCell className="whitespace-normal">{row.label}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.current}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.previous}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t(
            "Each client is counted once per period. First-time means their first recorded completed visit falls in that period; returning clients have an earlier completed visit. Average value uses recorded appointment prices.",
            "Секој клиент се брои еднаш во периодот. Прва посета значи дека првата запишана завршена посета е во тој период; повратните клиенти имаат претходна завршена посета. Просечната вредност ги користи запишаните цени на термините.",
          )}
        </p>
      </DialogContent>
    </Dialog>
  );
}
