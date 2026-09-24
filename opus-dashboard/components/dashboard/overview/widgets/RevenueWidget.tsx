import { appearStep } from "@/lib/appear";
import { StripedBarChart } from "../../charts/StripedBarChart";
import { ChevronDown } from "lucide-react";
import type { OverviewData } from "@/lib/dashboard-overview";
import { overviewNumber } from "@/lib/dashboard-overview";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { WidgetFrame } from "../WidgetFrame";
import s from "../../clarity.module.css";
export function RevenueWidget({
  revenue,
  onDaysChange,
}: {
  revenue: OverviewData["revenue"];
  onDaysChange: (days: 7 | 30) => void;
}) {
  const { t, locale } = useDashboardI18n();
  const maximum = Math.max(
    100,
    ...revenue.buckets.map((b) => b.valueMinor ?? 0),
  );
  const axis = (value: number) =>
    new Intl.NumberFormat(locale, {
      notation: "compact",
      maximumFractionDigits: 1,
    })
      .format(value / 100)
      .toUpperCase();
  const label = (at: number) =>
    new Intl.DateTimeFormat(locale, {
      timeZone: "UTC",
      ...(revenue.days === 7
        ? { weekday: "short" as const }
        : { month: "short" as const, day: "numeric" as const }),
    }).format(at);
  const range = (start: number, end: number) =>
    revenue.days === 7
      ? label(start)
      : new Intl.DateTimeFormat(locale, {
          timeZone: "UTC",
          month: "short",
          day: "numeric",
        }).formatRange(new Date(start), new Date(end - 1));
  return (
    <WidgetFrame
      delay={100}
      title={t("Appointment value", "Вредност на термините")}
      subtitle={t(
        "Value of completed appointments",
        "Вредност на завршени термини",
      )}
      action={
        <label className={s.periodSelect}>
          <span className={s.srOnly}>
            {t("Analytics period", "Период на анализа")}
          </span>
          <select
            value={revenue.days}
            onChange={(e) => onDaysChange(Number(e.target.value) as 7 | 30)}
          >
            <option value={7}>{t("Last 7 days", "Последни 7 дена")}</option>
            <option value={30}>{t("Last 30 days", "Последни 30 дена")}</option>
          </select>
          <ChevronDown size={13} />
        </label>
      }
    >
      <div data-appear="item" style={appearStep(3)} className={s.chartSummary}>
        <strong>
          {overviewNumber(revenue.totalMinor, locale)}
          <small>
            {revenue.currency ?? t("Mixed currencies", "Повеќе валути")}
          </small>
        </strong>
        <span>
          {revenue.changePct === null
            ? "—"
            : `${revenue.changePct > 0 ? "+" : ""}${revenue.changePct.toFixed(1)}%`}
          <small>
            {t("vs. previous period", "споредено со претходен период")}
          </small>
        </span>
      </div>
      <StripedBarChart
        label={t(
          "Appointment value by period",
          "Вредност на термините по период",
        )}
        maximum={maximum}
        axisLabels={[axis(maximum), axis(maximum / 2), "0"]}
        points={revenue.buckets.map((bucket) => ({
          label: range(bucket.startAt, bucket.endAt),
          value: bucket.valueMinor,
          detail: `${range(bucket.startAt, bucket.endAt)}: ${overviewNumber(bucket.valueMinor, locale)} ${revenue.currency ?? t("Mixed currencies", "Повеќе валути")}`,
        }))}
      />
    </WidgetFrame>
  );
}
