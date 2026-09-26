"use client";

import React, { useMemo } from "react";
import {
  IconSparkles,
  IconCircleCheck,
  IconAlertTriangle,
  IconX,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { BookingView } from "./types";
import { bookingServiceLabel } from "./service-label";
import { bookingTimeLabel } from "@/lib/booking-wall-clock";
import { formatPrice } from "@/lib/format-price";
import {
  getServiceTheme,
  PILL_STRIPE_STYLE,
  MUTED_STRIPE_STYLE,
} from "./service-theme";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";

interface BookingPillProps {
  booking: BookingView;
  isSelected?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  style?: React.CSSProperties;
  orientation?: "horizontal" | "vertical";
  isDragging?: boolean;
}

export const BookingPill = React.forwardRef<HTMLDivElement, BookingPillProps>(
  (
    {
      booking,
      isSelected = false,
      onClick,
      className,
      style,
      orientation = "horizontal",
      isDragging = false,
    },
    ref,
  ) => {
    const { t, locale } = useDashboardI18n();

    const serviceName = bookingServiceLabel(booking, t("Service", "Услуга"));
    const theme = useMemo(
      () => getServiceTheme(booking.service?.name || serviceName),
      [booking.service?.name, serviceName],
    );

    const startLabel = bookingTimeLabel(booking.startAt);
    const endLabel = bookingTimeLabel(booking.endAt);

    const isAiBooked = Boolean(booking.source?.startsWith("ai_"));
    const isCompleted = booking.status === "completed";
    const isCancelled = booking.status === "cancelled";
    const isNoShow = booking.status === "no_show";

    const priceFormatted = formatPrice(
      booking.priceMinorUnits,
      booking.currency || "MKD",
      locale === "mk" ? "mk-MK" : "en-US",
      false,
    );

    // Styling variants
    let bgClasses = theme.pillBg;
    let stripeStyle = PILL_STRIPE_STYLE;
    let isMuted = false;

    if (isCancelled) {
      bgClasses =
        "bg-zinc-200/90 dark:bg-zinc-800/90 text-zinc-600 dark:text-zinc-400 border border-dashed border-zinc-300 dark:border-zinc-700 shadow-none";
      stripeStyle = MUTED_STRIPE_STYLE;
      isMuted = true;
    } else if (isNoShow) {
      bgClasses = "bg-rose-500/90 text-white shadow-sm shadow-rose-500/20";
      stripeStyle = PILL_STRIPE_STYLE;
    } else if (isCompleted) {
      // Completed uses theme with subtle indicator
    }

    return (
      <div
        ref={ref}
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick?.(e as unknown as React.MouseEvent);
          }
        }}
        style={{ ...stripeStyle, ...style }}
        className={cn(
          "group relative flex items-center overflow-hidden rounded-2xl px-3 py-1.5 transition-all select-none cursor-pointer",
          bgClasses,
          isMuted ? "opacity-75" : "hover:brightness-105",
          isSelected &&
            cn(
              "ring-2 ring-offset-2 ring-primary scale-[1.01] shadow-lg z-30",
              theme.pillRing,
            ),
          isDragging &&
            "opacity-80 scale-[1.02] shadow-2xl cursor-grabbing z-50",
          "active:scale-[0.98] transition-transform duration-150 ease-out",
          className,
        )}
      >
        {/* Soft glossy gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.05] to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col justify-center min-w-0 w-full overflow-hidden">
          {/* Top Line: Service Name & Badges */}
          <div className="flex items-center justify-between gap-1.5 leading-tight">
            <span
              className={cn(
                "font-semibold text-xs sm:text-sm tracking-tight truncate leading-tight",
                isMuted
                  ? "text-zinc-700 dark:text-zinc-300 line-through"
                  : "text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.18)]",
              )}
            >
              {serviceName}
            </span>

            {/* Badges / Status Indicator */}
            <div className="flex items-center gap-1 shrink-0">
              {isCompleted && (
                <span
                  title={t("Completed", "Завршен")}
                  className="size-3.5 rounded-full bg-white/20 flex items-center justify-center text-white"
                >
                  <IconCircleCheck className="size-2.5" />
                </span>
              )}
              {isNoShow && (
                <span
                  title={t("No Show", "Не се појави")}
                  className="size-3.5 rounded-full bg-white/20 flex items-center justify-center text-white"
                >
                  <IconAlertTriangle className="size-2.5" />
                </span>
              )}
              {isCancelled && (
                <span
                  title={t("Cancelled", "Откажан")}
                  className="size-3.5 rounded-full bg-zinc-400/30 flex items-center justify-center text-zinc-600 dark:text-zinc-300"
                >
                  <IconX className="size-2.5" />
                </span>
              )}
              {isAiBooked && (
                <span
                  title={t("Booked via AI", "Закажано преку AI")}
                  className="size-3.5 rounded-full bg-white/20 flex items-center justify-center text-white"
                >
                  <IconSparkles className="size-2.5" />
                </span>
              )}
            </div>
          </div>

          {/* Bottom Line: Time range */}
          <div className="flex items-center gap-1.5 mt-0.5 leading-none">
            <span
              className={cn(
                "font-mono font-medium text-[11px] sm:text-xs tabular-nums tracking-tight opacity-95",
                isMuted
                  ? "text-zinc-500 dark:text-zinc-400"
                  : "text-white/90 drop-shadow-[0_1px_1px_rgba(0,0,0,0.15)]",
              )}
            >
              {startLabel}-{endLabel}
            </span>

            {booking.customer?.name && orientation === "horizontal" && (
              <>
                <span
                  data-replay-public
                  className="opacity-60 text-white text-[10px]"
                >
                  ·
                </span>
                <span
                  className={cn(
                    "text-[11px] font-medium truncate max-w-[90px] sm:max-w-[120px] hidden xs:inline",
                    isMuted
                      ? "text-zinc-500 dark:text-zinc-400"
                      : "text-white/85",
                  )}
                >
                  {booking.customer.name}
                </span>
              </>
            )}

            {orientation === "vertical" && priceFormatted && (
              <>
                <span
                  data-replay-public
                  className="opacity-60 text-white text-[10px]"
                >
                  ·
                </span>
                <span
                  className={cn(
                    "text-[10px] font-mono font-medium truncate tabular-nums",
                    isMuted
                      ? "text-zinc-500 dark:text-zinc-400"
                      : "text-white/90",
                  )}
                >
                  {priceFormatted}
                </span>
              </>
            )}
          </div>

          {orientation === "vertical" && booking.customer?.name && (
            <div
              className={cn(
                "text-[11px] font-medium truncate mt-0.5 leading-tight",
                isMuted ? "text-zinc-500 dark:text-zinc-400" : "text-white/80",
              )}
            >
              {booking.customer.name}
            </div>
          )}
        </div>
      </div>
    );
  },
);

BookingPill.displayName = "BookingPill";
