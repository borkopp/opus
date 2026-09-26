"use client";

import { useState } from "react";
import { addDays, format, isBefore, startOfDay } from "date-fns";
import Image from "next/image";
import { useQuery } from "convex/react";
import {
  IconCalendar,
  IconClock,
  IconSparkles,
  IconCircleCheck,
  IconUser,
  IconUserCheck,
  IconPhone,
  IconMail,
  IconMessageCircle2,
  IconX,
  IconCalendarClock,
  IconChevronLeft,
  IconChevronRight,
  IconAlertTriangle,
  IconWand,
  IconUserX,
} from "@tabler/icons-react";
import { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Price } from "@/components/ui/price";
import { cn } from "@/lib/utils";
import { BookingView } from "./types";
import { bookingServiceLabel } from "./service-label";
import { getServiceTheme } from "./service-theme";
import { bookingDateKey, bookingTimeLabel } from "@/lib/booking-wall-clock";
import { getImageStorageUrl } from "@/lib/file-validation";
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
  className,
}: {
  booking: BookingView | null;
  onClose: () => void;
  onReschedule?: RescheduleHandler;
  onCancel?: BookingActionHandler;
  onComplete?: BookingActionHandler;
  onMarkNoShow?: BookingActionHandler;
  isUpdating?: boolean;
  className?: string;
}) {
  const { locale, t } = useDashboardI18n();
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState<Date | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  if (!booking) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-card/40 px-6 py-12 text-center select-none">
        <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-xs">
          <IconWand className="size-6 animate-pulse" />
        </div>
        <h3
          data-replay-public
          className="font-display text-lg font-bold text-foreground"
        >
          {t("Booking overview", "Преглед на термин")}
        </h3>
        <p
          data-replay-public
          className="mt-1.5 max-w-[240px] text-xs leading-relaxed text-muted-foreground"
        >
          {t(
            "Click on any appointment in the calendar to view details, client history, and manage the booking.",
            "Изберете термин во календарот за да ги видите деталите, историјата на клиентот и акциите.",
          )}
        </p>
      </div>
    );
  }

  const { customer, staff, startAt, endAt, source, status } = booking;
  const serviceName = bookingServiceLabel(booking, t("Service", "Услуга"));
  const theme = getServiceTheme(booking.service?.name || serviceName);

  const totalVisits = customer?.totalVisits ?? 0;
  const isAiBooked = source?.startsWith("ai_") ?? false;
  const isTerminal = ["completed", "cancelled", "no_show"].includes(status);
  const durationMins = Math.max(1, Math.round((endAt - startAt) / 60000));

  const customerAvatarUrl = getImageStorageUrl(customer?.avatarUrl);
  const staffAvatarUrl = getImageStorageUrl(staff?.avatarUrl);

  const getStatusBadge = () => {
    switch (status) {
      case "completed":
        return (
          <span
            data-replay-public
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
          >
            <IconCircleCheck className="size-3.5" />
            {t("Completed", "Завршен")}
          </span>
        );
      case "cancelled":
        return (
          <span
            data-replay-public
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border"
          >
            <IconX className="size-3.5" />
            {t("Cancelled", "Откажан")}
          </span>
        );
      case "no_show":
        return (
          <span
            data-replay-public
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30"
          >
            <IconAlertTriangle className="size-3.5" />
            {t("No Show", "Не се појави")}
          </span>
        );
      case "confirmed":
      default:
        return (
          <span
            data-replay-public
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20"
          >
            <span className="size-2 rounded-full bg-primary animate-pulse" />
            {t("Confirmed", "Потврден")}
          </span>
        );
    }
  };

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col rounded-2xl border border-border/80 bg-card/95 text-foreground shadow-sm backdrop-blur-xl overflow-hidden",
        className,
      )}
    >
      {/* 1. Header: Customer Identity */}
      <div className="flex shrink-0 items-start justify-between border-b border-border/70 p-5 bg-muted/10">
        <div className="flex min-w-0 items-center gap-3.5">
          <div className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-border bg-gradient-to-br from-muted to-muted/40 text-foreground font-bold shadow-xs">
            {customerAvatarUrl ? (
              <Image
                src={customerAvatarUrl}
                alt={customer?.name || "Customer"}
                width={48}
                height={48}
                className="h-full w-full object-cover"
                unoptimized
              />
            ) : (
              <span className="text-base font-display font-semibold">
                {customer?.name?.charAt(0) || (
                  <IconUser className="size-5 text-muted-foreground" />
                )}
              </span>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate font-display text-base font-bold text-foreground">
                {customer?.name ?? t("Unknown customer", "Непознат клиент")}
              </h2>
              {totalVisits >= 5 && (
                <span
                  data-replay-public
                  className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 shrink-0 uppercase tracking-wider"
                >
                  VIP
                </span>
              )}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 font-medium">
                <IconUserCheck className="size-3.5 text-primary/80" />
                {totalVisits > 0
                  ? t(
                      `${totalVisits} previous ${totalVisits === 1 ? "visit" : "visits"}`,
                      `${totalVisits} ${totalVisits === 1 ? "претходна посета" : "претходни посети"}`,
                    )
                  : t("New client", "Нов клиент")}
              </span>

              {customer?.phone && (
                <>
                  <span data-replay-public className="opacity-30">
                    ·
                  </span>
                  <a
                    href={`tel:${customer.phone}`}
                    className="inline-flex items-center gap-1 font-mono hover:text-foreground hover:underline transition-colors"
                  >
                    <IconPhone className="size-3 text-muted-foreground" />
                    {customer.phone}
                  </a>
                </>
              )}

              {customer?.email && (
                <>
                  <span data-replay-public className="opacity-30">
                    ·
                  </span>
                  <a
                    href={`mailto:${customer.email}`}
                    className="inline-flex items-center gap-1 hover:text-foreground hover:underline transition-colors"
                    title={customer.email}
                  >
                    <IconMail className="size-3 text-muted-foreground" />
                    <span className="max-w-[130px] truncate">
                      {customer.email}
                    </span>
                  </a>
                </>
              )}
            </div>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label={t("Close booking details", "Затвори детали за термин")}
          className="size-8 shrink-0 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <IconX className="size-4" />
        </Button>
      </div>

      {/* 2. Scrollable Body */}
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {/* Service Hero Card: Themed visually to match the timeline slot */}
        <section
          className={cn(
            "relative rounded-xl border p-4 transition-all duration-150 overflow-hidden shadow-xs",
            theme.cardBg,
            theme.cardBorder,
          )}
        >
          <div
            className={cn(
              "absolute left-0 top-0 bottom-0 w-1.5",
              status === "cancelled"
                ? "bg-muted-foreground/30"
                : status === "no_show"
                  ? "bg-rose-500"
                  : theme.accentBar,
            )}
          />

          <div className="pl-1.5">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <p className="text-[10.5px] font-bold uppercase tracking-wider opacity-70 mb-0.5">
                  {theme.name}
                </p>
                <h3 className="font-display text-lg font-bold leading-snug text-foreground">
                  {serviceName}
                </h3>
              </div>
              {getStatusBadge()}
            </div>

            <div className="mt-3.5 pt-3 border-t border-border/40 flex items-center justify-between">
              <div>
                <span
                  data-replay-public
                  className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block"
                >
                  {t("Price", "Цена")}
                </span>
                <Price
                  amount={booking.priceMinorUnits}
                  className="font-mono text-base font-bold text-foreground"
                />
              </div>

              <div className="text-right">
                <span
                  data-replay-public
                  className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block"
                >
                  {t("Duration", "Времетраење")}
                </span>
                <span className="font-mono text-sm font-semibold text-foreground">
                  {durationMins} {t("min", "мин")}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Schedule & Staff Card (Clean combined information) */}
        <section className="rounded-xl border border-border/70 bg-card p-4 space-y-3 shadow-xs">
          <div className="grid grid-cols-2 gap-3 pb-3 border-b border-border/50">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1">
                <IconCalendar className="size-3.5 text-primary" />
                <span data-replay-public>{t("Date", "Датум")}</span>
              </div>
              <p className="text-sm font-semibold text-foreground capitalize">
                {formatBookingDate(startAt, locale)}
              </p>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1">
                <IconClock className="size-3.5 text-primary" />
                <span data-replay-public>{t("Time slot", "Време")}</span>
              </div>
              <p className="font-mono text-sm font-bold text-foreground tabular-nums">
                {bookingTimeLabel(startAt)} – {bookingTimeLabel(endAt)}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-0.5">
            <span
              data-replay-public
              className="text-xs font-medium text-muted-foreground"
            >
              {t("Specialist", "Специјалист")}
            </span>
            <div className="flex items-center gap-2">
              <div className="size-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold overflow-hidden">
                {staffAvatarUrl ? (
                  <Image
                    src={staffAvatarUrl}
                    alt={staff?.displayName || "Staff"}
                    width={24}
                    height={24}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                ) : (
                  staff?.displayName?.charAt(0) || "S"
                )}
              </div>
              <span className="text-sm font-bold text-foreground">
                {staff?.displayName ?? t("Staff member", "Член на тим")}
              </span>
            </div>
          </div>
        </section>

        {/* Customer Note: Warm Quote Aesthetic */}
        {booking.customerNote && (
          <section className="rounded-xl border border-amber-300/60 dark:border-amber-900/50 bg-amber-500/[0.06] dark:bg-amber-500/[0.10] p-4">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-200 mb-1.5">
              <IconMessageCircle2 className="size-4 text-amber-600 dark:text-amber-400" />
              <span data-replay-public>
                {t("Customer note", "Белешка од клиент")}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-foreground italic font-medium">
              &ldquo;{booking.customerNote}&rdquo;
            </p>
          </section>
        )}

        {/* AI Booking Badge */}
        {isAiBooked && (
          <section className="flex gap-3 rounded-xl border border-primary/25 bg-primary/[0.06] p-3.5 text-foreground">
            <div className="size-8 rounded-lg bg-primary/15 flex items-center justify-center text-primary shrink-0">
              <IconSparkles className="size-4" />
            </div>
            <div>
              <p
                data-replay-public
                className="text-xs font-bold text-foreground flex items-center gap-1.5"
              >
                {t("AI-assisted booking", "Закажано преку AI Рецепција")}
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-primary/20 text-primary uppercase">
                  {source?.replace("ai_", "")}
                </span>
              </p>
              <p
                data-replay-public
                className="mt-1 text-xs leading-relaxed text-muted-foreground"
              >
                {t(
                  "Appointment confirmed via automated assistant chat with customer.",
                  "Терминот е автоматски потврден преку дигиталниот асистент.",
                )}
              </p>
            </div>
          </section>
        )}
      </div>

      {/* 3. Reschedule Drawer */}
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

      {/* 4. Action Footer */}
      <div className="flex shrink-0 flex-col gap-2.5 border-t border-border/70 p-4 bg-muted/10">
        {!isTerminal && (
          <div className="flex flex-col gap-2">
            <Button
              data-replay-public
              className="w-full gap-2 font-semibold shadow-xs"
              onClick={() => onComplete?.(booking._id)}
              disabled={!onComplete || isUpdating}
            >
              <IconCircleCheck className="size-4" />
              {t("Complete booking", "Заврши термин")}
            </Button>

            <div className="grid grid-cols-2 gap-2">
              <Button
                data-replay-public
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => onMarkNoShow?.(booking._id)}
                disabled={!onMarkNoShow || isUpdating}
              >
                <IconUserX className="size-3.5" />
                {t("No-show", "Не се појави")}
              </Button>
              <Button
                data-replay-public
                variant={confirmingCancel ? "destructive" : "ghost"}
                size="sm"
                className={cn(
                  "gap-1.5 text-xs",
                  !confirmingCancel &&
                    "text-muted-foreground hover:text-destructive",
                )}
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
                <IconX className="size-3.5" />
                {confirmingCancel
                  ? t("Confirm cancel?", "Сигурно?")
                  : t("Cancel", "Откажи")}
              </Button>
            </div>
          </div>
        )}

        <Button
          data-replay-public
          variant={
            showReschedule ? "secondary" : isTerminal ? "outline" : "outline"
          }
          className="w-full gap-2 text-xs font-semibold"
          onClick={() => setShowReschedule((visible) => !visible)}
          disabled={!onReschedule || isUpdating}
        >
          <IconCalendarClock className="size-4 text-primary" />
          {showReschedule
            ? t("Close rescheduler", "Затвори презакажување")
            : t("Reschedule appointment", "Презакажи термин")}
        </Button>
      </div>
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
    <div className="border-t border-border bg-background/90 px-4 py-3.5 backdrop-blur-md">
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
          <IconClock className="size-4 text-primary" />
          <span data-replay-public>
            {t("Choose a new time", "Изберете ново време")}
          </span>
        </div>
        <span className="font-mono text-[11px] font-semibold text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
          {Math.round((booking.endAt - booking.startAt) / 60_000)}{" "}
          {t("min", "мин")}
        </span>
      </div>

      <div className="mb-3 flex items-center justify-between rounded-lg border border-border bg-card p-1">
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          aria-label={t("Previous day", "Претходен ден")}
          onClick={() => {
            const previousDate = addDays(bookingDate, -1);
            if (!isBefore(previousDate, startOfDay(new Date()))) {
              onDateChange(previousDate);
              setSelectedStartAt(null);
            }
          }}
        >
          <IconChevronLeft className="size-4" />
        </Button>
        <span className="font-display text-xs font-bold text-foreground capitalize">
          {formatRescheduleDate(bookingDate, locale)}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          aria-label={t("Next day", "Следен ден")}
          onClick={() => {
            onDateChange(addDays(bookingDate, 1));
            setSelectedStartAt(null);
          }}
        >
          <IconChevronRight className="size-4" />
        </Button>
      </div>

      <div className="max-h-36 overflow-y-auto pr-1">
        <div className="grid grid-cols-4 gap-1.5">
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
                "rounded-lg border px-1 py-1.5 font-mono text-[11px] font-bold transition-all",
                selectedStartAt === slot.startAt
                  ? "border-primary bg-primary text-primary-foreground shadow-xs"
                  : "border-border/70 bg-card hover:border-primary/40 hover:bg-muted text-foreground",
              )}
            >
              {bookingTimeLabel(slot.startAt)}
            </button>
          ))}
        </div>
        {availableSlots === undefined && (
          <p
            data-replay-public
            className="py-3 text-center text-xs text-muted-foreground"
          >
            {t("Loading available times…", "Вчитување слободни термини…")}
          </p>
        )}
        {availableSlots?.length === 0 && (
          <p
            data-replay-public
            className="py-3 text-center text-xs text-muted-foreground"
          >
            {t(
              "No available times on this date.",
              "Нема слободни термини на овој датум.",
            )}
          </p>
        )}
      </div>

      <Button
        data-replay-public
        size="sm"
        className="mt-3 w-full font-semibold"
        disabled={!selectedStartAt}
        onClick={handleConfirm}
      >
        {t("Confirm new time", "Потврди ново време")}
      </Button>
    </div>
  );
}
