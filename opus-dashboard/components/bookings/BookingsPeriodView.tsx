"use client";

import { useEffect, useMemo, useRef } from "react";
import { IconPlus } from "@tabler/icons-react";
import {
  calendarDay,
  calendarDays,
  calendarEventBlocks,
  calendarMonthStart,
} from "../../../shared/calendar";
import {
  bookingDateKey,
  bookingTimestampForDate,
  bookingTimeLabel,
  dateFromKey,
} from "@/lib/booking-wall-clock";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { Button } from "@/components/ui/button";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { cn } from "@/lib/utils";
import type { Id } from "@/convex/_generated/dataModel";
import type { BookingView, StaffView } from "./types";
import { BookingsList } from "./BookingsList";
import { BookingPopoverCard } from "./BookingPopoverCard";
import { bookingServiceLabel } from "./service-label";

const HOUR_HEIGHT = 72;
type Props = {
  period: "week" | "month";
  currentDate: Date;
  now: number;
  isMobile: boolean;
  bookings: BookingView[];
  staffMembers: StaffView[];
  selectedBookingId: Id<"bookings"> | null;
  onSelectBooking: (id: Id<"bookings"> | null) => void;
  onSelectDay: (date: Date) => void;
  onOpenDay: (date: Date) => void;
  onNewBooking: (date: Date) => void;
  onComplete: (id: Id<"bookings">) => void;
  onCancel: (id: Id<"bookings">) => void;
  onMarkNoShow: (id: Id<"bookings">) => void;
};

export function BookingsPeriodView(props: Props) {
  const {
    period,
    currentDate,
    now,
    isMobile,
    bookings,
    staffMembers,
    selectedBookingId,
    onSelectBooking,
    onSelectDay,
    onOpenDay,
    onNewBooking,
    onComplete,
    onCancel,
    onMarkNoShow,
  } = props;
  const { locale, t } = useDashboardI18n();
  const day = bookingTimestampForDate(currentDate, 0);
  const days = useMemo(() => calendarDays(day, period), [day, period]);
  const today = calendarDay(now);
  const positioned = useRef<string | null>(null);
  const rangeStart = days[0];
  const scroll = useRef<HTMLDivElement>(null);
  const group = useMemo(() => {
    const rows = new Map<number, BookingView[]>();
    for (const booking of bookings) {
      const key = calendarDay(booking.startAt);
      const list = rows.get(key) ?? [];
      list.push(booking);
      rows.set(key, list);
    }
    for (const list of rows.values())
      list.sort((a, b) => a.startAt - b.startAt);
    return rows;
  }, [bookings]);
  const formatDay = (date: number, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale, { timeZone: "UTC", ...options }).format(
      date,
    );
  const asDate = (date: number) => dateFromKey(bookingDateKey(date))!;
  const bookingCount = (count: number) =>
    t(`${count} appointments`, `${count} термини`, `${count} termine`);
  const dayLabel = (date: number) =>
    formatDay(date, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  useEffect(() => {
    if (period !== "week" || !scroll.current) return;
    const key = `${rangeStart}:${day}`;
    if (positioned.current === key) return;
    positioned.current = key;
    const first = bookings
      .filter((booking) => calendarDay(booking.startAt) === day)
      .reduce(
        (value, booking) => Math.min(value, (booking.startAt - day) / 60_000),
        Infinity,
      );
    const minute =
      day === today
        ? (now - today) / 60_000
        : Number.isFinite(first)
          ? first
          : 9 * 60;
    scroll.current.scrollTo({
      top: Math.max(0, (minute / 60 - 1) * HOUR_HEIGHT),
      behavior: "instant",
    });
    // Live updates move the marker without resetting the user's scroll.
  }, [rangeStart, day, period, bookings, now, today, isMobile]);

  function event(booking: BookingView, compact = false) {
    return (
      <BookingPopoverCard
        key={booking._id}
        booking={booking}
        staff={staffMembers.find((staff) => staff._id === booking.staffId)}
        open={selectedBookingId === booking._id}
        onOpenChange={(open) => onSelectBooking(open ? booking._id : null)}
        onComplete={onComplete}
        onCancel={onCancel}
        onMarkNoShow={onMarkNoShow}
      >
        <button
          type="button"
          data-testid={`period-booking-${booking._id}`}
          aria-label={`${bookingTimeLabel(booking.startAt)}, ${booking.customer?.name ?? t("Guest", "Гостин", "Mysafir")}, ${bookingServiceLabel(booking, t("Service", "Услуга", "Shërbimi"))}`}
          className={cn(
            "flex size-full min-w-0 flex-col items-start gap-0.5 overflow-hidden rounded-lg border-l-[3px] border-primary bg-accent px-2 py-1 text-left text-accent-foreground outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring",
            booking.status === "cancelled" &&
              "border-muted-foreground bg-secondary text-muted-foreground line-through",
            booking.status === "completed" && "border-primary/40",
            compact && "flex-row items-center gap-1",
          )}
        >
          <span className="shrink-0 text-[10px] tabular-nums">
            {bookingTimeLabel(booking.startAt)}
          </span>
          <span className="w-full truncate text-xs font-semibold">
            {booking.customer?.name ?? t("Guest", "Гостин", "Mysafir")}
          </span>
          {!compact && (
            <span className="w-full truncate text-[10px]">
              {bookingServiceLabel(booking, t("Service", "Услуга", "Shërbimi"))}
            </span>
          )}
        </button>
      </BookingPopoverCard>
    );
  }
  function agenda(date: number) {
    const appointments = group.get(date) ?? [];
    return (
      <section className="min-w-0 border-t border-border/50" key={date}>
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <h3 className="text-sm font-semibold">
            {formatDay(date, {
              weekday: "long",
              day: "numeric",
              month: "short",
            })}
          </h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onNewBooking(asDate(date))}
            aria-label={
              t("New booking on", "Нов термин на", "Termin i ri më") +
              " " +
              dayLabel(date)
            }
          >
            <IconPlus />
          </Button>
        </div>
        {appointments.length ? (
          <BookingsList
            bookings={appointments}
            staffMembers={staffMembers}
            selectedBookingId={selectedBookingId}
            onSelectBooking={onSelectBooking}
            onComplete={onComplete}
            onCancel={onCancel}
            onMarkNoShow={onMarkNoShow}
          />
        ) : (
          <Empty className="py-4">
            <EmptyHeader>
              <EmptyTitle className="text-sm">
                {t("No appointments", "Нема термини", "Nuk ka termine")}
              </EmptyTitle>
            </EmptyHeader>
          </Empty>
        )}
      </section>
    );
  }

  if (period === "month")
    return (
      <div data-testid="bookings-month-view" className="min-w-0">
        <div className="grid grid-cols-7 border-b border-border/50">
          {days.slice(0, 7).map((date) => (
            <span
              key={date}
              className="py-3 text-center text-xs text-muted-foreground"
            >
              {formatDay(date, { weekday: "short" })}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((date) => {
            const appointments = group.get(date) ?? [];
            const outside =
              calendarMonthStart(date) !== calendarMonthStart(day);
            return (
              <div
                key={date}
                data-testid={`month-cell-${bookingDateKey(date)}`}
                className={cn(
                  "min-h-20 min-w-0 border-b border-r border-border/40 p-1 md:min-h-40 md:p-2",
                  outside && "bg-secondary/30",
                  date === day && "bg-accent/30",
                )}
              >
                <Button
                  variant={
                    date === today
                      ? "default"
                      : date === day
                        ? "secondary"
                        : "ghost"
                  }
                  size="icon"
                  className="h-11 w-full md:size-8"
                  aria-label={
                    t("Select day", "Избери ден", "Zgjidh ditën") +
                    ", " +
                    dayLabel(date) +
                    ", " +
                    bookingCount(appointments.length)
                  }
                  aria-pressed={date === day}
                  onClick={() =>
                    isMobile
                      ? onSelectDay(asDate(date))
                      : onOpenDay(asDate(date))
                  }
                >
                  {new Date(date).getUTCDate()}
                </Button>
                {!isMobile && (
                  <div className="flex flex-col gap-1">
                    {appointments.slice(0, 3).map((booking) => (
                      <div key={booking._id} className="h-7 min-w-0">
                        {event(booking, true)}
                      </div>
                    ))}
                    {appointments.length > 3 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 justify-start px-1"
                        onClick={() => onOpenDay(asDate(date))}
                      >
                        {t(
                          `+${appointments.length - 3} more`,
                          `+${appointments.length - 3} други`,
                          `+${appointments.length - 3} të tjera`,
                        )}
                      </Button>
                    )}
                  </div>
                )}
                <span className="block text-center text-[10px] text-muted-foreground md:hidden">
                  {appointments.length || " "}
                </span>
              </div>
            );
          })}
        </div>
        {isMobile && agenda(day)}
      </div>
    );

  if (isMobile)
    return <div data-testid="bookings-week-agenda">{days.map(agenda)}</div>;
  return (
    <>
      <div
        data-testid="bookings-week-view"
        ref={scroll}
        className="h-full overflow-auto overscroll-contain"
      >
        <div className="min-w-[840px]">
          <div className="sticky top-0 z-10 grid grid-cols-[52px_repeat(7,minmax(0,1fr))] border-b border-border bg-card">
            <span className="sticky left-0 z-10 bg-card" />
            {days.map((date) => (
              <Button
                key={date}
                variant={date === today ? "secondary" : "ghost"}
                className="h-14 rounded-none"
                aria-label={
                  t("Open day", "Отвори ден", "Hap ditën") +
                  ", " +
                  dayLabel(date)
                }
                onClick={() => onOpenDay(asDate(date))}
              >
                {formatDay(date, { weekday: "short", day: "numeric" })}
              </Button>
            ))}
          </div>
          <div className="grid grid-cols-[52px_repeat(7,minmax(0,1fr))]">
            <div
              className="sticky left-0 z-10 bg-card"
              style={{ height: 24 * HOUR_HEIGHT + 16 }}
            >
              {Array.from({ length: 25 }, (_, hour) => (
                <span
                  key={hour}
                  className="absolute right-2 text-[10px] tabular-nums text-muted-foreground"
                  style={{ top: hour * HOUR_HEIGHT }}
                >
                  {String(hour).padStart(2, "0")}:00
                </span>
              ))}
            </div>
            {days.map((date) => (
              <div
                key={date}
                className="relative border-l border-border/40"
                style={{ height: 24 * HOUR_HEIGHT + 16 }}
              >
                {Array.from({ length: 24 }, (_, hour) => (
                  <div
                    key={hour}
                    className="border-t border-border/40"
                    style={{ height: HOUR_HEIGHT }}
                  />
                ))}
                {calendarEventBlocks(group.get(date) ?? [], date, {
                  hourHeight: HOUR_HEIGHT,
                  minimumHeight: 32,
                  key: (booking) => booking._id,
                }).map((block) => (
                  <div
                    key={block.appointment._id}
                    className="absolute px-0.5"
                    style={{
                      top: block.top,
                      height: block.height,
                      left: `${(block.lane / block.lanes) * 100}%`,
                      width: `${100 / block.lanes}%`,
                    }}
                  >
                    {event(block.appointment)}
                  </div>
                ))}
                {date === today && (
                  <div
                    data-testid="week-now-marker"
                    aria-label={
                      t(
                        "Current studio time",
                        "Моментално време во студиото",
                        "Ora aktuale e studios",
                      ) +
                      " " +
                      bookingTimeLabel(now)
                    }
                    className="pointer-events-none absolute inset-x-0 border-t-2 border-destructive"
                    style={{ top: ((now - today) / 3_600_000) * HOUR_HEIGHT }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
