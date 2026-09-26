"use client";

import React from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import Image from "next/image";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  IconCheck,
  IconCalendarEvent,
  IconUserX,
  IconX,
  IconPhone,
  IconMail,
  IconSparkles,
  IconNotes,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { BookingView, StaffView } from "./types";
import { bookingServiceLabel } from "./service-label";
import { bookingTimeLabel } from "@/lib/booking-wall-clock";
import { formatPrice } from "@/lib/format-price";
import { getImageStorageUrl } from "@/lib/file-validation";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { Id } from "@/convex/_generated/dataModel";

interface BookingPopoverCardProps {
  booking: BookingView;
  staff?: StaffView | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: (bookingId: Id<"bookings">) => void;
  onCancel?: (bookingId: Id<"bookings">) => void;
  onMarkNoShow?: (bookingId: Id<"bookings">) => void;
  onRescheduleClick?: (booking: BookingView) => void;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
}

function formatDurationLabel(minutes: number, locale: string): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (locale === "mk") {
    if (h > 0 && m > 0) return `${h}ч ${m}мин`;
    if (h > 0) return `${h}ч`;
    return `${m}мин`;
  }
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

export function BookingPopoverCard({
  booking,
  staff,
  open,
  onOpenChange,
  onComplete,
  onCancel,
  onMarkNoShow,
  onRescheduleClick,
  children,
  side = "bottom",
  align = "start",
}: BookingPopoverCardProps) {
  const { t, locale } = useDashboardI18n();
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const serviceName = bookingServiceLabel(booking, t("Service", "Услуга"));
  const startLabel = bookingTimeLabel(booking.startAt);
  const endLabel = bookingTimeLabel(booking.endAt);
  const durationMinutes = Math.max(
    1,
    Math.round((booking.endAt - booking.startAt) / 60000),
  );

  const priceFormatted = formatPrice(
    booking.priceMinorUnits,
    booking.currency || "MKD",
    locale === "mk" ? "mk-MK" : "en-US",
    false,
  );

  // Staff avatar and display
  const staffMember = staff ?? booking.staff;
  const staffDisplayName =
    staffMember?.displayName || t("Staff", "Член на тим");
  const staffAvatarUrl = staffMember?.avatarUrl
    ? getImageStorageUrl(staffMember.avatarUrl)
    : null;

  const isCompleted = booking.status === "completed";
  const isCancelled = booking.status === "cancelled";
  const isNoShow = booking.status === "no_show";
  const isAiBooked = Boolean(booking.source?.startsWith("ai_"));

  const content = (
    <>
      {/* Top Header: Staff Avatar + Name + Subtitle + Close */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-border/40">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs overflow-hidden shrink-0 ring-1 ring-border/50">
            {staffAvatarUrl ? (
              <Image
                src={staffAvatarUrl}
                alt={staffDisplayName}
                width={36}
                height={36}
                unoptimized
                className="w-full h-full object-cover"
              />
            ) : (
              staffDisplayName.charAt(0)
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-sm tracking-tight text-foreground truncate">
              {staffDisplayName}
            </span>
            <span
              data-replay-public
              className="text-[11px] text-muted-foreground font-medium truncate"
            >
              {staffMember?.role === "owner"
                ? t("Studio Owner", "Сопственик")
                : staffMember?.role === "manager"
                  ? t("Manager", "Менаџер")
                  : t("Professional", "Стилист")}
              {" · "}
              {t("Availability: On duty", "Достапност: На смена")}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="size-11 md:size-7 shrink-0 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          aria-label={t("Close", "Затвори")}
        >
          <IconX className="size-4" />
        </button>
      </div>

      {/* Body Cards (Matching the reference design in the screenshot) */}
      <div className="flex flex-col gap-2.5 py-3.5">
        {/* Card 1: Service */}
        <div className="rounded-2xl bg-muted/40 dark:bg-muted/20 border border-border/50 p-3 flex flex-col gap-1 transition-colors">
          <div className="flex items-center justify-between text-xs">
            <span
              data-replay-public
              className="font-semibold uppercase tracking-wider text-[10.5px] text-muted-foreground"
            >
              {t("Service", "Услуга")}
            </span>
            <span className="font-medium text-muted-foreground text-[11px]">
              {formatDurationLabel(durationMinutes, locale)}
            </span>
          </div>
          <span className="font-semibold text-sm text-foreground tracking-tight line-clamp-2">
            {serviceName}
          </span>
        </div>

        {/* Card 2: Price & Time */}
        <div className="rounded-2xl bg-muted/40 dark:bg-muted/20 border border-border/50 p-3 flex flex-col gap-1 transition-colors">
          <div className="flex items-center justify-between text-xs">
            <span
              data-replay-public
              className="font-semibold uppercase tracking-wider text-[10.5px] text-muted-foreground"
            >
              {t("Price", "Цена")}
            </span>
            <span className="font-mono font-medium text-muted-foreground text-[11px] tabular-nums">
              {startLabel}–{endLabel}
            </span>
          </div>
          <span className="font-semibold text-sm text-foreground tracking-tight">
            {priceFormatted}
          </span>
        </div>

        {/* Card 3: Client Details */}
        {booking.customer && (
          <div className="rounded-2xl bg-muted/30 dark:bg-muted/10 border border-border/40 p-3 flex flex-col gap-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground tracking-tight truncate">
                {booking.customer.name}
              </span>
              {isAiBooked && (
                <span
                  data-replay-public
                  className="inline-flex items-center gap-1 text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full"
                >
                  <IconSparkles className="size-3" />
                  AI
                </span>
              )}
            </div>

            {booking.customer.phone && (
              <a
                href={`tel:${booking.customer.phone}`}
                className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors min-h-11 md:min-h-0 text-sm md:text-[11px]"
              >
                <IconPhone className="size-3 shrink-0" />
                <span>{booking.customer.phone}</span>
              </a>
            )}

            {booking.customer.email && (
              <a
                href={`mailto:${booking.customer.email}`}
                className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors min-h-11 md:min-h-0 text-sm md:text-[11px] truncate"
              >
                <IconMail className="size-3 shrink-0" />
                <span className="truncate">{booking.customer.email}</span>
              </a>
            )}

            {(booking.customerNote || booking.staffNote) && (
              <div className="mt-1 pt-1.5 border-t border-border/40 flex items-start gap-1.5 text-[11px] text-muted-foreground">
                <IconNotes className="size-3 shrink-0 mt-0.5" />
                <span className="whitespace-pre-wrap break-words italic md:line-clamp-2">
                  {booking.customerNote || booking.staffNote}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status indicator bar if not normal */}
      {(isCompleted || isCancelled || isNoShow) && (
        <div className="mb-3 px-3 py-1.5 rounded-xl text-xs font-medium flex items-center justify-between bg-muted/60 text-muted-foreground">
          <span data-replay-public>{t("Status", "Статус")}</span>
          <span data-replay-public className="font-semibold capitalize">
            {isCompleted
              ? t("Completed", "Завршен")
              : isCancelled
                ? t("Cancelled", "Откажан")
                : t("No-Show", "Не се појави")}
          </span>
        </div>
      )}

      {/* Action Buttons Footer */}
      {!isCancelled && (
        <div className="sticky bottom-0 grid grid-cols-2 gap-2 bg-background pt-3 md:static md:bg-transparent border-t border-border/40">
          {!isCompleted && onComplete && (
            <Button
              data-replay-public
              variant="outline"
              size="sm"
              className="min-h-11 md:min-h-8 text-sm md:text-xs font-medium rounded-xl hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-500/30"
              onClick={() => {
                onComplete(booking._id);
                onOpenChange(false);
              }}
            >
              <IconCheck className="size-3.5 mr-1 text-emerald-600" />
              {t("Complete", "Заврши")}
            </Button>
          )}

          {onRescheduleClick && !isCompleted && !isNoShow && (
            <Button
              data-replay-public
              variant="outline"
              size="sm"
              className="min-h-11 md:min-h-8 text-sm md:text-xs font-medium rounded-xl hover:bg-primary/10 hover:text-primary hover:border-primary/30"
              onClick={() => {
                onRescheduleClick(booking);
                onOpenChange(false);
              }}
            >
              <IconCalendarEvent className="size-3.5 mr-1 text-primary" />
              {t("Reschedule", "Презакажи")}
            </Button>
          )}

          {!isCompleted && !isNoShow && onMarkNoShow && (
            <Button
              data-replay-public
              variant="ghost"
              size="sm"
              className="min-h-11 md:min-h-8 text-sm md:text-xs font-medium rounded-xl text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600"
              onClick={() => {
                onMarkNoShow(booking._id);
                onOpenChange(false);
              }}
            >
              <IconUserX className="size-3.5 mr-1 text-rose-500" />
              {t("No-Show", "Не се појави")}
            </Button>
          )}

          {onCancel && (
            <Button
              data-replay-public
              variant="ghost"
              size="sm"
              className="min-h-11 md:min-h-8 text-sm md:text-xs font-medium rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                onCancel(booking._id);
                onOpenChange(false);
              }}
            >
              <IconX className="size-3.5 mr-1" />
              {t("Cancel", "Откажи")}
            </Button>
          )}
        </div>
      )}
    </>
  );

  if (!isDesktop) {
    return (
      <Drawer autoFocus open={open} onOpenChange={onOpenChange}>
        <DrawerTrigger asChild>{children}</DrawerTrigger>
        <DrawerContent className="dashboard-panel data-[vaul-drawer-direction=bottom]:max-h-[92dvh] data-[vaul-drawer-direction=bottom]:rounded-t-3xl">
          <DrawerTitle data-replay-public className="sr-only">
            {t("Appointment details", "Детали за термин")}
          </DrawerTitle>
          <DrawerDescription data-replay-public className="sr-only">
            {t(
              "View the client, service and appointment actions.",
              "Прегледајте го клиентот, услугата и дејствата за терминот.",
            )}
          </DrawerDescription>
          <div className="min-h-0 overflow-y-auto overscroll-contain px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        sideOffset={8}
        collisionPadding={16}
        className="w-88 max-w-[calc(100vw-2rem)] max-h-[var(--radix-popover-content-available-height)] overflow-y-auto overscroll-contain rounded-3xl p-5 shadow-2xl"
      >
        {content}
      </PopoverContent>
    </Popover>
  );
}
