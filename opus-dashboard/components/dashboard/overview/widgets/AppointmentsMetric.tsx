import { Appear } from "@/components/ui/appear";
import { appearStep } from "@/lib/appear";
import { CalendarDays } from "lucide-react";
import type { OverviewData } from "@/lib/dashboard-overview";
import { avatarTones, initials } from "@/lib/dashboard-overview";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import s from "../../clarity.module.css";
export function AppointmentsMetric({ data }: { data: OverviewData }) {
  const { t } = useDashboardI18n();
  return (
    <Appear as="article" delay={35} className={s.metricCard}>
      <div data-appear="item" className={s.metricTop}>
        <span>{t("Today’s appointments", "Денешни термини")}</span>
        <CalendarDays size={18} />
      </div>
      <div data-appear="item" style={appearStep(2)} className={s.metricValue}>
        {data.todayCount}
        <span className={s.metricBadge}>
          {t("On the calendar", "На календарот")}
        </span>
      </div>
      <div data-appear="item" style={appearStep(4)} className={s.metricFoot}>
        <span className={s.avatarStack}>
          {data.staff.slice(0, 3).map((person, index) => (
            <span
              key={person.id}
              title={person.name}
              data-appear="scale"
              style={appearStep(4 + index)}
              className={s.avatar}
              data-tone={avatarTones[index % 4]}
            >
              {initials(person.name)}
            </span>
          ))}
        </span>
        <span>
          {t(
            `Across your ${data.staff.length} team members`,
            `Со ${data.staff.length} членови на тимот`,
          )}
        </span>
      </div>
    </Appear>
  );
}
