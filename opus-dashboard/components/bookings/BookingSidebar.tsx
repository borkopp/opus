"use client";

import { useState } from "react";
import { addDays, format, isBefore, startOfDay } from "date-fns";
import Image from "next/image";
import { useQuery } from "convex/react";
import {
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
  User,
  UserX,
  WandSparkles,
  X,
} from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Price } from "@/components/ui/price";
import { cn } from "@/lib/utils";
import { BookingView } from "./types";
import { bookingServiceLabel } from "./service-label";
import { bookingDateKey, bookingTimeLabel } from "@/lib/booking-wall-clock";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";

function formatBookingDate(timestamp: number, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(timestamp));
}

function formatRescheduleDate(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

type RescheduleHandler = (
  bookingId: Id<"bookings">,
  newStartAt: number,
) => Promise<boolean>;
type BookingActionHandler = (bookingId: Id<"bookings">) => void;

export function BookingSidebar({
  booking,
  onClose,
  onReschedule,
  onCancel,
  onComplete,
  onMarkNoShow,
  isUpdating = false,
}: {
  booking: BookingView | null;
  onClose: () => void;
  onReschedule?: RescheduleHandler;
  onCancel?: BookingActionHandler;
  onComplete?: BookingActionHandler;
  onMarkNoShow?: BookingActionHandler;
  isUpdating?: boolean;
}) {
  const { locale, t } = useDashboardI18n();
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState<Date | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  if (!booking) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-xl px-6 py-10 text-center">
        <div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <WandSparkles className="h-6 w-6" />
        </div>
        <h3 className="font-display text-xl font-semibold">
          {t("Smart schedule", "Паметен распоред")}
        </h3>
        <p className="mt-2 max-w-[260px] text-sm leading-relaxed text-muted-foreground">
          {t(
            "Select a booking to see the customer, service, status, and appointment actions.",
            "Изберете термин за да ги видите клиентот, услугата, статусот и акциите за закажување.",
          )}
        </p>
      </div>
    );
  }

  const { customer, staff, startAt, endAt, source, status } = booking;
  const totalVisits = customer?.totalVisits ?? 0;
  const isAiBooked = source?.startsWith("ai_") ?? false;
  const isTerminal = ["completed", "cancelled", "no_show"].includes(status);

  const getStatusLabel = (s: string) => {
    switch (s) {
      case "confirmed":
        return t("Confirmed", "Потврден");
      case "pending":
        return t("Pending", "На чекање");
      case "completed":
        return t("Completed", "Завршен");
      case "cancelled":
        return t("Cancelled", "Откажан");
      case "no_show":
        return t("No show", "Не се појави");
      default:
        return s.replace("_", " ");
    }
  };

  return (
    <div className="flex h-full w-full flex-col rounded-xl bg-card/80 text-foreground backdrop-blur-3xl">
      <div className="flex shrink-0 items-start justify-between border-b border-border p-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
            {customer?.avatarUrl ? (
              <Image
                src={customer.avatarUrl}
                alt={customer.name}
                width={44}
                height={44}
                className="h-full w-full object-cover"
              />
            ) : (
              customer?.name?.charAt(0) || (
                <User className="h-5 w-5 text-muted-foreground" />
              )
            )}
          </div>
          <div className="min-w-0">
            <h2 className="truncate font-semibold">
              {customer?.name ?? t("Unknown customer", "Непознат клиент")}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {totalVisits > 0
                ? t(
                    `${totalVisits} previous ${totalVisits === 1 ? "visit" : "visits"}`,
                    `${totalVisits} ${totalVisits === 1 ? "претходна посета" : "претходни посети"}`,
                  )
                : t("New customer", "Нов клиент")}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label={t("Close booking details", "Затвори детали за термин")}
          className="h-8 w-8 shrink-0 rounded-full"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        <section className="grid grid-cols-2 gap-3">
          <Detail
            label={t("Date", "Датум")}
            value={formatBookingDate(startAt, locale)}
          />
          <Detail
            label={t("Time", "Време")}
            value={`${bookingTimeLabel(startAt)}–${bookingTimeLabel(endAt)}`}
          />
          <Detail
            label={t("Service", "Услуга")}
            value={bookingServiceLabel(booking, t("Service", "Услуга"))}
          />
          <Detail
            label={t("Professional", "Специјалист")}
            value={staff?.displayName ?? t("Staff", "Член на тим")}
          />
        </section>

        <section className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-4 py-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {t("Booking value", "Вредност на термин")}
            </p>
            <p className="mt-1 font-semibold">
              <Price amount={booking.priceMinorUnits} />
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {t("Status", "Статус")}
            </p>
            <p className="mt-1 text-sm font-semibold capitalize">
              {getStatusLabel(status)}
            </p>
          </div>
        </section>

        {booking.customerNote && (
          <section className="rounded-xl border border-border bg-muted/20 px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {t("Customer note", "Белешка од клиент")}
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
              {booking.customerNote}
            </p>
          </section>
        )}

        {isAiBooked && (
          <section className="flex gap-3 rounded-lg border border-primary/20 bg-accent p-3 text-foreground">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="text-sm font-semibold">
                {t("AI-assisted booking", "Закажано преку AI")}
              </p>
              <p className="mt-1 text-xs leading-relaxed opacity-75">
                {t(
                  "The front desk created this appointment from a customer conversation.",
                  "Рецепцијата го креираше овој термин од разговор со клиентот.",
                )}
              </p>
            </div>
          </section>
        )}
      </div>

      {showReschedule && (
        <ReschedulePanel
          booking={booking}
          rescheduleDate={rescheduleDate}
          onDateChange={setRescheduleDate}
          onConfirm={async (newStartAt) => {
            const changed = await onReschedule?.(booking._id, newStartAt);
            if (changed) {
              setShowReschedule(false);
              setRescheduleDate(null);
            }
          }}
        />
      )}

      <div className="flex shrink-0 flex-col gap-2 border-t border-border p-4">
        {!isTerminal && (
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="col-span-2"
              onClick={() => onComplete?.(booking._id)}
              disabled={!onComplete || isUpdating}
            >
              <CheckCircle2 data-icon="inline-start" />
              {t("Complete booking", "Заврши термин")}
            </Button>
            <Button
              variant="outline"
              onClick={() => onMarkNoShow?.(booking._id)}
              disabled={!onMarkNoShow || isUpdating}
            >
              <UserX data-icon="inline-start" />
              {t("No-show", "Не се појави")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!confirmingCancel) {
                  setConfirmingCancel(true);
                  return;
                }
                onCancel?.(booking._id);
                setConfirmingCancel(false);
              }}
              disabled={!onCancel || isUpdating}
            >
              {confirmingCancel
                ? t("Confirm cancel", "Потврди откажување")
                : t("Cancel booking", "Откажи термин")}
            </Button>
          </div>
        )}
        <Button
          variant={showReschedule ? "secondary" : "default"}
          className="w-full gap-2"
          onClick={() => setShowReschedule((visible) => !visible)}
          disabled={!onReschedule || isUpdating || isTerminal}
        >
          <CalendarClock className="h-4 w-4" />
          {showReschedule
            ? t("Close rescheduler", "Затвори презакажување")
            : t("Reschedule booking", "Презакажи термин")}
        </Button>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 px-3 py-3">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}

function ReschedulePanel({
  booking,
  rescheduleDate,
  onDateChange,
  onConfirm,
}: {
  booking: BookingView;
  rescheduleDate: Date | null;
  onDateChange: (date: Date | null) => void;
  onConfirm: (newStartAt: number) => Promise<void>;
}) {
  const { locale, t } = useDashboardI18n();
  const [selectedStartAt, setSelectedStartAt] = useState<number | null>(null);
  const bookingStart = new Date(`${bookingDateKey(booking.startAt)}T12:00:00`);
  const bookingDate = rescheduleDate ?? startOfDay(bookingStart);
  const date = format(bookingDate, "yyyy-MM-dd");
  const availableSlots = useQuery(api.slots.getAvailableSlots, {
    orgId: booking.orgId,
    staffId: booking.staffId,
    serviceId: booking.serviceId,
    date,
  });

  const handleConfirm = async () => {
    if (!selectedStartAt) return;
    await onConfirm(selectedStartAt);
  };

  return (
    <div className="border-t border-border bg-background/70 px-4 py-3">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Clock className="size-4 text-muted-foreground" />
          {t("Choose a new time", "Изберете ново време")}
        </div>
        <span className="text-xs text-muted-foreground">
          {Math.round((booking.endAt - booking.startAt) / 60_000)}{" "}
          {t("min", "мин")}
        </span>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label={t("Previous day", "Претходен ден")}
          onClick={() => {
            const previousDate = addDays(bookingDate, -1);
            if (!isBefore(previousDate, startOfDay(new Date()))) {
              onDateChange(previousDate);
              setSelectedStartAt(null);
            }
          }}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="flex-1 text-center text-sm font-semibold">
          {formatRescheduleDate(bookingDate, locale)}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label={t("Next day", "Следен ден")}
          onClick={() => {
            onDateChange(addDays(bookingDate, 1));
            setSelectedStartAt(null);
          }}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="max-h-40 overflow-y-auto">
        <div className="grid grid-cols-4 gap-1">
          {availableSlots?.map((slot) => (
            <button
              key={slot.startAt}
              type="button"
              onClick={() => setSelectedStartAt(slot.startAt)}
              aria-label={t(
                `Select ${bookingTimeLabel(slot.startAt)}`,
                `Избери ${bookingTimeLabel(slot.startAt)}`,
              )}
              className={cn(
                "rounded-md border px-1 py-1.5 text-[11px] font-medium transition-colors",
                selectedStartAt === slot.startAt
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:bg-muted",
              )}
            >
              {bookingTimeLabel(slot.startAt)}
            </button>
          ))}
        </div>
        {availableSlots === undefined && (
          <p className="py-4 text-center text-xs text-muted-foreground">
            {t("Loading available times…", "Вчитување слободни термини…")}
          </p>
        )}
        {availableSlots?.length === 0 && (
          <p className="py-4 text-center text-xs text-muted-foreground">
            {t(
              "No available times on this date.",
              "Нема слободни термини на овој датум.",
            )}
          </p>
        )}
      </div>

      <Button
        size="sm"
        className="mt-3 w-full"
        disabled={!selectedStartAt}
        onClick={handleConfirm}
      >
        {t("Confirm new time", "Потврди ново време")}
      </Button>
    </div>
  );
}
