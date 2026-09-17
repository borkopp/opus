"use client";

import { useState, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { startOfDay, addDays, subDays, isToday } from "date-fns";
import {
  IconPlus,
  IconChevronLeft,
  IconChevronRight,
  IconCalendarOff,
  IconLayoutList,
  IconLayoutColumns,
  IconLayoutRows,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { BookingsHorizontalTimeline } from "./BookingsHorizontalTimeline";
import { BookingsTimeline } from "./BookingsTimeline";
import { BookingsList } from "./BookingsList";
import { cn } from "@/lib/utils";
import { Price } from "@/components/ui/price";
import { BookingView, StaffView } from "./types";
import { useQuickBooking } from "./QuickBookingProvider";
import { dateKey, isBookingOnDate } from "@/lib/booking-wall-clock";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";

function formatHeaderDate(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function BookingsSplitView({
  bookings,
  staffMembers,
  orgId,
}: {
  bookings: BookingView[];
  staffMembers: StaffView[];
  orgId: Id<"orgs">;
}) {
  const { locale, t } = useDashboardI18n();
  const rescheduleBooking = useMutation(api.bookings.rescheduleBooking);
  const cancelBooking = useMutation(api.bookings.cancelBooking);
  const completeBooking = useMutation(api.bookings.completeBooking);
  const markNoShow = useMutation(api.bookings.markNoShow);
  const { openQuickBooking } = useQuickBooking();

  const [selectedBookingId, setSelectedBookingId] =
    useState<Id<"bookings"> | null>(null);
  const [currentDate, setCurrentDate] = useState(startOfDay(new Date()));
  const [viewVariant, setViewVariant] = useState<
    "horizontal" | "vertical" | "list"
  >(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("opus_bookings_timeline_variant");
      if (saved === "horizontal" || saved === "vertical" || saved === "list") {
        return saved;
      }
    }
    return "horizontal";
  });

  const handleVariantChange = (variant: "horizontal" | "vertical" | "list") => {
    setViewVariant(variant);
    if (typeof window !== "undefined") {
      localStorage.setItem("opus_bookings_timeline_variant", variant);
    }
  };

  const [statusFilter, setStatusFilter] = useState<
    "all" | "upcoming" | "completed" | "no-show"
  >("all");

  const quickBookingSlots = useQuery(api.slots.getQuickBookingSlots, {
    orgId,
    date: dateKey(currentDate),
  });

  // Exclude bookings that were cancelled as part of a reschedule
  const todayBookings = bookings.filter(
    (b) =>
      isBookingOnDate(b.startAt, currentDate) &&
      !(b.status === "cancelled" && b.cancellationReason === "Rescheduled"),
  );

  // Day Summary Calculations
  const totalBookingsCount = todayBookings.length;

  const projectedRevenueMinorUnits = todayBookings.reduce(
    (sum, b) =>
      b.status !== "cancelled" && b.status !== "no_show"
        ? sum + (b.priceMinorUnits || 0)
        : sum,
    0,
  );

  const completedValue = todayBookings.reduce((sum, b) => {
    if (b.status === "completed") {
      return sum + (b.priceMinorUnits || 0);
    }
    return sum;
  }, 0);

  // Filtering logic for the main view
  const filteredBookings = todayBookings.filter((b) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "completed") return b.status === "completed";
    if (statusFilter === "no-show") return b.status === "no_show";
    if (statusFilter === "upcoming") return b.status === "confirmed";
    return true;
  });

  // Reschedule handler
  const handleReschedule = useCallback(
    async (bookingId: Id<"bookings">, newStartAt: number) => {
      try {
        await rescheduleBooking({
          orgId,
          bookingId,
          newStartAt,
        });
        setSelectedBookingId(null);
        toast.success(t("Booking rescheduled", "Терминот е презакажан"));
        return true;
      } catch (error: unknown) {
        console.error("Reschedule failed:", error);
        toast.error(
          error instanceof Error
            ? error.message
            : t(
                "Failed to reschedule. The slot may conflict with another booking.",
                "Не успеа презакажувањето. Терминот може да се преклопува со друго закажување.",
              ),
        );
        return false;
      }
    },
    [rescheduleBooking, orgId, t],
  );

  const runBookingAction = useCallback(
    async (
      action: "cancel" | "complete" | "no-show",
      bookingId: Id<"bookings">,
    ) => {
      try {
        if (action === "cancel") {
          await cancelBooking({
            orgId,
            bookingId,
            reason: "Cancelled by business",
          });
        } else if (action === "complete") {
          await completeBooking({ orgId, bookingId });
        } else {
          await markNoShow({ orgId, bookingId });
        }
        const actionMessages = {
          cancel: t("Booking cancelled", "Терминот е откажан"),
          complete: t("Booking completed", "Терминот е завршен"),
          "no-show": t(
            "Booking marked as no-show",
            "Терминот е означен како неостварен",
          ),
        };
        toast.success(actionMessages[action]);
      } catch (error: unknown) {
        toast.error(
          error instanceof Error
            ? error.message
            : t(
                "Could not update the booking.",
                "Не може да се ажурира терминот.",
              ),
        );
      }
    },
    [cancelBooking, completeBooking, markNoShow, orgId, t],
  );

  return (
    <div className="flex h-full min-w-0 flex-col gap-4">
      {/* Top Header: Title, Live Stats & Date Navigator */}
      <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <h1 className="text-2xl font-display font-semibold tracking-tight text-foreground sm:text-3xl">
            {t("Bookings", "Термини")}
          </h1>

          <div className="hidden xl:flex h-7 w-[1px] bg-border/60 mx-1" />

          {/* Quick Metrics */}
          <div className="hidden xl:flex items-center gap-3 text-sm">
            <div className="flex items-baseline gap-1.5">
              <span className="font-semibold text-foreground tracking-tight">
                {totalBookingsCount}
              </span>
              <span className="text-muted-foreground font-medium text-xs uppercase tracking-wider">
                {t("Bookings", "Термини")}
              </span>
            </div>

            <span className="text-border px-1">·</span>

            <div className="flex items-baseline gap-1.5 line-clamp-1">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 tracking-tight">
                <Price amount={completedValue} showDecimals={false} />
              </span>
              <span className="text-muted-foreground font-medium text-xs uppercase tracking-wider">
                <span className="lowercase font-normal opacity-70">
                  {t("completed", "завршени")} /{" "}
                  <Price
                    amount={projectedRevenueMinorUnits}
                    showDecimals={false}
                  />{" "}
                  {t("scheduled", "закажани")}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Date Navigator */}
          <div className="flex items-center gap-1 rounded-xl border border-border/50 bg-card p-1 shadow-2xs">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
              onClick={() => setCurrentDate(subDays(currentDate, 1))}
              aria-label={t("Previous day", "Претходен ден")}
            >
              <IconChevronLeft className="size-4" />
            </Button>

            {!isToday(currentDate) && (
              <button
                type="button"
                onClick={() => setCurrentDate(startOfDay(new Date()))}
                className="px-2 py-0.5 text-xs font-semibold rounded-md bg-muted/60 text-foreground hover:bg-muted transition-colors"
              >
                {t("Today", "Денес")}
              </button>
            )}

            <span className="text-xs font-semibold px-2 text-center select-none tracking-tight min-w-[105px]">
              {formatHeaderDate(currentDate, locale)}
            </span>

            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
              onClick={() => setCurrentDate(addDays(currentDate, 1))}
              aria-label={t("Next day", "Следен ден")}
            >
              <IconChevronRight className="size-4" />
            </Button>
          </div>

          {/* New Booking Action */}
          <Button
            variant="default"
            className="rounded-xl shadow-xs"
            onClick={() => openQuickBooking({ date: currentDate })}
          >
            <IconPlus data-icon="inline-start" />
            {t("New Booking", "Нов термин")}
          </Button>
        </div>
      </div>

      {/* Main Schedule Canvas Container */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/50 bg-card shadow-xs">
        {/* Action & Filter Toolbar */}
        <div className="p-2.5 sm:p-3 border-b border-border/40 flex flex-wrap justify-between items-center gap-3 bg-muted/[0.04]">
          {/* Left: Status Filter Pills */}
          <div className="flex items-center gap-1 overflow-hidden text-xs font-medium">
            <button
              onClick={() => setStatusFilter("all")}
              className={cn(
                "px-3 py-1.5 rounded-xl transition-all",
                statusFilter === "all"
                  ? "bg-foreground text-background font-semibold shadow-2xs"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              )}
            >
              {t("All", "Сите")}
            </button>
            <button
              onClick={() => setStatusFilter("upcoming")}
              className={cn(
                "px-3 py-1.5 rounded-xl transition-all",
                statusFilter === "upcoming"
                  ? "bg-foreground text-background font-semibold shadow-2xs"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              )}
            >
              {t("Upcoming", "Претстојни")}
            </button>
            <button
              onClick={() => setStatusFilter("completed")}
              className={cn(
                "px-3 py-1.5 rounded-xl transition-all",
                statusFilter === "completed"
                  ? "bg-foreground text-background font-semibold shadow-2xs"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              )}
            >
              {t("Completed", "Завршени")}
            </button>
            <button
              onClick={() => setStatusFilter("no-show")}
              className={cn(
                "px-3 py-1.5 rounded-xl transition-all",
                statusFilter === "no-show"
                  ? "bg-foreground text-background font-semibold shadow-2xs"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              )}
            >
              {t("No-Show", "Не се појави")}
            </button>
          </div>

          {/* Right: Variant Switcher Toggle (Horizontal / Vertical / List) */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center rounded-xl bg-muted/60 p-1 text-xs font-medium">
              <button
                type="button"
                onClick={() => handleVariantChange("horizontal")}
                title={t(
                  "Horizontal Timeline (Staff rows, Time columns)",
                  "Хоризонтален приказ (Тим редови, време колони)",
                )}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all text-xs font-medium",
                  viewVariant === "horizontal"
                    ? "bg-card text-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <IconLayoutColumns className="size-3.5" />
                <span>{t("Horizontal", "Хоризонтално")}</span>
              </button>

              <button
                type="button"
                onClick={() => handleVariantChange("vertical")}
                title={t(
                  "Vertical Timeline (Staff columns, Time rows)",
                  "Вертикален приказ (Тим колони, време редови)",
                )}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all text-xs font-medium",
                  viewVariant === "vertical"
                    ? "bg-card text-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <IconLayoutRows className="size-3.5" />
                <span>{t("Vertical", "Вертикално")}</span>
              </button>

              <button
                type="button"
                onClick={() => handleVariantChange("list")}
                title={t("List View", "Листа")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all text-xs font-medium",
                  viewVariant === "list"
                    ? "bg-card text-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <IconLayoutList className="size-3.5" />
                <span>{t("List", "Листа")}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div
          data-scroll-container
          className="flex-1 overflow-y-auto overflow-x-auto relative bg-background/50"
        >
          {staffMembers.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-12">
              <IconCalendarOff className="h-10 w-10 mb-4 opacity-50" />
              <p className="font-semibold text-foreground text-base">
                {t(
                  "No staff members found",
                  "Не се пронајдени членови на тимот",
                )}
              </p>
            </div>
          ) : viewVariant === "horizontal" ? (
            <BookingsHorizontalTimeline
              bookings={filteredBookings}
              staffMembers={staffMembers}
              selectedBookingId={selectedBookingId}
              onSelectBooking={(id) =>
                setSelectedBookingId(id === selectedBookingId ? null : id)
              }
              onReschedule={handleReschedule}
              onComplete={(bookingId) => runBookingAction("complete", bookingId)}
              onCancel={(bookingId) => runBookingAction("cancel", bookingId)}
              onMarkNoShow={(bookingId) =>
                runBookingAction("no-show", bookingId)
              }
              currentDate={currentDate}
              quickBookingSlots={quickBookingSlots?.slots ?? []}
              slotDurationMins={quickBookingSlots?.slotDurationMins ?? 15}
              onQuickBooking={(slot) => openQuickBooking({ slot })}
            />
          ) : viewVariant === "vertical" ? (
            <BookingsTimeline
              bookings={filteredBookings}
              staffMembers={staffMembers}
              selectedBookingId={selectedBookingId}
              onSelectBooking={(id) =>
                setSelectedBookingId(id === selectedBookingId ? null : id)
              }
              onReschedule={handleReschedule}
              onComplete={(bookingId) => runBookingAction("complete", bookingId)}
              onCancel={(bookingId) => runBookingAction("cancel", bookingId)}
              onMarkNoShow={(bookingId) =>
                runBookingAction("no-show", bookingId)
              }
              currentDate={currentDate}
              quickBookingSlots={quickBookingSlots?.slots ?? []}
              slotDurationMins={quickBookingSlots?.slotDurationMins ?? 15}
              onQuickBooking={(slot) => openQuickBooking({ slot })}
            />
          ) : filteredBookings.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-12">
              <IconCalendarOff className="h-10 w-10 mb-4 opacity-30" />
              <p className="font-semibold text-foreground text-base">
                {t("No bookings found", "Нема пронајдени термини")}
              </p>
              <p className="text-xs mt-1">
                {t(
                  "Try a different filter or date.",
                  "Обидете се со друг филтер или датум.",
                )}
              </p>
            </div>
          ) : (
            <BookingsList
              bookings={filteredBookings}
              staffMembers={staffMembers}
              selectedBookingId={selectedBookingId}
              onSelectBooking={(id) =>
                setSelectedBookingId(id === selectedBookingId ? null : id)
              }
              onComplete={(bookingId) => runBookingAction("complete", bookingId)}
              onCancel={(bookingId) => runBookingAction("cancel", bookingId)}
              onMarkNoShow={(bookingId) =>
                runBookingAction("no-show", bookingId)
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
