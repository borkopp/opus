"use client";

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CircleHelp,
  Minus,
} from "lucide-react";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  getRankedReportRows,
  getRankingDirection,
  getReportChange,
  type ReportTemplate,
} from "@/lib/assistant-report-presentation";
import type { DisplayReport } from "./AnalysisReport";

type Props = {
  report: DisplayReport;
  template: ReportTemplate;
  question?: string;
  expanded: boolean;
  value: (number: number | null, currency?: string | null) => string;
  date: (ms: number) => string;
};

export function ReportVisual(props: Props) {
  const { report, template, question, expanded, value, date } = props;
  const { t, locale } = useDashboardI18n();
  if (template === "empty" || template === "unavailable") {
    const Icon = template === "empty" ? CalendarDays : CircleHelp;
    return (
      <div className="flex items-start gap-4 rounded-xl bg-muted/50 p-5">
        <Icon
          aria-hidden
          className="mt-0.5 size-5 shrink-0 text-muted-foreground"
        />
        <div className="flex flex-col gap-2">
          <p className="text-base font-medium">
            {template === "empty"
              ? t(
                  "No appointments in this period",
                  "Нема термини во овој период",
                  "Nuk ka termine në këtë periudhë",
                )
              : t(
                  "This value is unavailable",
                  "Оваа вредност не е достапна",
                  "Kjo vlerë nuk është e disponueshme",
                )}
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {template === "empty"
              ? t(
                  "Try a different period to see a useful pattern.",
                  "Изберете друг период за да видите корисен образец.",
                  "Provoni një periudhë tjetër për të parë një model të dobishëm.",
                )
              : t(
                  "The recorded data does not support a reliable total.",
                  "Евидентираните податоци не поддржуваат сигурна вкупна вредност.",
                  "Të dhënat e regjistruara nuk mbështesin një total të besueshëm.",
                )}
          </p>
        </div>
      </div>
    );
  }
  if (template === "comparison" && report.previous) {
    const current = report.total.value ?? 0;
    const previous = report.previous.total.value ?? 0;
    const maximum = Math.max(Math.abs(current), Math.abs(previous), 1);
    return (
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))] gap-3 sm:gap-6">
          {[
            {
              label: t("This period", "Овој период", "Kjo periudhë"),
              number: current,
              currency: report.currency,
              start: report.startMs,
              end: report.endMs,
              active: true,
            },
            {
              label: t(
                "Previous period",
                "Претходен период",
                "Periudha e mëparshme",
              ),
              number: previous,
              currency: report.previous.currency,
              start: report.previous.startMs,
              end: report.previous.endMs,
              active: false,
            },
          ].map((item) => (
            <div
              key={item.label}
              className={`flex min-w-0 flex-col gap-3 rounded-xl p-3 sm:p-4 ${item.active ? "bg-accent/70" : "bg-muted/50"}`}
            >
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="break-words text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
                {value(item.number, item.currency)}
              </p>
              <div aria-hidden className="h-1 rounded-full bg-primary/10">
                <div
                  className={`h-full rounded-full ${item.active ? "bg-primary" : "bg-primary/35"}`}
                  style={{
                    width: `${(Math.abs(item.number) / maximum) * 100}%`,
                  }}
                />
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                {date(item.start)} – {date(item.end - 1)}
              </p>
            </div>
          ))}
        </div>
        <ChangeNote report={report} />
      </div>
    );
  }
  if (template === "ranking") {
    const ranked = getRankedReportRows(report, question);
    const shown = ranked.slice(0, expanded ? 5 : 3);
    const maximum = Math.max(
      ...ranked.map((row) => Math.abs(row.value ?? 0)),
      1,
    );
    const ascending = getRankingDirection(report, question) === "asc";
    return (
      <div className="flex flex-col gap-4">
        <p className="text-xs text-muted-foreground">
          {ascending
            ? t("Lowest first", "Најниските прво", "Më të ulëtat së pari")
            : t("Highest first", "Највисоките прво", "Më të lartat së pari")}
        </p>
        <ol className="flex flex-col gap-4">
          {shown.map((item, index) => (
            <li
              key={`${item.label}-${index}`}
              className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-3"
            >
              <span className="pt-0.5 text-xs tabular-nums text-muted-foreground">
                {index + 1}
              </span>
              <div className="flex min-w-0 flex-col gap-2">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <span
                    className={`min-w-0 break-words text-sm ${index === 0 ? "font-medium" : ""}`}
                  >
                    {item.label}
                  </span>
                  <span className="text-sm font-medium tabular-nums">
                    {value(item.value)}
                  </span>
                </div>
                <div aria-hidden className="h-1.5 rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${index === 0 ? "bg-primary" : "bg-primary/30"}`}
                    style={{
                      width: `${(Math.abs(item.value ?? 0) / maximum) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </li>
          ))}
        </ol>
        <p className="text-xs text-muted-foreground">
          {t("Showing", "Прикажани", "Duke shfaqur")} {shown.length}{" "}
          {t(
            "groups with recorded data",
            "групи со евидентирани податоци",
            "grupe me të dhëna të regjistruara",
          )}
          .
        </p>
      </div>
    );
  }
  if (template === "share") {
    const number = report.total.value ?? 0;
    const metric = report.request.metric;
    const explanation =
      metric === "utilisation"
        ? t(
            "Booked time as a share of recorded working hours.",
            "Закажано време како удел од евидентираните работни часови.",
            "Koha e rezervuar si pjesë e orëve të regjistruara të punës.",
          )
        : metric === "cancellation_rate"
          ? t(
              "Cancelled appointments out of all scheduled appointments.",
              "Откажани термини од сите закажани термини.",
              "Termine të anuluara nga të gjitha terminet e planifikuara.",
            )
          : metric === "no_show_rate"
            ? t(
                "Missed visits out of completed and missed visits.",
                "Пропуштени посети од завршените и пропуштените посети.",
                "Vizita të humbura nga vizitat e përfunduara dhe të humbura.",
              )
            : t(
                "Returning clients among clients with a completed visit.",
                "Повратни клиенти меѓу клиентите со завршена посета.",
                "Klientë të kthyer mes klientëve me një vizitë të përfunduar.",
              );
    return (
      <div className="flex flex-wrap items-center gap-5 sm:gap-7">
        <svg
          aria-hidden
          viewBox="0 0 112 112"
          className="size-28 shrink-0 -rotate-90"
        >
          <circle
            cx="56"
            cy="56"
            r="46"
            fill="none"
            stroke="var(--muted)"
            strokeWidth="10"
          />
          <circle
            cx="56"
            cy="56"
            r="46"
            pathLength="100"
            fill="none"
            stroke="var(--primary)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${Math.min(100, Math.max(0, number))} 100`}
          />
        </svg>
        <div className="flex min-w-0 flex-1 basis-40 flex-col gap-2">
          <p className="text-4xl font-semibold tracking-tight tabular-nums">
            {value(number)}
          </p>
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
            {explanation}
          </p>
          {number > 100 && (
            <p className="text-xs text-muted-foreground">
              {t(
                "Above recorded capacity",
                "Над евидентираниот капацитет",
                "Mbi kapacitetin e regjistruar",
              )}
            </p>
          )}
          <ChangeNote report={report} />
        </div>
      </div>
    );
  }
  if (template === "trend") {
    const limited =
      (report.rowCount ?? report.rows.length) > report.rows.length;
    const shortLabel = (label: string) =>
      /^\d{4}-\d{2}-\d{2}$/.test(label)
        ? new Intl.DateTimeFormat(locale, {
            day: "numeric",
            month: "short",
            timeZone: "UTC",
          }).format(new Date(`${label}T00:00:00Z`))
        : label;
    return (
      <div className="flex flex-col gap-4">
        <div>
          <p className="mb-1 text-xs text-muted-foreground">
            {report.unit === "percent"
              ? t("Overall", "Вкупно", "Në përgjithësi")
              : t("Period total", "Вкупно за периодот", "Totali i periudhës")}
          </p>
          <p className="text-3xl font-semibold tracking-tight tabular-nums">
            {value(report.total.value)}
          </p>
        </div>
        {report.rows.some((row) => row.value !== null) ? (
          <ChartContainer
            config={{
              value: {
                label: t("Value", "Вредност", "Vlera"),
                color: "var(--primary)",
              },
            }}
            className={`${expanded ? "h-48" : "h-36"} w-full`}
            aria-label={t("Daily trend", "Дневен тренд", "Tendenca ditore")}
          >
            <AreaChart
              accessibilityLayer
              data={report.rows}
              margin={{ top: 8, left: 8, right: 8 }}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 5" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                minTickGap={45}
                tickFormatter={shortLabel}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(label) => shortLabel(String(label))}
                    formatter={(number) => value(Number(number))}
                  />
                }
              />
              <Area
                type="linear"
                dataKey="value"
                stroke="var(--color-value)"
                fill="var(--color-value)"
                fillOpacity={0.08}
                strokeWidth={2}
                connectNulls={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ChartContainer>
        ) : (
          <p className="rounded-xl bg-muted/50 p-5 text-sm text-muted-foreground">
            {t(
              "No daily values are available for these displayed dates.",
              "Нема достапни дневни вредности за прикажаните датуми.",
              "Nuk ka vlera ditore për datat e shfaqura.",
            )}
          </p>
        )}
        {limited && (
          <p className="text-xs text-muted-foreground">
            {t(
              "Chart shows the most recent recorded date groups. The total covers the full period.",
              "Графиконот ги прикажува последните групи по датум. Вкупната вредност е за целиот период.",
              "Grafiku tregon grupet më të fundit sipas datës. Totali mbulon gjithë periudhën.",
            )}
          </p>
        )}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3 py-2">
      <p className="break-words text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl">
        {value(report.total.value)}
      </p>
      <ChangeNote report={report} />
    </div>
  );
}

function ChangeNote({ report }: { report: DisplayReport }) {
  const { t, locale } = useDashboardI18n();
  const change = getReportChange(report);
  if (!change) return null;
  const Icon =
    change.direction === "up"
      ? ArrowUpRight
      : change.direction === "down"
        ? ArrowDownRight
        : Minus;
  const amount = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
  }).format(Math.abs(change.value));
  return (
    <p
      className={`flex flex-wrap items-center gap-1.5 text-xs ${change.sentiment === "positive" ? "text-emerald-700" : change.sentiment === "negative" ? "text-amber-700" : "text-muted-foreground"}`}
    >
      <Icon aria-hidden className="size-3.5" />
      <span>
        {change.direction === "flat"
          ? t("No change", "Без промена", "Pa ndryshim")
          : `${change.value > 0 ? "+" : "−"}${amount}${change.unit === "points" ? ` ${t("pp", "п.п.", "pp")}` : "%"}`}
      </span>
      <span>
        {t(
          "vs previous period",
          "споредено со претходниот период",
          "kundrejt periudhës së mëparshme",
        )}
      </span>
    </p>
  );
}
