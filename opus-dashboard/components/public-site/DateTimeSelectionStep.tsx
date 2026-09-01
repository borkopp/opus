"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { mk } from "date-fns/locale";
import { ArrowRight, CalendarDays } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  dateFromKey,
  dateKey,
  monthFromKey,
  monthKey,
} from "@/lib/booking-wall-clock";
import { formatPrice } from "@/lib/format-price";
import {
  addDays,
  dateInTimezone,
  formatBookingDateValue,
  formatBookingTime,
} from "@/lib/public-booking-format";
import { cn } from "@/lib/utils";
import { BookingStepShell } from "./BookingStepShell";
import type { PublicSite } from "./types";

interface DateTimeSelectionStepProps {
  site: PublicSite;
  selectedStaffId: string | "any";
  selectedServiceId: string;
  selectedDate: string;
  selectedSlotTimestamp: number | null;
  onSelectDate: (date: string) => void;
  onSelectSlot: (startAt: number, staffId: string) => void;
  onContinue: () => void;
  onBack: () => void;
}

export function DateTimeSelectionStep({
  site,
  selectedStaffId,
  selectedServiceId,
  selectedDate,
  selectedSlotTimestamp,
  onSelectDate,
  onSelectSlot,
  onContinue,
  onBack,
}: DateTimeSelectionStepProps) {
  const service = site.services.find(
    (candidate) => candidate._id === selectedServiceId,
  );
  const staff =
    selectedStaffId === "any"
      ? null
      : site.staff.find((member) => member._id === selectedStaffId);
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
  const slots = useQuery(
    api.publicBooking.getPublicSlots,
    service
      ? {
          orgId: site._id,
          serviceId: service._id,
          staffId:
            selectedStaffId === "any"
              ? "any"
              : (selectedStaffId as Id<"staff_members">),
          date: selectedDate,
        }
      : "skip",
  );

  return (
    <BookingStepShell
      title="Изберете термин"
      description="Одберете датум, па изберете едно од достапните времиња."
      backLabel="Назад кон специјалисти"
      onBack={onBack}
    >
      <FieldGroup className="gap-6">
        <Field>
          <FieldLabel id="booking-date-label">Датум</FieldLabel>
          <div className="w-full max-w-sm overflow-hidden rounded-2xl border bg-card shadow-s">
            <Calendar
              mode="single"
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
                setPickerMonth(value.slice(0, 7));
                onSelectDate(value);
              }}
              disabled={(date) =>
                availableDates === undefined ||
                !availableDateSet.has(dateKey(date))
              }
              startMonth={dateFromKey(today)}
              endMonth={dateFromKey(maxDate)}
              locale={mk}
              showOutsideDays={false}
              aria-labelledby="booking-date-label"
              className="w-full p-4"
              classNames={{ root: "w-full" }}
            />
            <Separator />
            <div
              className="flex items-center gap-2 px-4 py-3 text-xs text-muted-foreground"
              role="status"
              aria-live="polite"
            >
              {availableDates === undefined && <Spinner />}
              {availableDates === undefined
                ? "Ги проверуваме слободните датуми…"
                : "Датумите без слободен термин се оневозможени."}
            </div>
          </div>
          <FieldDescription>
            Достапни датуми до {formatBookingDateValue(maxDate)}.
          </FieldDescription>
        </Field>

        <Field>
          <FieldLabel>Слободни термини</FieldLabel>
          <FieldDescription>
            {formatBookingDateValue(selectedDate)}
          </FieldDescription>

          {slots === undefined ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          ) : slots.length === 0 ? (
            <Empty className="py-8">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CalendarDays />
                </EmptyMedia>
                <EmptyTitle>Нема слободни термини</EmptyTitle>
                <EmptyDescription>
                  Изберете друг датум или вратете се и сменете го специјалистот.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div
              className="grid grid-cols-3 gap-2 sm:grid-cols-4"
              role="listbox"
              aria-label="Слободни термини"
            >
              {slots.map((slot) => {
                const availableStaffId = slot.availableStaffIds[0];
                const isSelected = selectedSlotTimestamp === slot.startAt;

                return (
                  <button
                    key={slot.startAt}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={!availableStaffId}
                    onClick={() =>
                      availableStaffId &&
                      onSelectSlot(slot.startAt, availableStaffId)
                    }
                    className={cn(
                      "rounded-md border px-3 py-2.5 font-mono text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card hover:border-primary hover:bg-accent",
                    )}
                  >
                    {formatBookingTime(slot.startAt)}
                  </button>
                );
              })}
            </div>
          )}
        </Field>
      </FieldGroup>

      <Card
        className="gap-0 rounded-2xl shadow-s"
        data-booking-action-card="true"
      >
        <CardContent className="py-5">
          <dl
            className="grid gap-4 text-sm sm:grid-cols-3"
            data-booking-selection-summary="true"
          >
            <div className="flex flex-col gap-1">
              <dt className="text-xs text-muted-foreground">Услуга</dt>
              <dd className="font-medium">{service?.name}</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-xs text-muted-foreground">Специјалист</dt>
              <dd className="font-medium">
                {staff?.displayName || "Прв достапен"}
              </dd>
            </div>
            <div className="flex flex-col gap-1 sm:text-right">
              <dt className="text-xs text-muted-foreground">
                {service?.durationMins} мин
              </dt>
              <dd className="font-mono font-medium">
                {service &&
                  formatPrice(
                    service.priceMinorUnits,
                    service.currency,
                    site.bookingSettings.locale,
                  )}
              </dd>
            </div>
          </dl>
        </CardContent>
        <Separator />
        <CardFooter className="flex-col gap-3 py-4 sm:flex-row sm:justify-between sm:py-5">
          <p className="w-full text-sm text-muted-foreground sm:w-auto">
            {selectedSlotTimestamp
              ? `Избрано време: ${formatBookingTime(selectedSlotTimestamp)}`
              : "Изберете време за да продолжите."}
          </p>
          <Button
            type="button"
            size="lg"
            disabled={!selectedSlotTimestamp}
            onClick={onContinue}
            className="w-full sm:w-auto"
          >
            Продолжи
            <ArrowRight data-icon="inline-end" />
          </Button>
        </CardFooter>
      </Card>
    </BookingStepShell>
  );
}
