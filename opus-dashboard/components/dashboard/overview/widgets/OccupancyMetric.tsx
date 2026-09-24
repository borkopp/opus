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
        <span>{t("Calendar occupancy", "Зафатеност на календарот")}</span>
        <Clock3 size={18} />
      </div>
      <div data-appear="item" style={appearStep(2)} className={s.metricValue}>
        {percent ?? "—"}
        <small>%</small>
        <span className={s.metricBadge}>{t("This week", "Оваа недела")}</span>
      </div>
      <div className={s.occupancyBar}>
        <span
          data-appear="bar-x"
          style={{ ...appearStep(3), width: `${Math.min(100, percent ?? 0)}%` }}
        />
      </div>
      <div data-appear="item" style={appearStep(4)} className={s.metricFoot}>
        <span>
          <i className={s.legendDot} />
          {t("Booked time", "Закажано време")}
        </span>
        <span>
          {percent === null
            ? t("Working hours needed", "Потребно е работно време")
            : t(
                `${Math.max(0, 100 - percent)}% available`,
                `${Math.max(0, 100 - percent)}% слободно`,
              )}
        </span>
      </div>
    </Appear>
  );
}
