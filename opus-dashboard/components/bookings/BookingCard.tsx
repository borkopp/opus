"use client";

import { useMemo } from "react";
import {
  IconSparkles,
  IconCircleCheck,
  IconDotsCircleHorizontal,
  IconX,
  IconAlertTriangle,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { BookingView } from "./types";
import { bookingServiceLabel } from "./service-label";
import { bookingTimeLabel } from "@/lib/booking-wall-clock";
import { formatPrice } from "@/lib/format-price";
import { getServiceTheme } from "./service-theme";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";

interface BookingCardProps {
  booking: BookingView;
  isSelected: boolean;
  onClick: () => void;
  height?: number;
}

export function BookingCard({
  booking,
  isSelected,
  onClick,
  height,
}: BookingCardProps) {
  const { t, locale } = useDashboardI18n();

  const serviceName = bookingServiceLabel(booking, t("Service", "Услуга"));
  const theme = useMemo(
    () => getServiceTheme(booking.service?.name || serviceName),
    [booking.service?.name, serviceName],
  );

  const startLabel = bookingTimeLabel(booking.startAt);
  const endLabel = bookingTimeLabel(booking.endAt);
  const durationMinutes = Math.max(
    1,
    Math.round((booking.endAt - booking.startAt) / 60000),
  );

  const effectiveHeight = height ?? (durationMinutes / 60) * 130;
  const isCompact = effectiveHeight < 55;
  const isExpanded = effectiveHeight >= 85;

  const isAiBooked = Boolean(booking.source?.startsWith("ai_"));
  const isCompleted = booking.status === "completed";
  const isCancelled = booking.status === "cancelled";
  const isNoShow = booking.status === "no_show";

  const customerName = booking.customer?.name || t("Unknown", "Непознат");
  const priceFormatted = formatPrice(
    booking.priceMinorUnits,
    booking.currency || "MKD",
    locale === "mk" ? "mk-MK" : "en-US",
    false,
  );

  // Status Badge Rendering
  const renderStatusBadge = (compact = false) => {
    if (isCompleted) {
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 font-medium rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25",
            compact ? "p-0.5" : "px-1.5 py-0.5 text-[10px]",
          )}
          title={t("Completed", "Завршен")}
        >
          <IconCircleCheck className="size-3 shrink-0" />
          {!compact && (
            <span className="hidden sm:inline font-semibold">
              {t("Completed", "Завршен")}
            </span>
          )}
        </span>
      );
    }

    if (isCancelled) {
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 font-medium rounded-full bg-muted text-muted-foreground border border-border/60",
            compact ? "p-0.5" : "px-1.5 py-0.5 text-[10px]",
          )}
          title={t("Cancelled", "Откажан")}
        >
          <IconX className="size-3 shrink-0" />
          {!compact && <span>{t("Cancelled", "Откажан")}</span>}
        </span>
      );
    }

    if (isNoShow) {
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 font-medium rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/25",
            compact ? "p-0.5" : "px-1.5 py-0.5 text-[10px]",
          )}
          title={t("No Show", "Не се појави")}
        >
          <IconAlertTriangle className="size-3 shrink-0" />
          {!compact && <span>{t("No Show", "Не се појави")}</span>}
        </span>
      );
    }

    if (isAiBooked) {
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 font-medium rounded-full bg-primary/15 text-primary dark:bg-primary/20 border border-primary/30",
            compact ? "p-0.5" : "px-1.5 py-0.5 text-[10px]",
          )}
          title={t("Booked via AI Assistant", "Закажано преку AI")}
        >
          <IconSparkles className="size-3 shrink-0" />
          {!compact && <span className="font-semibold">AI</span>}
        </span>
      );
    }

    return (
      <span
        className={cn(
          "inline-flex items-center gap-0.5 opacity-60",
          compact ? "p-0.5" : "px-1 text-[10px]",
        )}
        title={t("Confirmed", "Потврден")}
      >
        <IconDotsCircleHorizontal className="size-3 shrink-0" />
      </span>
    );
  };

  // Base container card styling
  const cardBorderClass = isCancelled
    ? "border-dashed border-border/80 bg-muted/40 opacity-60 grayscale"
    : isNoShow
      ? "border-rose-300 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/30"
      : cn(theme.cardBg, theme.cardBorder, theme.hoverBorder);

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "w-full h-full rounded-lg border px-2 py-1.5 flex items-stretch gap-2 overflow-hidden cursor-pointer transition-all duration-150 select-none shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:shadow-none",
        cardBorderClass,
        isSelected
          ? cn("ring-2 ring-offset-1 z-30 shadow-md scale-[1.01]", theme.ring)
          : "hover:shadow-sm hover:brightness-[0.98] dark:hover:brightness-110",
      )}
    >
      {/* Visual Accent Pill Bar */}
      <div
        className={cn(
          "w-1 rounded-full shrink-0 my-0.5 transition-transform duration-150",
          isCancelled
            ? "bg-muted-foreground/40"
            : isNoShow
              ? "bg-rose-500"
              : theme.accentBar,
        )}
      />

      {/* COMPACT LAYOUT (< 50px, e.g. 30 min) */}
      {isCompact ? (
        <div className="flex flex-col justify-center gap-0.5 min-w-0 flex-1 overflow-hidden">
          {/* Top Line: Time + Price + Status */}
          <div className="flex items-center justify-between gap-1.5 leading-none">
            <div className="flex items-center gap-1 font-mono font-semibold text-[10.5px] tabular-nums tracking-tight opacity-90">
              <span className={theme.timeText}>{startLabel}</span>
              <span className="opacity-40">–</span>
              <span className={theme.timeText}>{endLabel}</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span
                className={cn(
                  "font-mono font-medium text-[9.5px] px-1 py-0.2 rounded leading-tight tabular-nums",
                  theme.priceBg,
                  theme.priceText,
                )}
              >
                {priceFormatted}
              </span>
              {renderStatusBadge(true)}
            </div>
          </div>

          {/* Bottom Line: Client Name + Service */}
          <div className="flex items-center gap-1 min-w-0 text-[11px] leading-tight">
            <span
              className={cn(
                "font-bold truncate shrink-0 max-w-[55%]",
                theme.textPrimary,
                isCancelled && "line-through",
              )}
            >
              {customerName}
            </span>
            <span className="opacity-40 text-[9px] shrink-0">·</span>
            <span
              className={cn(
                "truncate font-medium opacity-80 text-[10.5px]",
                theme.textSecondary,
              )}
            >
              {serviceName}
            </span>
          </div>
        </div>
      ) : (
        /* STANDARD & EXPANDED LAYOUT (>= 50px, e.g. 35m, 45m, 60m+) */
        <div className="flex flex-col justify-between min-w-0 flex-1 py-0.5 overflow-hidden">
          {/* Header Row: Time Window + Duration + Price + Status */}
          <div className="flex items-center justify-between gap-1.5 leading-none">
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1 font-mono font-semibold text-[11px] tabular-nums tracking-tight">
                <span className={theme.timeText}>{startLabel}</span>
                <span className="opacity-40 font-normal">–</span>
                <span className={theme.timeText}>{endLabel}</span>
              </div>
              <span
                className={cn(
                  "font-mono text-[9.5px] font-medium px-1 py-0.5 rounded-full leading-none opacity-85",
                  theme.badgeBg,
                  theme.badgeText,
                )}
              >
                {durationMinutes}m
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span
                className={cn(
                  "font-mono font-semibold text-[10px] px-1.5 py-0.5 rounded-md leading-tight tabular-nums border",
                  theme.priceBg,
                  theme.priceText,
                  theme.badgeBorder,
                )}
              >
                {priceFormatted}
              </span>
              {renderStatusBadge(false)}
            </div>
          </div>

          {/* Middle Row: Client Name (Hero) */}
          <div className="flex items-center gap-1.5 min-w-0 my-0.5">
            <span
              className={cn(
                "font-bold truncate tracking-tight",
                isExpanded ? "text-[13px]" : "text-xs",
                theme.textPrimary,
                isCancelled && "line-through",
              )}
            >
              {customerName}
            </span>
          </div>

          {/* Bottom Row: Service Title */}
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className={cn(
                "truncate font-medium leading-tight",
                isExpanded ? "text-xs opacity-90" : "text-[11px] opacity-85",
                theme.textSecondary,
              )}
            >
              {serviceName}
            </span>
          </div>

          {/* Expanded Extra Row: Customer Note preview for 60m+ appointments */}
          {isExpanded && booking.customerNote && effectiveHeight >= 85 && (
            <div className="pt-1 mt-0.5 border-t border-border/30 min-w-0">
              <p
                className={cn(
                  "text-[10px] italic truncate leading-snug opacity-75",
                  theme.textSecondary,
                )}
                title={booking.customerNote}
              >
                &ldquo;{booking.customerNote}&rdquo;
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
