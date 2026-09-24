import { appearStep } from "@/lib/appear";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ClientAnalytics } from "@/lib/dashboard-overview";
import { avatarTones } from "@/lib/dashboard-overview";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { WidgetFrame, WidgetEmpty } from "../WidgetFrame";
import s from "../../clarity.module.css";
export function ServicesWidget({
  analytics,
}: {
  analytics: ClientAnalytics | undefined;
}) {
  const { t } = useDashboardI18n();
  const services = analytics?.servicePerformance.byAppointments.slice(0, 4);
  return (
    <WidgetFrame
      delay={45}
      title={t("Popular services", "Популарни услуги")}
      subtitle={t(
        "Completed appointments · last 30 days",
        "Завршени термини · последни 30 дена",
      )}
      action={
        <Link
          className={s.smallIcon}
          href="/beauty/services"
          aria-label={t("Manage services", "Управувај со услуги")}
        >
          <ArrowUpRight size={16} />
        </Link>
      }
    >
      <div className={s.serviceBars}>
        {services?.map((service, index) => (
          <div
            data-appear="item"
            style={appearStep(3 + index)}
            className={s.serviceBar}
            key={service.id}
          >
            <div>
              <span>
                {service.names
                  .map(
                    (name) => name ?? t("Removed service", "Отстранета услуга"),
                  )
                  .join(" + ")}
              </span>
              <strong>
                {service.appointments}
                <small> {t("bookings", "термини")}</small>
              </strong>
            </div>
            <div className={s.serviceTrack}>
              <i
                data-appear="bar-x"
                data-tone={avatarTones[index % 4]}
                style={{ width: `${service.appointmentBarPct}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      {!services?.length && (
        <WidgetEmpty>
          {analytics
            ? t(
                "Completed appointments will appear here.",
                "Завршените термини ќе се прикажат тука.",
              )
            : t("Loading services…", "Се вчитуваат услугите…")}
        </WidgetEmpty>
      )}
    </WidgetFrame>
  );
}
