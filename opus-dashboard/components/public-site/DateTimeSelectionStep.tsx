"use client";

import { useQuery } from "convex/react";
import { ArrowRight, CalendarDays } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatBookingDateValue,
  formatBookingTime,
} from "@/lib/public-booking-format";
import { cn } from "@/lib/utils";
import { PublicBookingDatePicker } from "./PublicBookingDatePicker";
import { BookingStepShell } from "./BookingStepShell";
import { BookingSummary } from "./BookingSummary";
import { usePublicBookingI18n } from "./PublicBookingI18n";
import type { PublicSite } from "./types";

interface DateTimeSelectionStepProps {
  site: PublicSite;
  selectedStaffId: string | "any";
  selectedServiceId: string;
  selectedDate: string;
  selectedSlotTimestamp: number | null;
  selectedSlotStaffId: string | null;
  onSelectDate: (date: string) => void;
  onSelectSlot: (startAt: number, staffId: string) => void;
  onContinue: () => void;
  onBack: () => void;
  sharedOpeningStartAt?: number;
}

export function DateTimeSelectionStep({
  site,
  selectedStaffId,
  selectedServiceId,
  selectedDate,
  selectedSlotTimestamp,
  selectedSlotStaffId,
  onSelectDate,
  onSelectSlot,
  onContinue,
  onBack,
  sharedOpeningStartAt,
}: DateTimeSelectionStepProps) {
  const { text, locale } = usePublicBookingI18n();
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
  const selectedSlot = slots?.find(
    (slot) =>
      slot.startAt === selectedSlotTimestamp &&
      selectedSlotStaffId &&
      (slot.availableStaffIds as string[]).includes(selectedSlotStaffId),
  );
  const assignedStaff = selectedSlot
    ? site.staff.find((member) => member._id === selectedSlotStaffId)
    : null;

  return (
    <BookingStepShell
      title={text("Изберете датум и време")}
      description={text("Изберете слободен датум, па време што ви одговара.")}
      backLabel={text("Назад кон специјалисти")}
      onBack={onBack}
      summary={
        service && (
          <BookingSummary
            serviceName={service.name}
            durationMins={service.durationMins}
            priceMinorUnits={service.priceMinorUnits}
            currency={service.currency}
            staffName={
              staff?.displayName ||
              assignedStaff?.displayName ||
              text("Без претпочитан специјалист")
            }
            startAt={selectedSlot?.startAt}
          />
        )
      }
    >
      <div className="grid min-w-0 gap-4 md:grid-cols-2">
        <Card className="min-w-0 rounded-2xl" data-booking-date-panel>
          <CardHeader>
            <CardTitle>
              <h2>{text("Датум")}</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PublicBookingDatePicker
              site={site}
              selectedServiceId={selectedServiceId}
              selectedStaffId={selectedStaffId}
              selectedDate={selectedDate}
              onSelectDate={onSelectDate}
            />
          </CardContent>
        </Card>
        <Card
          className="min-w-0 rounded-2xl"
          data-booking-time-panel
          aria-busy={slots === undefined}
        >
          <CardHeader>
            <CardTitle>
              <h2>{text("Слободни термини")}</h2>
            </CardTitle>
            <CardDescription>
              {formatBookingDateValue(selectedDate, locale)}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {sharedOpeningStartAt && slots !== undefined && (
              <Alert>
                <AlertDescription>
                  {slots.some((slot) => slot.startAt === sharedOpeningStartAt)
                    ? text(
                        "Терминот од објавата е во {v0}. Изберете го времето за да продолжите.",
                        { v0: formatBookingTime(sharedOpeningStartAt) },
                      )
                    : text(
                        "Терминот од објавата веќе не е достапен за овој избор. Изберете друго слободно време или датум.",
                      )}
                </AlertDescription>
              </Alert>
            )}
            {selectedSlotTimestamp && slots !== undefined && !selectedSlot && (
              <Alert>
                <AlertDescription>
                  {text(
                    "Овој термин повеќе не е достапен. Изберете друг термин.",
                  )}
                </AlertDescription>
              </Alert>
            )}
            {slots === undefined ? (
              <div
                className="grid grid-cols-3 gap-2 min-[320px]:grid-cols-4"
                role="status"
                aria-label={text("Ги проверуваме слободните термини…")}
              >
                {Array.from({ length: 8 }).map((_, index) => (
                  <Skeleton key={index} className="h-12 w-full rounded-xl" />
                ))}
              </div>
            ) : slots.length === 0 ? (
              <Empty className="px-0 py-6">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <CalendarDays />
                  </EmptyMedia>
                  <EmptyTitle>{text("Нема слободни термини")}</EmptyTitle>
                  <EmptyDescription>
                    {text(
                      "Изберете друг датум или вратете се и сменете го специјалистот.",
                    )}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div
                className="grid grid-cols-3 gap-2 min-[320px]:grid-cols-4"
                role="group"
                aria-label={text("Слободни термини")}
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
                        "min-h-12 min-w-0 rounded-xl border px-2 py-3 text-sm font-medium tabular-nums transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card hover:border-primary/40 hover:bg-accent",
                      )}
                    >
                      {formatBookingTime(slot.startAt)}
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <div
        className="sticky bottom-0 z-20 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t bg-background/95 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-lg lg:mx-0 lg:rounded-2xl lg:border lg:p-4"
        data-booking-action-card
      >
        <p className="min-w-0 flex-1 text-sm" role="status" aria-live="polite">
          {selectedSlot ? (
            <>
              <span className="block text-xs text-muted-foreground">
                {text("Избрано време")}
              </span>
              <span className="font-semibold tabular-nums">
                {formatBookingTime(selectedSlot.startAt)}
              </span>
            </>
          ) : (
            text("Изберете време за да продолжите.")
          )}
        </p>
        <Button
          type="button"
          size="lg"
          disabled={!selectedSlot}
          onClick={onContinue}
          className="min-h-12 shrink-0"
        >
          {text("Продолжи")}
          <ArrowRight data-icon="inline-end" />
        </Button>
      </div>
    </BookingStepShell>
  );
}
