"use client";

import { useQuery } from "convex/react";
import { ArrowRight, CalendarDays } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
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
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/format-price";
import {
  formatBookingDateValue,
  formatBookingTime,
} from "@/lib/public-booking-format";
import { cn } from "@/lib/utils";
import { PublicBookingDatePicker } from "./PublicBookingDatePicker";
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
      backLabel="Назад кон специјалисти"
      onBack={onBack}
    >
      <div
        className="flex items-start justify-between gap-4 rounded-2xl border bg-card p-4 text-sm"
        data-booking-selection-summary="true"
      >
        <div className="flex min-w-0 flex-col gap-1">
          <p className="font-medium">{service?.name}</p>
          <p className="text-muted-foreground">
            {staff?.displayName || "Прв достапен"} · {service?.durationMins} мин
          </p>
        </div>
        <p className="shrink-0 font-mono font-medium">
          {service &&
            formatPrice(
              service.priceMinorUnits,
              service.currency,
              site.bookingSettings.locale,
            )}
        </p>
      </div>
      <FieldGroup className="gap-6 md:grid md:grid-cols-2 md:items-start md:gap-8">
        <Field>
          <FieldLabel className="hidden md:block">Датум</FieldLabel>
          <PublicBookingDatePicker
            site={site}
            selectedServiceId={selectedServiceId}
            selectedStaffId={selectedStaffId}
            selectedDate={selectedDate}
            onSelectDate={onSelectDate}
          />
        </Field>

        <Field>
          <FieldLabel>Слободни термини</FieldLabel>
          <FieldDescription>
            {formatBookingDateValue(selectedDate)}
          </FieldDescription>

          {slots === undefined ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
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
              role="group"
              aria-label="Слободни термини"
            >
              {slots.map((slot) => {
                const availableStaffId = slot.availableStaffIds[0];
                const isSelected = selectedSlotTimestamp === slot.startAt;

                return (
                  <button
                    key={slot.startAt}
                    type="button"
                    aria-pressed={isSelected}
                    disabled={!availableStaffId}
                    onClick={() =>
                      availableStaffId &&
                      onSelectSlot(slot.startAt, availableStaffId)
                    }
                    className={cn(
                      "min-h-12 rounded-xl border px-3 py-3 font-mono text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
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

      <div
        className="sticky bottom-0 z-20 -mx-4 flex items-center justify-between gap-3 border-t bg-background px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:static md:mx-0 md:rounded-2xl md:border md:p-5"
        data-booking-action-card="true"
      >
        <p className="min-w-0 text-sm" role="status" aria-live="polite">
          {selectedSlotTimestamp ? (
            <>
              <span className="block text-xs text-muted-foreground">
                Избрано време
              </span>
              <span className="font-mono text-lg font-semibold">
                {formatBookingTime(selectedSlotTimestamp)}
              </span>
            </>
          ) : (
            "Изберете време за да продолжите."
          )}
        </p>
        <Button
          type="button"
          size="lg"
          disabled={!selectedSlotTimestamp}
          onClick={onContinue}
          className="min-h-12 shrink-0"
        >
          Продолжи <ArrowRight data-icon="inline-end" />
        </Button>
      </div>
    </BookingStepShell>
  );
}
