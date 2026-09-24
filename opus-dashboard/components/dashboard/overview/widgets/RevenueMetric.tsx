import { Appear } from "@/components/ui/appear";
import { appearStep } from "@/lib/appear";
import { ArrowUpRight } from "lucide-react";
import type { OverviewData } from "@/lib/dashboard-overview";
import { overviewNumber } from "@/lib/dashboard-overview";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import s from "../../clarity.module.css";
export function RevenueMetric({
  revenue,
}: {
  revenue: OverviewData["revenue"];
}) {
  const { t, locale } = useDashboardI18n();
  const max = Math.max(1, ...revenue.buckets.map((b) => b.valueMinor ?? 0));
  return (
    <Appear
      as="article"
      delay={70}
      className={`${s.metricCard} ${s.accentMetric}`}
    >
      <div data-appear="item" className={s.metricTop}>
        <span>
          {t("Completed appointment value", "Вредност на завршени термини")}
        </span>
        <ArrowUpRight size={19} />
      </div>
      <div data-appear="item" style={appearStep(2)} className={s.metricValue}>
        {overviewNumber(revenue.totalMinor, locale)}
        <small>
          {revenue.currency ?? t("Mixed currencies", "Повеќе валути")}
        </small>
      </div>
      <div className={s.miniBars} aria-hidden="true">
        {revenue.buckets.map((b, index) => (
          <i
            key={b.startAt}
            data-appear="bar-y"
            style={{
              ...appearStep(3 + index),
              height: `${Math.max(3, ((b.valueMinor ?? 0) / max) * 51)}px`,
            }}
          />
        ))}
      </div>
      <div data-appear="item" style={appearStep(4)} className={s.metricFoot}>
        <span>
          {revenue.changePct === null
            ? t("No comparison yet", "Сè уште нема споредба")
            : `${revenue.changePct > 0 ? "+" : ""}${revenue.changePct.toFixed(1)}%`}
        </span>
        <span>
          {t(
            `vs. previous ${revenue.days} days`,
            `споредено со претходни ${revenue.days} дена`,
          )}
        </span>
      </div>
    </Appear>
  );
}
