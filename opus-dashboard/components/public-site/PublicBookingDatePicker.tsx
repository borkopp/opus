"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { mk } from "date-fns/locale";
import { CalendarDays, ChevronDown, X } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Spinner } from "@/components/ui/spinner";
import { useMediaQuery } from "@/hooks/use-media-query";
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
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [open, setOpen] = useState(false);
  const service = site.services.find((item) => item._id === selectedServiceId);
  const today = useMemo(
    () => dateInTimezone(new Date(), site.bookingSettings.timezone),
    [site.bookingSettings.timezone],
  );
  const maxDate = useMemo(
    () =>
      addDays(today, Math.max(site.bookingSettings.bookingWindowDays, 1) - 1),
    [site.bookingSettings.bookingWindowDays, today],
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

  const calendar = (
    <div className="flex min-w-0 flex-col gap-3">
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
          if (!date) return;
          const value = dateKey(date);
          onSelectDate(value);
          setOpen(false);
        }}
        disabled={(date) =>
          availableDates === undefined || !availableDateSet.has(dateKey(date))
        }
        startMonth={dateFromKey(today)}
        endMonth={dateFromKey(maxDate)}
        locale={mk}
        showOutsideDays={false}
        fixedWeeks
        aria-label="Изберете датум за термин"
        labels={{
          labelPrevious: () => "Претходен месец",
          labelNext: () => "Следен месец",
        }}
        className="public-booking-calendar w-full p-0 [--cell-size:2.75rem]"
        classNames={{ root: "w-full" }}
      />
      <p
        className="flex min-h-10 items-center gap-2 text-sm text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        {availableDates === undefined && <Spinner />}
        {availableDates === undefined
          ? "Ги проверуваме слободните датуми…"
          : availableDates.length === 0
            ? "Нема слободни датуми во овој месец. Проверете друг месец или специјалист."
            : "Датумите без слободен термин се оневозможени."}
      </p>
      <p className="text-xs leading-5 text-muted-foreground">
        Достапни датуми до {formatBookingDateValue(maxDate)}.
      </p>
    </div>
  );

  if (isDesktop)
    return (
      <div className="rounded-2xl border bg-card p-4 shadow-s">{calendar}</div>
    );

  return (
    <Drawer
      autoFocus
      open={open}
      onOpenChange={(value) => {
        if (value) setPickerMonth(selectedDate.slice(0, 7));
        setOpen(value);
      }}
    >
      <DrawerTrigger asChild>
        <Button
          variant="outline"
          className="h-auto min-h-16 w-full justify-start gap-3 rounded-2xl px-4 py-3 text-left whitespace-normal"
        >
          <CalendarDays className="shrink-0" />
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-xs font-normal text-muted-foreground">
              Датум · Промени
            </span>
            <span>{formatBookingDateValue(selectedDate)}</span>
          </span>
          <ChevronDown className="shrink-0" />
        </Button>
      </DrawerTrigger>
      <DrawerContent
        aria-describedby={undefined}
        className="public-site mx-auto max-w-md data-[vaul-drawer-direction=bottom]:max-h-[92dvh] data-[vaul-drawer-direction=bottom]:rounded-t-3xl"
      >
        <DrawerHeader className="relative shrink-0 px-12 pt-5 pb-3">
          <DrawerTitle>Изберете датум</DrawerTitle>
          <DrawerClose asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Затвори календар"
              className="absolute top-3 right-2 size-11"
            >
              <X />
            </Button>
          </DrawerClose>
        </DrawerHeader>
        <div className="min-h-0 overflow-y-auto overscroll-contain px-3 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {calendar}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
