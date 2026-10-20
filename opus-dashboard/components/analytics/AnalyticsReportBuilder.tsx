"use client";

import { useId, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Download,
  FileText,
  LoaderCircle,
  LockKeyhole,
} from "lucide-react";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  createAnalyticsReport,
  type AnalyticsReportFormat,
  type AnalyticsReportSection,
} from "@/lib/analytics-report";
import type { StudioAnalytics } from "@/lib/studio-analytics";

export interface AnalyticsReportBuilderProps {
  data: StudioAnalytics | undefined;
  isPro: boolean;
  periodLabel: string;
  /** Fetch again so the server verifies the current studio, membership and plan. */
  onGetReportData: () => Promise<StudioAnalytics>;
  upgradeHref?: string;
}

export function AnalyticsReportBuilder({
  data,
  isPro,
  periodLabel,
  onGetReportData,
  upgradeHref = "/settings?tab=billing",
}: AnalyticsReportBuilderProps) {
  const { t, language } = useDashboardI18n();
  const id = useId();
  const [sections, setSections] = useState<AnalyticsReportSection[]>([
    "summary",
    "trend",
    "services",
  ]);
  const [includeComparison, setIncludeComparison] = useState(true);
  const [format, setFormat] = useState<AnalyticsReportFormat>("html");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const disabled = !isPro || !data || generating;
  const choices: { key: AnalyticsReportSection; label: string }[] = [
    { key: "summary", label: t("Overview", "Преглед", "Përmbledhje") },
    {
      key: "trend",
      label: t("Activity", "Активност", "Aktiviteti"),
    },
    {
      key: "services",
      label: t("Services", "Услуги", "Shërbimet"),
    },
    {
      key: "clients",
      label: t("Clients", "Клиенти", "Klientët"),
    },
  ];

  async function generate() {
    if (disabled || !sections.length) return;
    setGenerating(true);
    setError(null);
    try {
      const currentData = await onGetReportData();
      const report = createAnalyticsReport(
        currentData,
        { sections, includeComparison, language },
        format,
      );
      const url = URL.createObjectURL(
        new Blob([report.content], { type: report.mimeType }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = report.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      // Allow browsers to start reading the download before releasing the Blob.
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      setError(
        t(
          "The report could not be generated. Refresh the page or choose fewer months and try again.",
          "Извештајот не може да се генерира. Освежете ја страницата или изберете помалку месеци и обидете се повторно.",
          "Raporti nuk mund të gjenerohej. Rifreskoni faqen ose zgjidhni më pak muaj dhe provoni përsëri.",
        ),
      );
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Card className="h-fit gap-3 rounded-3xl border-0 shadow-none">
      <CardHeader className="px-5 pt-5 pb-0">
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-foreground">
            <FileText className="size-4" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <CardTitle>
              {t("Build a report", "Создај извештај", "Krijoni një raport")}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {t(
                "CSV or printable report",
                "CSV или извештај за печатење",
                "CSV ose raport për printim",
              )}
            </p>
          </div>
          {!isPro && <Badge variant="pro">Pro</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-5">
        <div className="rounded-xl bg-secondary/60 px-3 py-2">
          <span className="sr-only">
            {t("Selected period", "Избран период", "Periudha e zgjedhur")}
            {": "}
          </span>
          <p className="text-xs font-medium">{periodLabel}</p>
        </div>

        <fieldset disabled={disabled}>
          <legend className="mb-1 text-xs font-medium text-muted-foreground">
            {t(
              "Include in report",
              "Вклучи во извештајот",
              "Përfshini në raport",
            )}
          </legend>
          <div className="grid grid-cols-2 gap-x-4">
            {choices.map(({ key, label }) => (
              <label
                key={key}
                htmlFor={`${id}-${key}`}
                className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg py-2 text-sm has-disabled:cursor-default has-disabled:opacity-60"
              >
                <Checkbox
                  id={`${id}-${key}`}
                  checked={sections.includes(key)}
                  disabled={disabled}
                  onCheckedChange={(checked) => {
                    setSections((current) =>
                      checked
                        ? [...current, key]
                        : current.filter((section) => section !== key),
                    );
                  }}
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex min-h-10 items-center justify-between gap-4 border-t border-border/60 pt-3">
          <label
            htmlFor={`${id}-comparison`}
            className="text-xs leading-relaxed"
          >
            {t(
              "Compare overview with previous period",
              "Спореди го прегледот со претходниот период",
              "Krahasoni përmbledhjen me periudhën e mëparshme",
            )}
          </label>
          <Switch
            id={`${id}-comparison`}
            checked={includeComparison && sections.includes("summary")}
            disabled={disabled || !sections.includes("summary")}
            onCheckedChange={(checked) => {
              setIncludeComparison(checked);
            }}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor={`${id}-format`} className="sr-only">
            {t("File format", "Формат на датотеката", "Formati i skedarit")}
          </label>
          <Select
            value={format}
            disabled={disabled}
            onValueChange={(value: AnalyticsReportFormat) => {
              setFormat(value);
            }}
          >
            <SelectTrigger
              id={`${id}-format`}
              className="h-10 w-full rounded-xl"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="html">
                {t(
                  "Printable report (.html)",
                  "Извештај за печатење (.html)",
                  "Raport për printim (.html)",
                )}
              </SelectItem>
              <SelectItem value="csv">
                {t(
                  "Spreadsheet (.csv)",
                  "Табеларна датотека (.csv)",
                  "Tabelë (.csv)",
                )}
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {format === "html"
              ? t(
                  "Open the file in your browser, then Print → Save as PDF.",
                  "Отворете ја датотеката во прелистувач, потоа Печати → Зачувај како PDF.",
                  "Hapni skedarin në shfletues, pastaj Printo → Ruaj si PDF.",
                )
              : t(
                  "Open in Excel, Numbers or Google Sheets.",
                  "Отворете во Excel, Numbers или Google Sheets.",
                  "Hapeni në Excel, Numbers ose Google Sheets.",
                )}
          </p>
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {!sections.length && (
          <p className="text-xs text-muted-foreground">
            {t(
              "Choose at least one section.",
              "Изберете барем еден дел.",
              "Zgjidhni të paktën një seksion.",
            )}
          </p>
        )}
        <Button
          className="h-10 w-full rounded-xl"
          disabled={disabled || !sections.length}
          onClick={generate}
        >
          {generating ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          ) : !isPro ? (
            <LockKeyhole className="size-4" aria-hidden="true" />
          ) : (
            <Download className="size-4" aria-hidden="true" />
          )}
          {generating
            ? t(
                "Preparing report…",
                "Се подготвува извештајот…",
                "Duke përgatitur raportin…",
              )
            : t("Generate report", "Генерирај извештај", "Gjeneroni raportin")}
        </Button>
        {!isPro && (
          <Button
            asChild
            variant="link"
            className="h-auto w-full whitespace-normal p-0 text-sm"
          >
            <Link href={upgradeHref}>
              {t(
                "Unlock reports with Pro",
                "Отклучете извештаи со Pro",
                "Zhbllokoni raportet me Pro",
              )}
              <ArrowUpRight className="size-4 shrink-0" aria-hidden="true" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
