import { Appear } from "@/components/ui/appear";
import { appearStep } from "@/lib/appear";
import { Clock3 } from "lucide-react";
import type { UtilisationData } from "@/lib/dashboard-overview";
import { overviewOccupancy } from "@/lib/dashboard-overview";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import s from "../../clarity.module.css";
export function OccupancyMetric({
  utilisation,
}: {
  utilisation: UtilisationData | undefined;
}) {
  const { t } = useDashboardI18n();
  const percent = utilisation ? overviewOccupancy(utilisation) : null;
  return (
    <Appear as="article" delay={105} className={s.metricCard}>
      <div data-appear="item" className={s.metricTop}>
        <span data-replay-public>
          {t("Calendar occupancy", "Зафатеност на календарот", "Zënia e kalendarit")}
        </span>
        <Clock3 size={18} />
      </div>
      <div data-appear="item" style={appearStep(2)} className={s.metricValue}>
        {percent ?? "—"}
        <small data-replay-public>%</small>
        <span data-replay-public className={s.metricBadge}>
          {t("This week", "Оваа недела", "Këtë javë")}
        </span>
      </div>
      <div className={s.occupancyBar}>
        <span
          data-appear="bar-x"
          style={{ ...appearStep(3), width: `${Math.min(100, percent ?? 0)}%` }}
        />
      </div>
      <div data-appear="item" style={appearStep(4)} className={s.metricFoot}>
        <span data-replay-public>
          <i className={s.legendDot} />
          {t("Booked time", "Закажано време", "Koha e rezervuar")}
        </span>
        <span>
          {percent === null
            ? t("Working hours needed", "Потребно е работно време", "Kërkohen orët e punës")
            : t(
                `${Math.max(0, 100 - percent)}% available`,
                `${Math.max(0, 100 - percent)}% слободно`,
                `${Math.max(0, 100 - percent)}% e lirë`,
              )}
        </span>
      </div>
    </Appear>
  );
}
