"use client";

import { useState, useCallback, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { startOfDay } from "date-fns";
import { IconCalendarOff } from "@tabler/icons-react";
import { toast } from "sonner";
import { BookingsHorizontalTimeline } from "./BookingsHorizontalTimeline";
import { BookingsTimeline } from "./BookingsTimeline";
import { BookingsList } from "./BookingsList";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  BookingsToolbar,
  type BookingStatusFilter,
  type BookingViewVariant,
} from "./BookingsToolbar";
import { BookingView, StaffView } from "./types";
import { useQuickBooking } from "./QuickBookingProvider";
import {
  dateKey,
  isBookingOnDate,
  dateFromKey,
} from "@/lib/booking-wall-clock";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import {
  getBookingDateCounts,
  isVisibleCalendarBooking,
} from "@/lib/booking-calendar";

export function BookingsSplitView({
  bookings,
  staffMembers,
  orgId,
}: {
  bookings: BookingView[];
  staffMembers: StaffView[];
  orgId: Id<"orgs">;
}) {
  const { t } = useDashboardI18n();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const isMobile = !isDesktop;
  const [mobileVariant, setMobileVariant] = useState<"vertical" | "list">(
    "list",
  );
  const [mobileStaffId, setMobileStaffId] = useState<string>("");
  const activeStaffId = staffMembers.some(
    (staff) => staff._id === mobileStaffId,
  )
    ? mobileStaffId
    : (staffMembers[0]?._id ?? "");
  const rescheduleBooking = useMutation(api.bookings.rescheduleBooking);
  const cancelBooking = useMutation(api.bookings.cancelBooking);
  const completeBooking = useMutation(api.bookings.completeBooking);
  const markNoShow = useMutation(api.bookings.markNoShow);
  const { openQuickBooking } = useQuickBooking();

  const [selectedBookingId, setSelectedBookingId] =
    useState<Id<"bookings"> | null>(() => {
      if (typeof window === "undefined") return null;
      const requested = new URLSearchParams(window.location.search).get(
        "booking",
      );
      return bookings.find((booking) => booking._id === requested)?._id ?? null;
    });
  const [currentDate, setCurrentDate] = useState(() => {
    if (typeof window !== "undefined") {
      const requested = new URLSearchParams(window.location.search).get("date");
      if (requested) {
        const parsed = dateFromKey(requested);
        if (parsed) return startOfDay(parsed);
      }
    }
    return startOfDay(new Date());
  });
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
    setSelectedBookingId(null);
    if (isMobile) {
      if (variant !== "horizontal") setMobileVariant(variant);
      return;
    }
    setViewVariant(variant);
    if (typeof window !== "undefined") {
      localStorage.setItem("opus_bookings_timeline_variant", variant);
    }
  };

  const activeVariant: BookingViewVariant = isMobile
    ? mobileVariant
    : viewVariant;
  const [statusFilter, setStatusFilter] = useState<BookingStatusFilter>("all");
  const bookingDateCounts = useMemo(
    () => getBookingDateCounts(bookings),
    [bookings],
  );

  const quickBookingSlots = useQuery(api.slots.getQuickBookingSlots, {
    orgId,
    date: dateKey(currentDate),
  });

  // Exclude bookings that were cancelled as part of a reschedule
  const todayBookings = bookings.filter(
    (b) =>
      isBookingOnDate(b.startAt, currentDate) && isVisibleCalendarBooking(b),
  );

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
    <div className="dashboard-calendar-surface flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-card">
      <BookingsToolbar
        currentDate={currentDate}
        bookingDateCounts={bookingDateCounts}
        onDateChange={(date) => {
          setSelectedBookingId(null);
          setCurrentDate(date);
        }}
        onNewBooking={() => openQuickBooking({ date: currentDate })}
        isMobile={isMobile}
        variant={activeVariant}
        onVariantChange={handleVariantChange}
        status={statusFilter}
        onStatusChange={(value) => {
          setSelectedBookingId(null);
          setStatusFilter(value);
        }}
        staffMembers={staffMembers}
        staffId={activeStaffId}
        onStaffChange={(value) => {
          setSelectedBookingId(null);
          setMobileStaffId(value);
        }}
      />

      {/* Content Area */}
      <div
        data-scroll-container
        className="relative min-h-0 flex-1 overflow-auto overscroll-contain bg-card"
      >
        {staffMembers.length === 0 ? (
          <div className="min-h-64 h-full flex flex-col items-center justify-center text-center text-muted-foreground p-6 md:p-12">
            <IconCalendarOff className="h-10 w-10 mb-4 opacity-50" />
            <p
              data-replay-public
              className="font-semibold text-foreground text-base"
            >
              {t("No staff members found", "Не се пронајдени членови на тимот")}
            </p>
          </div>
        ) : activeVariant === "horizontal" ? (
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
            onMarkNoShow={(bookingId) => runBookingAction("no-show", bookingId)}
            currentDate={currentDate}
            quickBookingSlots={quickBookingSlots?.slots ?? []}
            slotDurationMins={quickBookingSlots?.slotDurationMins ?? 15}
            onQuickBooking={(slot) => openQuickBooking({ slot })}
          />
        ) : activeVariant === "vertical" ? (
          <BookingsTimeline
            bookings={filteredBookings}
            staffMembers={
              isMobile
                ? staffMembers.filter((staff) => staff._id === activeStaffId)
                : staffMembers
            }
            selectedBookingId={selectedBookingId}
            onSelectBooking={(id) =>
              setSelectedBookingId(id === selectedBookingId ? null : id)
            }
            onReschedule={handleReschedule}
            onComplete={(bookingId) => runBookingAction("complete", bookingId)}
            onCancel={(bookingId) => runBookingAction("cancel", bookingId)}
            onMarkNoShow={(bookingId) => runBookingAction("no-show", bookingId)}
            currentDate={currentDate}
            quickBookingSlots={quickBookingSlots?.slots ?? []}
            slotDurationMins={quickBookingSlots?.slotDurationMins ?? 15}
            onQuickBooking={(slot) => openQuickBooking({ slot })}
          />
        ) : filteredBookings.length === 0 ? (
          <div className="min-h-64 h-full flex flex-col items-center justify-center text-center text-muted-foreground p-6 md:p-12">
            <IconCalendarOff className="h-10 w-10 mb-4 opacity-30" />
            <p
              data-replay-public
              className="font-semibold text-foreground text-base"
            >
              {t("No bookings found", "Нема пронајдени термини")}
            </p>
            <p data-replay-public className="text-xs mt-1">
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
            onMarkNoShow={(bookingId) => runBookingAction("no-show", bookingId)}
          />
        )}
      </div>
    </div>
  );
}
