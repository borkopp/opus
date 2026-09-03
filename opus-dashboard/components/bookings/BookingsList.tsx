"use client";

import { useMemo } from "react";
import { differenceInMinutes } from "date-fns";
import { cn } from "@/lib/utils";
import { IconSparkles } from "@tabler/icons-react";
import { Price } from "@/components/ui/price";
import { Id } from "@/convex/_generated/dataModel";
import { BookingView } from "./types";
import { bookingServiceLabel } from "./service-label";
import { bookingTimeLabel } from "@/lib/booking-wall-clock";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";

export function BookingsList({
  bookings,
  selectedBookingId,
  onSelectBooking,
}: {
  bookings: BookingView[];
  selectedBookingId: Id<"bookings"> | null;
  onSelectBooking: (id: Id<"bookings"> | null) => void;
}) {
  const { t } = useDashboardI18n();

  const sortedBookings = useMemo(() => {
    return [...bookings].sort((a, b) => a.startAt - b.startAt);
  }, [bookings]);

  // Same mapping functions as the card for consistency, but optimized for list
  const getStatusIndicator = (
    status: string,
    isAi: boolean,
    isSelected: boolean,
  ) => {
    if (status === "completed") {
      return (
        <div
          className="h-2.5 w-2.5 rounded-full bg-success shadow-sm"
          title={t("Completed", "Завршен")}
        />
      );
    }
    if (status === "no_show") {
      return (
        <div
          className="h-2.5 w-2.5 rounded-full bg-danger shadow-sm"
          title={t("No Show", "Не се појави")}
        />
      );
    }
    if (status === "cancelled") {
      return (
        <div
          className="h-2.5 w-2.5 rounded-full bg-danger/50 shadow-sm"
          title={t("Cancelled", "Откажан")}
        />
      );
    }
    if (isAi) {
      return (
        <IconSparkles
          className="h-3.5 w-3.5 text-primary"
          title={t("AI Booked", "Закажано преку AI")}
        />
      );
    }
    return (
      <div
        className={cn(
          "h-2.5 w-2.5 rounded-full shadow-sm",
          isSelected ? "bg-primary" : "bg-warning",
        )}
        title={t("Upcoming", "Претстоен")}
      />
    );
  };

  return (
    <div className="flex flex-col w-full h-full p-2 gap-1.5 custom-scrollbar">
      {sortedBookings.map((booking) => {
        const start = new Date(booking.startAt);
        const end = new Date(booking.endAt);
        const duration = differenceInMinutes(end, start);

        const isSelected = selectedBookingId === booking._id;
        const isAiBooked = booking.source?.startsWith("ai_");

        return (
          <div
            key={booking._id}
            onClick={() => onSelectBooking(booking._id)}
            className={cn(
              "group flex items-center justify-between px-3 py-3 rounded-lg text-sm cursor-pointer hover:bg-muted/30 hover:border-border hover:shadow-m transition-all",
              isSelected
                ? "bg-muted/30 border-border/50 shadow-md ring-1 ring-primary/20"
                : "bg-card border-border/50 hover:border-primary/40 ",
            )}
          >
            <div className="flex items-center gap-4 flex-1">
              {/* 10:00 */}
              <div className="w-12 text-muted-foreground font-semibold text-[13px] text-right shrink-0">
                {bookingTimeLabel(booking.startAt)}
              </div>

              {/* Name */}
              <div className="w-36 font-semibold text-foreground truncate shrink-0">
                {booking.customer?.name || t("Unknown", "Непознат")}
              </div>

              {/* Service · Duration · Staff */}
              <div className="flex-1 flex items-center gap-2 text-muted-foreground text-[13px] truncate">
                <span
                  className={cn(
                    "truncate font-medium",
                    isSelected ? "text-foreground" : "",
                  )}
                >
                  {bookingServiceLabel(booking, t("Service", "Услуга"))}
                </span>
                <span>·</span>
                <span>
                  {duration}
                  {t("m", " мин")}
                </span>
                <span>·</span>
                <span className="truncate max-w-[120px]">
                  {booking.staff?.displayName || t("Staff", "Член на тим")}
                </span>
              </div>
            </div>

            {/* Right Actions: Price and status */}
            <div className="flex items-center gap-4 shrink-0 justify-end ml-4">
              <div className="font-semibold text-foreground w-12 text-right">
                <Price
                  amount={booking.priceMinorUnits || 0}
                  showDecimals={false}
                />
              </div>

              <div className="w-6 flex justify-end">
                {getStatusIndicator(booking.status, isAiBooked, isSelected)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
