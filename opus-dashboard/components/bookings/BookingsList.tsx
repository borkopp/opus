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
import {
  getServiceTheme,
  PILL_STRIPE_STYLE,
  MUTED_STRIPE_STYLE,
} from "./service-theme";
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
    <div className="flex min-w-0 flex-col w-full p-3 sm:p-5 gap-3 custom-scrollbar">
      {sortedBookings.map((booking) => {
        const startLabel = bookingTimeLabel(booking.startAt);
        const endLabel = bookingTimeLabel(booking.endAt);
        const serviceName = bookingServiceLabel(
          booking,
          t("Service", "Услуга"),
        );
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

        const stripeStyle = isCancelled
          ? MUTED_STRIPE_STYLE
          : PILL_STRIPE_STYLE;

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
            <button
              type="button"
              aria-pressed={isSelected}
              className={cn(
                "group grid w-full min-w-0 shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 rounded-2xl border p-4 text-left transition-[background-color,border-color,box-shadow,transform] duration-150 cursor-pointer select-none motion-reduce:transition-none lg:flex lg:justify-between lg:gap-4 lg:px-5 lg:py-5",
                "bg-card hover:bg-muted/30 hover:border-border/80 hover:shadow-xs active:scale-[0.99]",
                isSelected
                  ? "border-primary ring-2 ring-primary/20 bg-muted/20 shadow-xs"
                  : "border-border/50",
                isCancelled && "opacity-60 bg-muted/20 border-dashed",
              )}
            >
              {/* Left Column: Time & Service Pill & Client & Staff */}
              <div className="contents lg:flex lg:items-center lg:gap-4 lg:min-w-0 lg:flex-1">
                {/* Time Badge */}
                <div className="row-start-1 col-start-1 flex min-w-0 items-center gap-2 text-muted-foreground lg:w-32 lg:shrink-0">
                  <IconClock className="size-4 opacity-60 shrink-0" />
                  <span className="whitespace-nowrap font-mono font-semibold text-xs sm:text-sm text-foreground tabular-nums tracking-tight">
                    {startLabel}–{endLabel}
                  </span>
                </div>

                {/* Service Pill */}
                <div
                  style={stripeStyle}
                  className={cn(
                    "col-span-2 row-start-3 flex min-w-0 max-w-full w-fit items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold shadow-2xs lg:max-w-44",
                    isCancelled
                      ? "bg-muted text-muted-foreground line-through"
                      : theme.pillBg,
                  )}
                >
                  <span className="line-clamp-2 break-words lg:truncate">
                    {serviceName}
                  </span>
                </div>

                {/* Client Information */}
                <div className="col-span-2 row-start-2 flex items-center gap-2.5 min-w-0 lg:flex-1">
                  <div className="size-7 sm:size-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0 ring-1 ring-border/40">
                    <IconUser className="size-4" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-foreground break-words text-base lg:truncate lg:text-sm tracking-tight">
                      {booking.customer?.name || t("Guest", "Гостин")}
                    </span>
                    {booking.customer?.phone && (
                      <span className="hidden lg:flex text-xs text-muted-foreground items-center gap-1 truncate font-mono">
                        <IconPhone className="size-3 shrink-0 opacity-60" />
                        {booking.customer.phone}
                      </span>
                    )}
                  </div>
                </div>

                {/* Staff Member */}
                <div className="col-start-1 row-start-4 flex min-w-0 items-center gap-2 text-muted-foreground lg:hidden xl:flex">
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
              <div className="contents lg:flex lg:items-center lg:gap-4 lg:shrink-0">
                {/* Price */}
                <div className="col-start-2 row-start-1 text-right font-semibold text-sm text-foreground tabular-nums">
                  <Price
                    amount={booking.priceMinorUnits || 0}
                    showDecimals={false}
                  />
                </div>

                {/* Status Badge */}
                <div className="col-start-2 row-start-4 flex items-center justify-end lg:min-w-24">
                  {isCompleted && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                      <IconCircleCheck className="size-3.5 shrink-0" />
                      <span data-replay-public>{t("Done", "Завршен")}</span>
                    </span>
                  )}
                  {isNoShow && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-full">
                      <IconAlertTriangle className="size-3.5 shrink-0" />
                      <span data-replay-public>
                        {t("No-Show", "Не се појави")}
                      </span>
                    </span>
                  )}
                  {isCancelled && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground bg-muted border border-border px-2.5 py-1 rounded-full">
                      <IconX className="size-3.5 shrink-0" />
                      <span data-replay-public>
                        {t("Cancelled", "Откажан")}
                      </span>
                    </span>
                  )}
                  {!isCompleted && !isNoShow && !isCancelled && isAiBooked && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full">
                      <IconSparkles className="size-3.5 shrink-0" />
                      <span data-replay-public>AI</span>
                    </span>
                  )}
                  {!isCompleted && !isNoShow && !isCancelled && !isAiBooked && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground bg-muted/60 border border-border/60 px-2.5 py-1 rounded-full">
                      <span className="size-1.5 rounded-full bg-emerald-500" />
                      <span data-replay-public>
                        {t("Confirmed", "Потврден")}
                      </span>
                    </span>
                  )}
                </div>
              </div>
            </button>
          </BookingPopoverCard>
        );
      })}
    </div>
  );
}
