"use client";

import Link from "next/link";
import { ArrowUpRight, FileDown, LockKeyhole } from "lucide-react";
import type { ReactNode } from "react";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Appear } from "@/components/ui/appear";
import { AnalyticsFilters } from "./AnalyticsFilters";
import { AnalyticsMetrics } from "./AnalyticsMetrics";
import {
  AnalyticsTrend,
  AnalyticsClientMix,
  AnalyticsServices,
} from "./AnalyticsCharts";
import { AnalyticsClientPreview } from "./AnalyticsClientPreview";
import { AnalyticsReportBuilder } from "./AnalyticsReportBuilder";
import type { StudioAnalytics } from "@/lib/studio-analytics";
import {
  type AnalyticsFilters as Filters,
  analyticsPeriodLabel,
  studioMonth,
} from "@/lib/analytics-filters";
import { UPGRADE_PATH } from "@/lib/upgrade";

export function AnalyticsDashboard({
  data,
  filters,
  onFiltersChange,
  demo,
  clients,
  onGetReportData,
}: {
  data?: StudioAnalytics;
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  demo: boolean;
  clients?: ReactNode;
  onGetReportData: () => Promise<StudioAnalytics>;
}) {
  const { t, locale } = useDashboardI18n();
  const periodLabel = analyticsPeriodLabel(filters, locale);
  return (
    <div className="flex min-w-0 flex-col gap-6 pb-6" data-replay-private>
      <Appear className="flex flex-wrap items-center justify-between gap-4">
        <div data-appear className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3">
            <h1>{t("Analytics", "Аналитика", "Analitika")}</h1>
            <Badge variant="pro">Pro</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {t(
              "A clearer picture of your studio. All in one place.",
              "Појасна слика за вашето студио. Сè на едно место.",
              "Një pamje më e qartë e studios suaj. Gjithçka në një vend.",
            )}
          </p>
        </div>
        <Button asChild variant="outline" className="bg-card">
          <a href="#analytics-report">
            <FileDown className="size-4" />
            {t("Create report", "Креирај извештај", "Krijo raport")}
          </a>
        </Button>
      </Appear>
      {demo && (
        <Appear className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-primary/15 bg-accent px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-card/80 text-primary">
              <LockKeyhole className="size-4" />
            </span>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">
                {t(
                  "Meet your studio’s next chapter.",
                  "Следното поглавје за вашето студио.",
                  "Kapitulli i ardhshëm i studios suaj.",
                )}
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {t(
                  "You’re viewing sample data. Unlock your real analytics, every client, and reports with Pro.",
                  "Гледате демо податоци. Отклучете вистинска аналитика, сите клиенти и извештаи со Pro.",
                  "Po shikoni të dhëna shembull. Zhbllokoni analitikën reale, çdo klient dhe raportet me Pro.",
                )}
              </p>
            </div>
          </div>
          <Button asChild size="sm">
            <Link href={UPGRADE_PATH}>
              {t("Explore Pro", "Истражи Pro", "Eksploro Pro")}
              <ArrowUpRight className="size-4" />
            </Link>
          </Button>
        </Appear>
      )}
      <Appear delay={40}>
        <AnalyticsFilters
          filters={filters}
          onChange={(next) =>
            onFiltersChange({
              ...next,
              currency:
                next.startMonth !== filters.startMonth ||
                next.endMonth !== filters.endMonth
                  ? ""
                  : next.currency,
            })
          }
          staff={data?.staff ?? []}
          currencies={data?.currencies ?? []}
          demo={demo}
        />
      </Appear>
      {data ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs">
            <p className="font-medium">{periodLabel}</p>
            <p className="text-muted-foreground">
              {filters.endMonth >= studioMonth()
                ? t(
                    "Current month is in progress · compared with full previous month(s)",
                    "Тековниот месец е во тек · споредба со цели претходни месеци",
                    "Muaji aktual është në vazhdim · krahasuar me muajt e plotë të kaluar",
                  )
                : t(
                    "Compared with the preceding period of the same length",
                    "Споредба со претходниот период со иста должина",
                    "Krahasuar me periudhën e mëparshme me të njëjtën gjatësi",
                  )}
            </p>
          </div>
          <AnalyticsMetrics data={data} />
          <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
            <AnalyticsTrend data={data} />
            <AnalyticsClientMix data={data} />
          </div>
        </>
      ) : periodLabel ? (
        <div
          aria-live="polite"
          aria-busy="true"
          aria-label={t(
            "Loading analytics",
            "Се вчитува аналитиката",
            "Duke ngarkuar analitikën",
          )}
          className="flex flex-col gap-4"
        >
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            {[0, 1, 2, 3].map((key) => (
              <Skeleton key={key} className="h-40 rounded-3xl" />
            ))}
          </div>
          <Skeleton className="h-96 rounded-3xl" />
        </div>
      ) : null}
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        {data ? <AnalyticsServices data={data} /> : <div />}
        <Appear
          as="section"
          id="analytics-report"
          aria-label={t(
            "Report builder",
            "Креирање извештаи",
            "Krijuesi i raporteve",
          )}
          className="min-w-0 scroll-mt-6"
        >
          <AnalyticsReportBuilder
            data={data}
            isPro={!demo}
            periodLabel={periodLabel}
            onGetReportData={onGetReportData}
            upgradeHref={UPGRADE_PATH}
          />
        </Appear>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {t(
          "Appointment value is the price of completed visits, not collected payments or profit. Visit and client counts include all currencies.",
          "Вредноста е цената на завршените посети, а не наплатени средства или профит. Бројот на посети и клиенти ги вклучува сите валути.",
          "Vlera është çmimi i vizitave të përfunduara, jo pagesa të mbledhura apo fitim. Vizitat dhe klientët përfshijnë të gjitha monedhat.",
        )}
      </p>
      <Appear className="min-w-0">
        {demo ? <AnalyticsClientPreview /> : clients}
      </Appear>
    </div>
  );
}
