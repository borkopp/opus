"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export function ServicePerformanceWidget({
  formatMoney,
}: {
  formatMoney: (amount: number, currency: string) => string;
}) {
  const { locale, t } = useDashboardI18n();
  const data = useFreePlanAnalytics()?.servicePerformance;
  const [metric, setMetric] = useState<"appointments" | "revenue">(
    "appointments",
  );
  const activeMetric = data?.canCompareRevenue ? metric : "appointments";
  const rows =
    activeMetric === "revenue" ? data?.byRevenue : data?.byAppointments;
  const serviceName = (names: (string | null)[]) =>
    names
      .map((name) => name ?? t("Removed service", "Отстранета услуга"))
      .join(" + ");
  const money = (amount: number | null, currency: string | null) =>
    amount !== null && currency ? formatMoney(amount, currency) : "—";
  const signedNumber = (value: number) =>
    value.toLocaleString(locale, { signDisplay: "exceptZero" });

  return (
    <Dialog>
      <AnalyticsWidgetFrame
        title={t("Service Performance", "Успешност на услуги")}
        isLoading={data === undefined}
        isEmpty={data?.byAppointments.length === 0}
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
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={activeMetric}
          onValueChange={(value) => {
            if (value === "appointments" || value === "revenue")
              setMetric(value);
          }}
          aria-label={t("Rank services by", "Рангирај услуги според")}
          className="w-full"
        >
          <ToggleGroupItem value="appointments" className="flex-1">
            {t("Visits", "Посети")}
          </ToggleGroupItem>
          <ToggleGroupItem
            value="revenue"
            disabled={!data?.canCompareRevenue}
            className="flex-1"
          >
            {t("Revenue", "Приход")}
          </ToggleGroupItem>
        </ToggleGroup>

        <ol
          className="flex flex-col gap-5"
          aria-label={t("Top services", "Најуспешни услуги")}
        >
          {rows?.slice(0, 3).map((row) => (
            <li key={row.id} className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span
                  className="min-w-0 truncate font-medium"
                  title={serviceName(row.names)}
                >
                  {serviceName(row.names)}
                </span>
                <span className="shrink-0 font-display font-semibold tabular-nums">
                  {activeMetric === "revenue"
                    ? money(row.revenueMinorUnits, row.currency)
                    : row.appointments.toLocaleString(locale)}
                </span>
              </div>
              <svg
                viewBox="0 0 100 6"
                preserveAspectRatio="none"
                className="h-1.5 w-full overflow-hidden rounded-full"
                aria-hidden="true"
              >
                <rect width="100" height="6" className="fill-muted" />
                <rect
                  width={
                    activeMetric === "revenue"
                      ? row.revenueBarPct
                      : row.appointmentBarPct
                  }
                  height="6"
                  rx="3"
                  className="fill-primary"
                />
              </svg>
            </li>
          ))}
        </ol>

        <p className="mt-auto text-xs leading-relaxed text-muted-foreground">
          {data?.insight ? (
            <>
              <span className="font-medium text-foreground">
                {serviceName(data.insight.names)}
              </span>
              {" · "}
              {signedNumber(data.insight.appointmentChange)}{" "}
              {t(
                "visits vs. previous 30 days",
                "посети во споредба со претходните 30 дена",
              )}
            </>
          ) : (
            t(
              "Based on completed appointments.",
              "Врз основа на завршени термини.",
            )
          )}
        </p>
        {data && !data.canCompareRevenue && (
          <p className="text-xs text-muted-foreground">
            {t(
              "Revenue ranking is unavailable across different currencies.",
              "Рангирањето по приход не е достапно за различни валути.",
            )}
          </p>
        )}
      </AnalyticsWidgetFrame>

      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {t("Service Performance", "Успешност на услуги")}
          </DialogTitle>
          <DialogDescription>
            {t(
              "Completed appointments in the last 30 days. Changes compare the previous 30 days.",
              "Завршени термини во последните 30 дена. Промените се споредени со претходните 30 дена.",
            )}
          </DialogDescription>
        </DialogHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("Service", "Услуга")}</TableHead>
              <TableHead className="text-right">
                {t("Visits", "Посети")}
              </TableHead>
              <TableHead className="text-right">
                {t("Change", "Промена")}
              </TableHead>
              <TableHead className="text-right">
                {t("Revenue", "Приход")}
              </TableHead>
              <TableHead className="text-right">
                {t("Revenue / hour", "Приход / час")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows?.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="max-w-64 whitespace-normal">
                  {serviceName(row.names)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.appointments.toLocaleString(locale)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {signedNumber(row.appointmentChange)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {money(row.revenueMinorUnits, row.currency)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {money(row.revenuePerHourMinorUnits, row.currency)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t(
            "Revenue uses the recorded appointment price. Revenue per hour uses booked duration and does not deduct costs.",
            "Приходот ја користи запишаната цена на терминот. Приходот по час го користи закажаното времетраење, без одбивање на трошоците.",
          )}
          {data?.hasCombinedServices &&
            " " +
              t(
                "Combined services are shown together to avoid counting the same revenue twice.",
                "Комбинираните услуги се прикажани заедно за приходот да не се брои двапати.",
              )}
        </p>
      </DialogContent>
    </Dialog>
  );
}
