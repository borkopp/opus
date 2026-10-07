import { appearStep } from "@/lib/appear";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ClientAnalytics } from "@/lib/dashboard-overview";
import { avatarTones } from "@/lib/dashboard-overview";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { WidgetFrame, WidgetEmpty } from "../WidgetFrame";
import s from "../../clarity.module.css";

const serviceTileTones = ["blue", "lilac", "peach", "sage"] as const;
export function ServicesWidget({
  analytics,
  tiles = false,
}: {
  analytics: ClientAnalytics | undefined;
  tiles?: boolean;
}) {
  const { t } = useDashboardI18n();
  const services = analytics?.servicePerformance.byAppointments.slice(0, 4);
  return (
    <WidgetFrame
      replayPublicSubtitle
      replayPublicTitle
      delay={45}
      title={t("Popular services", "Популарни услуги", "Shërbime të njohura")}
      subtitle={t(
        "Completed appointments · last 30 days",
        "Завршени термини · последни 30 дена",
        "Termine të përfunduara · 30 ditët e fundit",
      )}
      action={
        <Link
          className={s.smallIcon}
          href="/beauty/services"
          aria-label={t("Manage services", "Управувај со услуги", "Menaxho shërbimet")}
        >
          <ArrowUpRight size={16} />
        </Link>
      }
    >
      {tiles ? (
        <div className={s.serviceTiles}>
          {services?.map((service, index) => (
            <Link
              href="/beauty/services"
              key={service.id}
              className={s.serviceTile}
            >
              <span
                className={s.serviceTileArt}
                data-tone={avatarTones[index % 4]}
                aria-hidden="true"
              >
                <span className={s.serviceNumber}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className={s.serviceSculpture} data-shape={index} />
                <ArrowUpRight size={16} />
              </span>
              <strong>
                {service.names
                  .map(
                    (name) => name ?? t("Removed service", "Отстранета услуга", "Shërbim i hequr"),
                  )
                  .join(" + ")}
              </strong>
              <span>
                {service.appointments} {t("bookings", "термини", "rezervime")}
              </span>
            </Link>
          ))}
        </div>
      ) : (
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
                      (name) =>
                        name ?? t("Removed service", "Отстранета услуга", "Shërbim i hequr"),
                    )
                    .join(" + ")}
                </span>
                <strong>
                  {service.appointments}
                  <small data-replay-public> {t("bookings", "термини", "rezervime")}</small>
                </strong>
              </div>
              <div className={s.serviceTrack}>
                <i
                  data-appear="bar-x"
                  data-tone={serviceTileTones[index % 4]}
                  style={{ width: `${service.appointmentBarPct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
      {!services?.length && (
        <WidgetEmpty>
          {analytics
            ? t(
                "Completed appointments will appear here.",
                "Завршените термини ќе се прикажат тука.",
                "Terminet e përfunduara do të shfaqen këtu.",
              )
            : t("Loading services…", "Се вчитуваат услугите…", "Po ngarkohen shërbimet…")}
        </WidgetEmpty>
      )}
    </WidgetFrame>
  );
}
