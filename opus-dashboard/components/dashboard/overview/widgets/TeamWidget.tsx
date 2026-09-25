import { appearStep } from "@/lib/appear";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { OverviewData, UtilisationData } from "@/lib/dashboard-overview";
import { avatarTones, initials } from "@/lib/dashboard-overview";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { WidgetFrame, WidgetEmpty } from "../WidgetFrame";
import s from "../../clarity.module.css";
export function TeamWidget({
  staff,
  utilisation,
}: {
  staff: OverviewData["staff"];
  utilisation: UtilisationData | undefined;
}) {
  const { t } = useDashboardI18n();
  return (
    <WidgetFrame
      delay={0}
      title={t("Team availability", "Достапност на тимот")}
      subtitle={t(
        "Today’s bookings · weekly occupancy",
        "Денешни термини · неделна зафатеност",
      )}
      action={
        <Link
          href="/beauty/services?tab=staff"
          className={s.smallIcon}
          aria-label={t("Manage team", "Управувај со тимот")}
        >
          <ArrowUpRight size={16} />
        </Link>
      }
    >
      <div className={s.teamMembers}>
        {staff.map((person, index) => {
          const load =
            staff.filter((other) => other.name === person.name).length > 1
              ? null
              : utilisation?.find((row) => row.staffName === person.name)
                  ?.utilisationPct;
          return (
            <Link
              href={`/beauty/staff/${person.id}`}
              data-appear="item"
              style={appearStep(3 + index)}
              className={s.teamMember}
              key={person.id}
            >
              <span className={s.avatar} data-tone={avatarTones[index % 4]}>
                {initials(person.name)}
              </span>
              <div className={s.teamInfo}>
                <strong>{person.name}</strong>
                <span>
                  {load == null
                    ? t("Occupancy unavailable", "Нема податоци за зафатеност")
                    : `${Math.round(load)}% ${t("booked this week", "зафатено оваа недела")}`}
                </span>
                <div className={s.teamProgress}>
                  <i
                    data-appear="bar-x"
                    style={{ width: `${Math.min(100, load ?? 0)}%` }}
                  />
                </div>
              </div>
              <div className={s.teamCount}>
                <strong>{person.todayCount}</strong>
                <span>{t("bookings", "термини")}</span>
              </div>
            </Link>
          );
        })}
        {staff.length === 0 && (
          <WidgetEmpty>
            {t("Add your first team member.", "Додајте член во тимот.")}
          </WidgetEmpty>
        )}
      </div>
    </WidgetFrame>
  );
}
