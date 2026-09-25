"use client";
import { Appear } from "@/components/ui/appear";
import { appearStep } from "@/lib/appear";
import { Plus, Scissors, Sun } from "lucide-react";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { AppointmentsMetric } from "./widgets/AppointmentsMetric";
import { RevenueMetric } from "./widgets/RevenueMetric";
import { OccupancyMetric } from "./widgets/OccupancyMetric";
import { RevenueWidget } from "./widgets/RevenueWidget";
import { TeamWidget } from "./widgets/TeamWidget";
import { ServicesWidget } from "./widgets/ServicesWidget";
import { ScheduleWidget } from "./widgets/ScheduleWidget";
import { NextClientWidget } from "./widgets/NextClientWidget";
import { ReturningClientsWidget } from "./widgets/ReturningClientsWidget";
import { FrontDeskWidget } from "./widgets/FrontDeskWidget";
import { PromotionWidget } from "./widgets/PromotionWidget";
import s from "../clarity.module.css";
import { useDashboardAppearance } from "../DashboardAppearanceProvider";

import type { ReactNode } from "react";
import type {
  OverviewData,
  ClientAnalytics,
  UtilisationData,
} from "@/lib/dashboard-overview";

export function OverviewLayout({
  data,
  isUpdating = false,
  paid = false,
  utilisation,
  analytics,
  firstName,
  onNewAppointment,
  onDaysChange,
  onDateChange,
  openings,
  assistant,
  recovery,
  website,
}: {
  data: OverviewData;
  isUpdating?: boolean;
  paid?: boolean;
  utilisation?: UtilisationData;
  analytics?: ClientAnalytics;
  firstName: string;
  onNewAppointment: () => void;
  onDaysChange: (days: 7 | 30) => void;
  onDateChange: (date: string) => void;
  openings: ReactNode;
  assistant: ReactNode;
  recovery: ReactNode;
  website?: ReactNode;
}) {
  const { t, locale } = useDashboardI18n();
  const studio = useDashboardAppearance() === "studio";
  const hour = new Date(data.now).getUTCHours();
  const greeting =
    hour < 12
      ? t("Good morning", "Добро утро")
      : hour < 18
        ? t("Good afternoon", "Добар ден")
        : t("Good evening", "Добровечер");
  return (
    <div className={s.clarityBody} aria-busy={isUpdating}>
      <div className={s.clarityMain}>
        <Appear className={s.greeting}>
          <div>
            <div data-appear="item" className={s.eyebrow}>
              <Sun size={15} />
              {new Intl.DateTimeFormat(locale, {
                dateStyle: "full",
                timeZone: "UTC",
              }).format(data.today)}
            </div>
            <h1 data-appear="item" style={appearStep(2)}>
              {studio
                ? t(
                    "A good day starts with a little clarity",
                    "Добриот ден почнува со јасен преглед",
                  )
                : `${greeting}${firstName ? `, ${firstName}` : ""}`}
              <span>.</span>
            </h1>
            <p data-appear="item" style={appearStep(3)}>
              {t("You have", "Имате")}{" "}
              <strong>
                {data.todayCount} {t("appointments", "термини")}
              </strong>{" "}
              {t(
                "today. Let’s make it a good day.",
                "денес. Ви посакуваме успешен ден.",
              )}
            </p>
          </div>
          <button
            data-appear="item"
            style={appearStep(3)}
            className={s.primaryButton}
            type="button"
            onClick={() => onNewAppointment()}
          >
            <Plus size={18} />
            {t("New appointment", "Нов термин")}
          </button>
        </Appear>
        <div className={studio ? s.studioMetrics : undefined}>
          <div className={s.metrics}>
            <AppointmentsMetric data={data} />
            <RevenueMetric revenue={data.revenue} />
            <OccupancyMetric utilisation={utilisation} />
          </div>
          {studio && (
            <button
              type="button"
              className={s.studioQuickAdd}
              onClick={onNewAppointment}
            >
              <span className={s.roundIcon}>
                <Plus size={24} />
              </span>
              <span>{t("Book a client", "Закажи термин")}</span>
            </button>
          )}
        </div>
        {studio ? (
          <div className={s.studioMiddle}>
            <ReturningClientsWidget analytics={analytics} />
            <ServicesWidget analytics={analytics} tiles />
          </div>
        ) : (
          <>
            <RevenueWidget revenue={data.revenue} onDaysChange={onDaysChange} />
            <div className={s.bottomPair}>
              <TeamWidget staff={data.staff} utilisation={utilisation} />
              <ServicesWidget analytics={analytics} />
            </div>
          </>
        )}
        <ScheduleWidget data={data} onDateChange={onDateChange} />
        <PromotionWidget />
        {studio && (
          <div className={s.bottomPair}>
            <RevenueWidget revenue={data.revenue} onDaysChange={onDaysChange} />
            <TeamWidget staff={data.staff} utilisation={utilisation} />
          </div>
        )}
        <div className={s.bottomPair}>
          {assistant}
          {recovery}
        </div>
      </div>
      <aside className={s.clarityAside}>
        <Appear className={s.studioLabel}>
          <span>
            <i />
            {data.orgName}
          </span>
          <Scissors size={15} />
        </Appear>
        <NextClientWidget booking={data.next} featured={studio} />
        {openings}
        {!studio && <ReturningClientsWidget analytics={analytics} />}
        <FrontDeskWidget paid={paid} />
        {website}
      </aside>
    </div>
  );
}
