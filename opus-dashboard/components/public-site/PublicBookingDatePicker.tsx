"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { enGB, mk, sq } from "date-fns/locale";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Calendar } from "@/components/ui/calendar";
import { Spinner } from "@/components/ui/spinner";
import {
  dateFromKey,
  dateKey,
  monthFromKey,
  monthKey,
} from "@/lib/booking-wall-clock";
import {
  addDays,
  dateInTimezone,
  formatBookingDateValue,
} from "@/lib/public-booking-format";
import { usePublicBookingI18n } from "./PublicBookingI18n";
import type { PublicSite } from "./types";

export function PublicBookingDatePicker({
  site,
  selectedServiceId,
  selectedStaffId,
  selectedDate,
  onSelectDate,
}: {
  site: PublicSite;
  selectedServiceId: string;
  selectedStaffId: string;
  selectedDate: string;
  onSelectDate: (date: string) => void;
}) {
  const { text, locale } = usePublicBookingI18n();
  const service = site.services.find((item) => item._id === selectedServiceId);
  const today = useMemo(
    () => dateInTimezone(new Date(), site.bookingSettings.timezone),
    [site.bookingSettings.timezone],
  );
  const maxDate = addDays(
    today,
    Math.max(site.bookingSettings.bookingWindowDays, 1) - 1,
  );
  const [pickerMonth, setPickerMonth] = useState(() =>
    selectedDate.slice(0, 7),
  );
  const availableDates = useQuery(
    api.publicBooking.getPublicAvailableDates,
    service
      ? {
          orgId: site._id,
          serviceId: service._id,
          staffId:
            selectedStaffId === "any"
              ? "any"
              : (selectedStaffId as Id<"staff_members">),
          month: pickerMonth,
        }
      : "skip",
  );
  const availableDateSet = useMemo(
    () => new Set(availableDates ?? []),
    [availableDates],
  );
  const selectedCalendarDate = dateFromKey(selectedDate);
  return (
    <div
      className="flex min-w-0 flex-col gap-3"
      aria-busy={availableDates === undefined}
    >
      <Calendar
        mode="single"
        required
        month={monthFromKey(pickerMonth)}
        selected={
          selectedCalendarDate && availableDateSet.has(selectedDate)
            ? selectedCalendarDate
            : undefined
        }
        onMonthChange={(date) => setPickerMonth(monthKey(date))}
        onSelect={(date) => {
          if (date) onSelectDate(dateKey(date));
        }}
        disabled={(date) =>
          availableDates === undefined || !availableDateSet.has(dateKey(date))
        }
        startMonth={dateFromKey(today)}
        endMonth={dateFromKey(maxDate)}
        locale={{ mk, en: enGB, sq }[locale]}
        showOutsideDays={false}
        fixedWeeks
        aria-label={text("Изберете датум за термин")}
        labels={{
          labelPrevious: () => text("Претходен месец"),
          labelNext: () => text("Следен месец"),
          labelNav: () => text("Навигација низ календар"),
          labelDayButton: (date, modifiers) =>
            [
              formatBookingDateValue(dateKey(date), locale),
              modifiers.today && text("Денес"),
              modifiers.selected && text("Избрано"),
            ]
              .filter(Boolean)
              .join(", "),
        }}
        className="public-booking-calendar w-full rounded-xl p-0 [--cell-size:2.75rem]"
        classNames={{ root: "w-full" }}
      />
      <p
        className="flex min-h-10 items-start gap-2 text-xs leading-5 text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        {availableDates === undefined && (
          <Spinner className="mt-0.5 shrink-0" />
        )}
        {availableDates === undefined
          ? text("Ги проверуваме слободните датуми…")
          : availableDates.length === 0
            ? text(
                "Нема слободни датуми во овој месец. Проверете друг месец или специјалист.",
              )
            : text(
                "Изберете означен датум за да ги видите слободните термини.",
              )}
      </p>
      <p className="text-xs leading-5 text-muted-foreground">
        {text("Достапни датуми до")} {formatBookingDateValue(maxDate, locale)}.
      </p>
    </div>
  );
}
