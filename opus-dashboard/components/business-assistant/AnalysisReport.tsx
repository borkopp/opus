"use client";

import Link from "next/link";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { ArrowUpRight, ChartNoAxesCombined } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import type { AnalystReport } from "@/convex/analyst/contracts";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import {
  analystMetricLabels,
  analystWarning,
} from "@/lib/i18n/business-assistant";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function AnalysisReport({
  report,
  turnId,
  expanded = false,
}: {
  report: AnalystReport;
  turnId?: Id<"analyst_turns">;
  expanded?: boolean;
}) {
  const { t, language, locale } = useDashboardI18n();
  const title = analystMetricLabels[report.request.metric][language];
  const date = (ms: number) =>
    new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeZone: "UTC",
    }).format(ms);
  const value = (n: number | null, currency = report.currency) =>
    n === null
      ? t("Unavailable", "Не е достапно")
      : report.unit === "money" && currency
        ? new Intl.NumberFormat(locale, { style: "currency", currency }).format(
            n / 100,
          )
        : `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(n)}${report.unit === "percent" ? "%" : ""}`;
  const chartRows = report.rows.slice(0, 14);
  return (
    <Card id={report.key} className="min-w-0 scroll-mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ChartNoAxesCombined aria-hidden className="size-4" />
          {title}
        </CardTitle>
        <CardDescription>
          {date(report.startMs)} – {date(report.endMs - 1)}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <p className="text-2xl font-semibold tracking-tight tabular-nums">
            {value(report.total.value)}
          </p>
          {report.previous && (
            <p className="text-sm text-muted-foreground">
              {t("Previous", "Претходно")}:{" "}
              {value(report.previous.total.value, report.previous.currency)}
              <span className="block text-xs">
                {date(report.previous.startMs)} –{" "}
                {date(report.previous.endMs - 1)}
              </span>
            </p>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {report.total.appointments}{" "}
          {t("recorded appointments", "евидентирани термини")}
          {report.request.staffName ? ` · ${report.request.staffName}` : ""}
          {report.request.serviceName ? ` · ${report.request.serviceName}` : ""}
        </p>
        {expanded && chartRows.some((row) => row.value !== null) && (
          <ChartContainer
            config={{ value: { label: title, color: "var(--primary)" } }}
            className="h-52 w-full"
            aria-label={title}
          >
            <BarChart accessibilityLayer data={chartRows}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickFormatter={(label) => String(label).slice(0, 10)}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent formatter={(n) => value(Number(n))} />
                }
              />
              <Bar
                dataKey="value"
                fill="var(--color-value)"
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ChartContainer>
        )}
        {expanded && report.rows.length > 14 && (
          <p data-replay-public className="text-xs text-muted-foreground">
            {t(
              "The chart shows the first fourteen groups. All groups appear below.",
              "Графиконот ги прикажува првите четиринаесет групи. Сите групи се во табелата.",
            )}
          </p>
        )}
        {expanded && report.rows.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("Group", "Група")}</TableHead>
                <TableHead className="text-right">
                  {t("Value", "Вредност")}
                </TableHead>
                <TableHead className="hidden text-right md:table-cell">
                  {t("Appointments", "Термини")}
                </TableHead>
                <TableHead className="hidden text-right md:table-cell">
                  {t("Observed days", "Набљудувани денови")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.rows.map((row, index) => (
                <TableRow key={index}>
                  <TableCell className="whitespace-normal">
                    {row.label}
                    <span className="mt-1 block text-xs text-muted-foreground md:hidden">
                      {row.appointments} {t("appointments", "термини")} ·{" "}
                      {row.observedDays}{" "}
                      {row.observedDays === 1
                        ? t("day", "ден")
                        : t("days", "денови")}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {value(row.value)}
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums md:table-cell">
                    {row.appointments}
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums md:table-cell">
                    {row.observedDays}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {report.warnings.length > 0 && (
          <ul className="flex flex-col gap-2 text-xs leading-relaxed text-muted-foreground">
            {report.warnings.map((warning) => (
              <li key={warning}>{analystWarning(warning, language)}</li>
            ))}
          </ul>
        )}
      </CardContent>
      <CardFooter className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {t("Calculated", "Пресметано")}:{" "}
          {new Intl.DateTimeFormat(locale, {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: report.timezone,
          }).format(report.asOf)}
        </p>
        {!expanded && turnId && (
          <Button variant="outline" size="sm" asChild>
            <Link
              data-replay-public
              href={`/beauty/assistant/reports/${turnId}#${report.key}`}
            >
              {t("View report", "Види извештај")}
              <ArrowUpRight data-icon="inline-end" />
            </Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
