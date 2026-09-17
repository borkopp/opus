"use client";

import { useMemo } from "react";
import Image from "next/image";
import {
  IconSparkles,
  IconCircleCheck,
  IconAlertTriangle,
  IconX,
  IconClock,
  IconUser,
  IconPhone,
} from "@tabler/icons-react";
import { Price } from "@/components/ui/price";
import { Id } from "@/convex/_generated/dataModel";
import { BookingView, StaffView } from "./types";
import { bookingServiceLabel } from "./service-label";
import { bookingTimeLabel } from "@/lib/booking-wall-clock";
import { getServiceTheme, PILL_STRIPE_STYLE, MUTED_STRIPE_STYLE } from "./service-theme";
import { getImageStorageUrl } from "@/lib/file-validation";
import { BookingPopoverCard } from "./BookingPopoverCard";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { cn } from "@/lib/utils";

export function BookingsList({
  bookings,
  staffMembers = [],
  selectedBookingId,
  onSelectBooking,
  onComplete,
  onCancel,
  onMarkNoShow,
}: {
  bookings: BookingView[];
  staffMembers?: StaffView[];
  selectedBookingId: Id<"bookings"> | null;
  onSelectBooking: (id: Id<"bookings"> | null) => void;
  onComplete?: (bookingId: Id<"bookings">) => void;
  onCancel?: (bookingId: Id<"bookings">) => void;
  onMarkNoShow?: (bookingId: Id<"bookings">) => void;
}) {
  const { t } = useDashboardI18n();

  const sortedBookings = useMemo(() => {
    return [...bookings].sort((a, b) => a.startAt - b.startAt);
  }, [bookings]);

  const staffById = useMemo(() => {
    const map = new Map<Id<"staff_members">, StaffView>();
    for (const staff of staffMembers) {
      map.set(staff._id, staff);
    }
    return map;
  }, [staffMembers]);

  return (
    <div className="flex flex-col w-full h-full p-3 sm:p-5 gap-3 custom-scrollbar">
      {sortedBookings.map((booking) => {
        const startLabel = bookingTimeLabel(booking.startAt);
        const endLabel = bookingTimeLabel(booking.endAt);
        const serviceName = bookingServiceLabel(booking, t("Service", "Услуга"));
        const theme = getServiceTheme(booking.service?.name || serviceName);

        const isSelected = selectedBookingId === booking._id;
        const isAiBooked = Boolean(booking.source?.startsWith("ai_"));
        const isCompleted = booking.status === "completed";
        const isCancelled = booking.status === "cancelled";
        const isNoShow = booking.status === "no_show";

        const staffMember = staffById.get(booking.staffId) ?? booking.staff;
        const staffAvatarUrl = staffMember?.avatarUrl
          ? getImageStorageUrl(staffMember.avatarUrl)
          : null;

        const stripeStyle = isCancelled ? MUTED_STRIPE_STYLE : PILL_STRIPE_STYLE;

        return (
          <BookingPopoverCard
            key={booking._id}
            booking={booking}
            staff={staffMember}
            open={isSelected}
            onOpenChange={(open) => {
              onSelectBooking(open ? booking._id : null);
            }}
            onComplete={onComplete}
            onCancel={onCancel}
            onMarkNoShow={onMarkNoShow}
            side="bottom"
            align="center"
          >
            <div
              role="button"
              tabIndex={0}
              onClick={() =>
                onSelectBooking(isSelected ? null : booking._id)
              }
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectBooking(isSelected ? null : booking._id);
                }
              }}
              className={cn(
                "group flex w-full min-w-0 items-center justify-between rounded-2xl border px-4 sm:px-6 py-4 sm:py-5 min-h-[72px] sm:min-h-[76px] text-left transition-all duration-150 cursor-pointer select-none",
                "bg-card hover:bg-muted/30 hover:border-border/80 hover:shadow-xs active:scale-[0.99]",
                isSelected
                  ? "border-primary ring-2 ring-primary/20 bg-muted/20 shadow-xs"
                  : "border-border/50",
                isCancelled && "opacity-60 bg-muted/20 border-dashed",
              )}
            >
              {/* Left Column: Time & Service Pill & Client & Staff */}
              <div className="flex items-center gap-3 sm:gap-6 min-w-0 flex-1">
                {/* Time Badge */}
                <div className="flex items-center gap-2 shrink-0 text-muted-foreground w-28 sm:w-32">
                  <IconClock className="size-4 opacity-60 shrink-0" />
                  <span className="font-mono font-semibold text-xs sm:text-sm text-foreground tabular-nums tracking-tight">
                    {startLabel}–{endLabel}
                  </span>
                </div>

                {/* Service Pill */}
                <div
                  style={stripeStyle}
                  className={cn(
                    "flex items-center gap-1.5 rounded-xl sm:rounded-2xl px-3.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold shrink-0 transition-transform shadow-2xs",
                    isCancelled
                      ? "bg-muted text-muted-foreground line-through"
                      : theme.pillBg,
                  )}
                >
                  <span className="truncate max-w-[140px] sm:max-w-[220px]">
                    {serviceName}
                  </span>
                </div>

                {/* Client Information */}
                <div className="hidden md:flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="size-7 sm:size-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0 ring-1 ring-border/40">
                    <IconUser className="size-4" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-foreground truncate text-xs sm:text-sm tracking-tight">
                      {booking.customer?.name || t("Guest", "Гостин")}
                    </span>
                    {booking.customer?.phone && (
                      <span className="text-[11px] sm:text-xs text-muted-foreground flex items-center gap-1 truncate font-mono">
                        <IconPhone className="size-3 shrink-0 opacity-60" />
                        {booking.customer.phone}
                      </span>
                    )}
                  </div>
                </div>

                {/* Staff Member */}
                <div className="hidden lg:flex items-center gap-2.5 shrink-0 text-muted-foreground">
                  <div className="size-7 sm:size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold overflow-hidden shrink-0 ring-1 ring-border/40">
                    {staffAvatarUrl ? (
                      <Image
                        src={staffAvatarUrl}
                        alt={staffMember?.displayName || ""}
                        width={32}
                        height={32}
                        unoptimized
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      (staffMember?.displayName || "S").charAt(0)
                    )}
                  </div>
                  <span className="font-semibold text-foreground text-xs sm:text-sm truncate max-w-[120px]">
                    {staffMember?.displayName}
                  </span>
                </div>
              </div>

              {/* Right Column: Price & Status Indicator */}
              <div className="flex items-center gap-3 sm:gap-6 shrink-0 pl-3">
                {/* Price */}
                <div className="text-right font-bold text-sm sm:text-base text-foreground font-mono">
                  <Price
                    amount={booking.priceMinorUnits || 0}
                    showDecimals={false}
                  />
                </div>

                {/* Status Badge */}
                <div className="flex items-center justify-end w-20 sm:w-24">
                  {isCompleted && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                      <IconCircleCheck className="size-3.5 shrink-0" />
                      <span>{t("Done", "Завршен")}</span>
                    </span>
                  )}
                  {isNoShow && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-full">
                      <IconAlertTriangle className="size-3.5 shrink-0" />
                      <span>{t("No-Show", "Не се појави")}</span>
                    </span>
                  )}
                  {isCancelled && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground bg-muted border border-border px-2.5 py-1 rounded-full">
                      <IconX className="size-3.5 shrink-0" />
                      <span>{t("Cancelled", "Откажан")}</span>
                    </span>
                  )}
                  {!isCompleted && !isNoShow && !isCancelled && isAiBooked && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full">
                      <IconSparkles className="size-3.5 shrink-0" />
                      <span>AI</span>
                    </span>
                  )}
                  {!isCompleted && !isNoShow && !isCancelled && !isAiBooked && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground bg-muted/60 border border-border/60 px-2.5 py-1 rounded-full">
                      <span className="size-1.5 rounded-full bg-emerald-500" />
                      <span>{t("Confirmed", "Потврден")}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </BookingPopoverCard>
        );
      })}
    </div>
  );
}
