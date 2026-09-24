"use client";

import { useState } from "react";
import { addDays, isToday, startOfDay, subDays } from "date-fns";
import { enGB, mk } from "date-fns/locale";
import { labelDayButton } from "react-day-picker";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { dateKey } from "@/lib/booking-wall-clock";

export function BookingsDateNavigation({
  date,
  bookingDateCounts,
  onDateChange,
}: {
  date: Date;
  bookingDateCounts: ReadonlyMap<string, number>;
  onDateChange: (date: Date) => void;
}) {
  const { locale, language, t } = useDashboardI18n();
  const [pickerOpen, setPickerOpen] = useState(false);
  const label = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);

  return (
    <div className="col-span-3 flex min-w-0 items-center gap-1 lg:col-span-1">
      <Button
        variant="ghost"
        size="icon"
        className="size-11 shrink-0 text-muted-foreground md:size-9"
        onClick={() => onDateChange(subDays(date, 1))}
        aria-label={t("Previous day", "Претходен ден")}
      >
        <IconChevronLeft className="size-4" />
      </Button>
      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className="min-h-11 min-w-0 flex-1 px-1 tabular-nums md:min-h-9"
            aria-label={`${t("Choose date", "Избери датум")}: ${label}`}
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
          aria-label={t("Choose booking date", "Избери датум за термини")}
        >
          <Calendar
            mode="single"
            required
            autoFocus
            locale={language === "mk" ? mk : enGB}
            defaultMonth={date}
            selected={date}
            classNames={{
              today:
                "rounded-full bg-accent text-accent-foreground data-[selected=true]:bg-transparent",
            }}
            onSelect={(selectedDate) => {
              onDateChange(startOfDay(selectedDate));
              setPickerOpen(false);
            }}
            modifiers={{
              hasBookings: (day) => bookingDateCounts.has(dateKey(day)),
            }}
            modifiersClassNames={{
              hasBookings: "dashboard-booking-date-dot",
            }}
            labels={{
              labelNext: () => t("Next month", "Следен месец"),
              labelPrevious: () => t("Previous month", "Претходен месец"),
              labelDayButton: (day, modifiers, options) => {
                const count = bookingDateCounts.get(dateKey(day)) ?? 0;
                const bookingsLabel = t(
                  count === 1 ? "1 booking" : `${count} bookings`,
                  count === 1 ? "1 термин" : `${count} термини`,
                );
                return `${labelDayButton(day, modifiers, options)}, ${bookingsLabel}`;
              },
            }}
            className="[--cell-size:2.25rem]"
          />
          <p className="flex items-center justify-center gap-2 px-3 pb-3 text-xs text-muted-foreground">
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full bg-primary"
            />
            {t("Days with bookings", "Денови со термини")}
          </p>
        </PopoverContent>
      </Popover>
      <Button
        variant="ghost"
        size="icon"
        className="size-11 shrink-0 text-muted-foreground md:size-9"
        onClick={() => onDateChange(addDays(date, 1))}
        aria-label={t("Next day", "Следен ден")}
      >
        <IconChevronRight className="size-4" />
      </Button>
      {!isToday(date) && (
        <Button
          variant="secondary"
          className="min-h-11 shrink-0 px-3 md:min-h-9"
          onClick={() => onDateChange(startOfDay(new Date()))}
        >
          {t("Today", "Денес")}
        </Button>
      )}
    </div>
  );
}
