"use client";

import { startOfDay } from "date-fns";
import { enGB, mk, sq } from "date-fns/locale";
import { labelDayButton } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { dateKey } from "@/lib/booking-wall-clock";

export default function BookingsDatePicker({
  date,
  bookingDateCounts,
  onDateChange,
  onClose,
}: {
  date: Date;
  bookingDateCounts: ReadonlyMap<string, number>;
  onDateChange: (date: Date) => void;
  onClose: () => void;
}) {
  const { language, t } = useDashboardI18n();
  return (
    <>
      <Calendar
        mode="single"
        required
        autoFocus
        locale={language === "sq" ? sq : language === "mk" ? mk : enGB}
        defaultMonth={date}
        selected={date}
        classNames={{
          today:
            "rounded-full bg-accent text-accent-foreground data-[selected=true]:bg-transparent",
        }}
        onSelect={(selectedDate) => {
          onDateChange(startOfDay(selectedDate));
          onClose();
        }}
        modifiers={{
          hasBookings: (day) => bookingDateCounts.has(dateKey(day)),
        }}
        modifiersClassNames={{
          hasBookings: "dashboard-booking-date-dot",
        }}
        labels={{
          labelNext: () => t("Next month", "Следен месец", "Muaji tjetër"),
          labelPrevious: () =>
            t("Previous month", "Претходен месец", "Muaji i mëparshëm"),
          labelDayButton: (day, modifiers, options) => {
            const count = bookingDateCounts.get(dateKey(day)) ?? 0;
            const bookingsLabel = t(
              count === 1 ? "1 booking" : `${count} bookings`,
              count === 1 ? "1 термин" : `${count} термини`,
              count === 1 ? "1 rezervim" : `${count} rezervime`,
            );
            return `${labelDayButton(day, modifiers, options)}, ${bookingsLabel}`;
          },
        }}
        className="[--cell-size:2.25rem]"
      />
      <p
        data-replay-public
        className="flex items-center justify-center gap-2 px-3 pb-3 text-xs text-muted-foreground"
      >
        <span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />
        {t("Days with bookings", "Денови со термини", "Ditë me rezervime")}
      </p>
    </>
  );
}
