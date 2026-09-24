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
import s from "../clarity.module.css";

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
              {greeting}
              {firstName ? `, ${firstName}` : ""}
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
        <div className={s.metrics}>
          <AppointmentsMetric data={data} />
          <RevenueMetric revenue={data.revenue} />
          <OccupancyMetric utilisation={utilisation} />
        </div>
        <RevenueWidget revenue={data.revenue} onDaysChange={onDaysChange} />
        <div className={s.bottomPair}>
          <TeamWidget staff={data.staff} utilisation={utilisation} />
          <ServicesWidget analytics={analytics} />
        </div>
        <ScheduleWidget data={data} onDateChange={onDateChange} />
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
        <NextClientWidget booking={data.next} />
        {openings}
        <ReturningClientsWidget analytics={analytics} />
        <FrontDeskWidget paid={paid} />
        {website}
      </aside>
    </div>
  );
}
