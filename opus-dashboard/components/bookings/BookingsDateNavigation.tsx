"use client";

import { useState } from "react";
import { startOfDay } from "date-fns";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import { BookingsLoading } from "./BookingsLoading";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import {
  calendarDays,
  shiftCalendarPeriod,
  type CalendarPeriod,
} from "../../../shared/calendar";
import {
  bookingTimestampForDate,
  bookingDateKey,
  dateFromKey,
  dateKey,
} from "@/lib/booking-wall-clock";

const BookingsDatePicker = dynamic(() => import("./BookingsDatePicker"), {
  loading: () => (
    <div className="w-[284px]">
      <BookingsLoading />
    </div>
  ),
});

export function BookingsDateNavigation({
  date,
  today = new Date(),
  period = "day",
  bookingDateCounts,
  onDateChange,
}: {
  date: Date;
  today?: Date;
  period?: CalendarPeriod;
  bookingDateCounts: ReadonlyMap<string, number>;
  onDateChange: (date: Date) => void;
}) {
  const { locale, t } = useDashboardI18n();
  const [pickerOpen, setPickerOpen] = useState(false);
  const timestamp = bookingTimestampForDate(date, 0);
  const days = calendarDays(timestamp, "week");
  const shortDate = (day: number) =>
    new Intl.DateTimeFormat(locale, {
      timeZone: "UTC",
      month: "short",
      day: "numeric",
    }).format(day);
  const label =
    period === "month"
      ? new Intl.DateTimeFormat(locale, {
          month: "long",
          year: "numeric",
        }).format(date)
      : period === "week"
        ? `${shortDate(days[0])} – ${shortDate(days[6])}`
        : new Intl.DateTimeFormat(locale, {
            weekday: "short",
            month: "short",
            day: "numeric",
          }).format(date);
  const shift = (direction: number) =>
    onDateChange(
      dateFromKey(
        bookingDateKey(shiftCalendarPeriod(timestamp, period, direction)),
      )!,
    );

  return (
    <div className="col-span-3 flex min-w-0 items-center gap-1 lg:col-span-1">
      <Button
        variant="ghost"
        size="icon"
        className="size-11 shrink-0 text-muted-foreground md:size-9"
        onClick={() => shift(-1)}
        aria-label={
          period === "month"
            ? t("Previous month", "Претходен месец", "Muaji i mëparshëm")
            : period === "week"
              ? t("Previous week", "Претходна недела", "Java e mëparshme")
              : t("Previous day", "Претходен ден", "Dita e mëparshme")
        }
      >
        <IconChevronLeft className="size-4" />
      </Button>
      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className="min-h-11 min-w-0 flex-1 px-1 tabular-nums md:min-h-9"
            aria-label={`${t("Choose date", "Избери датум", "Zgjidh datën")}: ${label}`}
          >
            <span aria-live="polite" className="truncate">
              {label}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          collisionPadding={8}
          className="max-h-[var(--radix-popover-content-available-height)] w-auto overflow-y-auto p-0"
          aria-label={t(
            "Choose booking date",
            "Избери датум за термини",
            "Zgjidh datën e rezervimeve",
          )}
        >
          {pickerOpen && (
            <BookingsDatePicker
              date={date}
              bookingDateCounts={bookingDateCounts}
              onDateChange={onDateChange}
              onClose={() => setPickerOpen(false)}
            />
          )}
        </PopoverContent>
      </Popover>
      <Button
        variant="ghost"
        size="icon"
        className="size-11 shrink-0 text-muted-foreground md:size-9"
        onClick={() => shift(1)}
        aria-label={
          period === "month"
            ? t("Next month", "Следен месец", "Muaji tjetër")
            : period === "week"
              ? t("Next week", "Следна недела", "Java tjetër")
              : t("Next day", "Следен ден", "Dita tjetër")
        }
      >
        <IconChevronRight className="size-4" />
      </Button>
      {dateKey(date) !== dateKey(today) && (
        <Button
          data-replay-public
          variant="secondary"
          className="min-h-11 shrink-0 px-3 md:min-h-9"
          onClick={() => onDateChange(startOfDay(today))}
        >
          {t("Today", "Денес", "Sot")}
        </Button>
      )}
    </div>
  );
}
