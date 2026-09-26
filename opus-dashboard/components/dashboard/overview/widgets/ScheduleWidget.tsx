import { appearStep } from "@/lib/appear";
import { useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Users,
  ArrowUpRight,
} from "lucide-react";
import {
  appointmentHref,
  avatarTones,
  initials,
  type OverviewData,
} from "@/lib/dashboard-overview";
import { bookingTimeLabel } from "@/lib/booking-wall-clock";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { WidgetFrame, WidgetEmpty } from "../WidgetFrame";
import s from "../../clarity.module.css";
const DAY = 86_400_000;
export function ScheduleWidget({
  data,
  onDateChange,
}: {
  data: OverviewData;
  onDateChange: (date: string) => void;
}) {
  const { t, locale } = useDashboardI18n();
  const [search, setSearch] = useState("");
  const [staff, setStaff] = useState("");
  const dateLabel = (at: number, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" }).format(at);
  const changeDate = (at: number) =>
    onDateChange(new Date(at).toISOString().slice(0, 10));
  const monday =
    data.selected - ((new Date(data.selected).getUTCDay() + 6) % 7) * DAY;
  const visible = data.schedule.filter(
    (b) =>
      (!staff || b.staffId === staff) &&
      `${b.customerName} ${b.serviceName}`
        .toLocaleLowerCase(locale)
        .includes(search.toLocaleLowerCase(locale)),
  );
  return (
    <WidgetFrame
      replayPublicSubtitle
      replayPublicTitle
      delay={0}
      title={t("Your appointment schedule", "Вашиот распоред на термини")}
      subtitle={t("One appointment at a time.", "Секој термин на свое место.")}
      className={s.schedule}
      action={
        <span className={s.countPill}>
          {data.schedule.length} {t("appointments", "термини")}
        </span>
      }
    >
      <div data-appear="item" style={appearStep(3)} className={s.scheduleMonth}>
        <span>
          {dateLabel(data.selected, { month: "long", year: "numeric" })}
        </span>
        <div>
          <button
            type="button"
            className={s.smallIcon}
            aria-label={t("Previous day", "Претходен ден")}
            onClick={() => changeDate(data.selected - DAY)}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            className={s.smallIcon}
            aria-label={t("Next day", "Следен ден")}
            onClick={() => changeDate(data.selected + DAY)}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <div
        className={s.weekPicker}
        role="group"
        aria-label={t("Appointment date", "Датум на термин")}
      >
        {Array.from({ length: 7 }, (_, i) => monday + i * DAY).map(
          (at, index) => (
            <button
              key={at}
              data-appear="item"
              style={appearStep(3 + index)}
              type="button"
              aria-label={dateLabel(at, { dateStyle: "full" })}
              aria-pressed={data.selected === at}
              onClick={() => changeDate(at)}
            >
              <span>{dateLabel(at, { weekday: "narrow" })}</span>
              <strong>{new Date(at).getUTCDate()}</strong>
              <i data-today={at === data.today} />
            </button>
          ),
        )}
      </div>
      <div className={s.scheduleFilters}>
        <label
          data-appear="item"
          style={appearStep(4)}
          className={s.searchField}
        >
          <Search size={15} />
          <input
            aria-label={t("Search appointments", "Пребарај термини")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t(
              "Find a client or service",
              "Пребарај клиент или услуга",
            )}
          />
        </label>
        <label
          data-appear="item"
          style={appearStep(5)}
          className={s.staffSelect}
        >
          <Users size={14} />
          <span data-replay-public className={s.srOnly}>
            {t("Filter by team member", "Филтрирај по член на тимот")}
          </span>
          <select value={staff} onChange={(e) => setStaff(e.target.value)}>
            <option value="">{t("Everyone", "Сите")}</option>
            {data.staff.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
          <ChevronDown size={12} />
        </label>
      </div>
      <div className={s.appointmentList}>
        {visible.map((booking, index) => (
          <Link
            data-appear="item"
            style={appearStep(5 + index)}
            className={s.appointmentRow}
            key={booking.id}
            href={appointmentHref(booking)}
          >
            <span className={s.appointmentTime}>
              {bookingTimeLabel(booking.startAt)}
              <small>
                {Math.round((booking.endAt - booking.startAt) / 60_000)} min
              </small>
            </span>
            <span className={s.avatar} data-tone={avatarTones[index % 4]}>
              {initials(booking.customerName)}
            </span>
            <span className={s.appointmentPerson}>
              <strong>{booking.customerName}</strong>
              <span>
                {booking.serviceName} · {booking.staffName}
              </span>
            </span>
            <span
              data-replay-public
              className={s.appointmentStatus}
              data-status={
                booking.status === "completed"
                  ? "Completed"
                  : booking.status === "checked_in"
                    ? "Arrived"
                    : "Confirmed"
              }
            >
              <i />
              {booking.status === "completed"
                ? t("Completed", "Завршен")
                : booking.status === "checked_in"
                  ? t("Arrived", "Пристигнат")
                  : t("Confirmed", "Потврден")}
            </span>
            <span className={s.rowArrow}>
              {booking.status === "completed" ? (
                <Check size={15} />
              ) : (
                <ArrowUpRight size={16} />
              )}
            </span>
          </Link>
        ))}
        {!visible.length && (
          <WidgetEmpty>
            <CalendarDays className="mx-auto mb-3" size={25} />
            {search || staff
              ? t(
                  "No appointments match these filters.",
                  "Нема термини за овие филтри.",
                )
              : t(
                  "No appointments on this day yet.",
                  "Сè уште нема термини за овој ден.",
                )}
          </WidgetEmpty>
        )}
      </div>
      <div
        data-appear="item"
        style={appearStep(8)}
        className={s.scheduleFooter}
      >
        <button
          data-replay-public
          type="button"
          onClick={() => changeDate(data.today)}
        >
          {t("Back to today", "Назад на денес")}
        </button>
        <Link
          data-replay-public
          href={`/beauty/bookings?date=${new Date(data.selected).toISOString().slice(0, 10)}`}
        >
          {t("Open calendar", "Отвори календар")} ↗
        </Link>
      </div>
    </WidgetFrame>
  );
}
