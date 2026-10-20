"use client";

import Link from "next/link";
import { ArrowUpRight, Ellipsis } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import type { AnalystReport } from "@/convex/analyst/contracts";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import {
  analystMetricLabels,
  analystWarning,
} from "@/lib/i18n/business-assistant";
import { selectReportTemplate } from "@/lib/assistant-report-presentation";
import {
  Card,
  CardHeader,
  CardContent,
  CardAction,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Disclosure } from "@/components/ui/disclosure";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ReportVisual } from "./ReportVisual";
import { ReportWarnings } from "./ReportWarnings";

export type DisplayReport = AnalystReport & {
  /** Original snapshot row count when this is a bounded conversation preview. */
  rowCount?: number;
};

export function AnalysisReport({
  report,
  question,
  turnId,
  expanded = false,
  href,
}: {
  report: DisplayReport;
  question?: string;
  turnId?: Id<"analyst_turns">;
  expanded?: boolean;
  href?: string;
}) {
  const { t, language, locale } = useDashboardI18n();
  const selectedTemplate = selectReportTemplate(report, question);
  // An older backend only returned the first seven rows without completeness
  // metadata. Never rank that unknown subset or present it as a daily trend.
  const template =
    !expanded &&
    report.rowCount === undefined &&
    (selectedTemplate === "ranking" || selectedTemplate === "trend")
      ? "summary"
      : selectedTemplate;
  const title = analystMetricLabels[report.request.metric][language];
  const date = (ms: number) =>
    new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeZone: "UTC",
    }).format(ms);
  const value = (number: number | null, currency = report.currency) => {
    if (
      number === null ||
      !Number.isFinite(number) ||
      (report.unit === "money" && !currency)
    ) {
      return t("Unavailable", "Не е достапно", "E padisponueshme");
    }
    return report.unit === "money"
      ? new Intl.NumberFormat(locale, {
          style: "currency",
          currency: currency!,
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        }).format(number / 100)
      : `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(number)}${report.unit === "percent" ? "%" : ""}`;
  };
  const limited = (report.rowCount ?? report.rows.length) > report.rows.length;
  return (
    <Card
      id={report.key}
      data-report-template={template}
      className="min-w-0 scroll-mt-6 gap-0 overflow-hidden shadow-none"
    >
      <CardHeader className="gap-1.5 pb-5">
        <h3 className="text-sm font-medium leading-snug">{title}</h3>
        {!expanded && (turnId || href) && (
          <CardAction>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="-mt-1 -mr-2 text-muted-foreground"
                  aria-label={`${t("Report options", "Опции за извештајот", "Opsionet e raportit")}: ${title}`}
                >
                  <Ellipsis aria-hidden className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link
                    href={
                      href ??
                      `/beauty/assistant/reports/${turnId}#${report.key}`
                    }
                  >
                    <ArrowUpRight aria-hidden />
                    {t("Full report", "Цел извештај", "Raporti i plotë")}
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardAction>
        )}
        <p className="text-xs text-muted-foreground">
          {date(report.startMs)} – {date(report.endMs - 1)}
        </p>
        {(report.request.staffName || report.request.serviceName) && (
          <p className="text-xs text-muted-foreground">
            {[report.request.staffName, report.request.serviceName]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-5 pb-5">
        <ReportVisual
          report={report}
          template={template}
          question={question}
          expanded={expanded}
          value={value}
          date={date}
        />
        <ReportWarnings warnings={report.warnings} />
        {expanded && (
          <Disclosure
            title={t(
              "Data & calculation",
              "Податоци и пресметка",
              "Të dhënat dhe llogaritja",
            )}
            className="rounded-none border-0 border-t [&>summary]:px-0 [&>div]:px-0 [&>div]:pb-0"
          >
            <dl className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <dt className="text-muted-foreground">
                  {t(
                    "Recorded appointments",
                    "Евидентирани термини",
                    "Termine të regjistruara",
                  )}
                </dt>
                <dd className="mt-1 font-medium tabular-nums">
                  {report.total.appointments}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">
                  {t("Calculated", "Пресметано", "E llogaritur")}
                </dt>
                <dd className="mt-1 font-medium">
                  {new Intl.DateTimeFormat(locale, {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: report.timezone,
                  }).format(report.asOf)}
                </dd>
              </div>
            </dl>
            {report.previous && (
              <p className="text-xs text-muted-foreground">
                {t(
                  "Previous period",
                  "Претходен период",
                  "Periudha e mëparshme",
                )}
                : {value(report.previous.total.value, report.previous.currency)}
                {" · "}
                {date(report.previous.startMs)} –{" "}
                {date(report.previous.endMs - 1)}
              </p>
            )}
            {limited && (
              <p className="text-xs text-muted-foreground">
                {t(
                  "This is a selection of groups. Open the full report for every row.",
                  "Ова е избор од групите. Отворете го целиот извештај за сите редови.",
                  "Kjo është një përzgjedhje grupesh. Hapni raportin e plotë për çdo rresht.",
                )}
              </p>
            )}
            {report.rows.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("Group", "Група", "Grupi")}</TableHead>
                    <TableHead className="text-right">
                      {t("Value", "Вредност", "Vlera")}
                    </TableHead>
                    <TableHead className="hidden text-right md:table-cell">
                      {t("Appointments", "Термини", "Terminet")}
                    </TableHead>
                    <TableHead className="hidden text-right md:table-cell">
                      {t(
                        "Observed days",
                        "Набљудувани денови",
                        "Ditët e vëzhguara",
                      )}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.rows.map((item, index) => (
                    <TableRow key={`${item.label}-${index}`}>
                      <TableCell className="whitespace-normal">
                        {item.label}
                        <span className="mt-1 block text-xs text-muted-foreground md:hidden">
                          {item.appointments}{" "}
                          {t("appointments", "термини", "termine")} ·{" "}
                          {item.observedDays}{" "}
                          {t(
                            "observed days",
                            "набљудувани денови",
                            "ditë të vëzhguara",
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {value(item.value)}
                      </TableCell>
                      <TableCell className="hidden text-right tabular-nums md:table-cell">
                        {item.appointments}
                      </TableCell>
                      <TableCell className="hidden text-right tabular-nums md:table-cell">
                        {item.observedDays}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {report.warnings.length > 0 && (
              <ul className="flex list-disc flex-col gap-2 pl-4 text-xs leading-relaxed text-muted-foreground">
                {report.warnings.map((warning) => (
                  <li key={warning}>{analystWarning(warning, language)}</li>
                ))}
              </ul>
            )}
          </Disclosure>
        )}
      </CardContent>
    </Card>
  );
}
