"use client";

import React, {
  useMemo,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { format, isSameDay } from "date-fns";
import Image from "next/image";
import { IconPlus, IconClock, IconGripVertical } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { Id } from "@/convex/_generated/dataModel";
import { BookingView, StaffView } from "./types";
import type { QuickBookingSelection } from "./QuickBookingProvider";
import { bookingServiceLabel } from "./service-label";
import { BookingPill } from "./BookingPill";
import { BookingPopoverCard } from "./BookingPopoverCard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Spinner } from "@/components/ui/spinner";
import {
  bookingMinuteOfDay,
  bookingTimeLabel,
  bookingTimestampForDate,
} from "@/lib/booking-wall-clock";
import { getImageStorageUrl } from "@/lib/file-validation";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";

const START_HOUR = 8;
const END_HOUR = 22;
const HOUR_WIDTH = 110; // px per hour
const ROW_HEIGHT = 74; // px per staff row
const STAFF_COL_WIDTH = 220; // px left staff column
const HEADER_HEIGHT = 52; // px time header

function formatBookingDate(timestamp: number, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(timestamp));
}

/** Convert horizontal pixel offset from timeline start to { hours, minutes } */
function offsetToTime(
  offsetPx: number,
  snapMinutes: number,
): { hours: number; minutes: number } {
  const totalMinutes = (offsetPx / HOUR_WIDTH) * 60 + START_HOUR * 60;
  const snappedMinutes = Math.round(totalMinutes / snapMinutes) * snapMinutes;
  const clamped = Math.max(
    START_HOUR * 60,
    Math.min((END_HOUR + 1) * 60, snappedMinutes),
  );
  return { hours: Math.floor(clamped / 60), minutes: clamped % 60 };
}

/** Convert { hours, minutes } to horizontal pixel offset */
function timeToOffset(hours: number, minutes: number): number {
  return (hours - START_HOUR + minutes / 60) * HOUR_WIDTH;
}

interface DragState {
  bookingId: Id<"bookings">;
  booking: BookingView;
  staffId: Id<"staff_members">;
  grabOffsetX: number;
  currentGridLeft: number;
  originalGridLeft: number;
  durationMs: number;
}

interface PendingDragReschedule {
  booking: BookingView;
  newStartAt: number;
  newEndAt: number;
}

export function BookingsHorizontalTimeline({
  bookings,
  staffMembers,
  selectedBookingId,
  onSelectBooking,
  onReschedule,
  onComplete,
  onCancel,
  onMarkNoShow,
  currentDate,
  quickBookingSlots,
  slotDurationMins,
  onQuickBooking,
}: {
  bookings: BookingView[];
  staffMembers: StaffView[];
  selectedBookingId: Id<"bookings"> | null;
  onSelectBooking: (id: Id<"bookings"> | null) => void;
  onReschedule?: (
    bookingId: Id<"bookings">,
    newStartAt: number,
  ) => Promise<boolean>;
  onComplete?: (bookingId: Id<"bookings">) => void;
  onCancel?: (bookingId: Id<"bookings">) => void;
  onMarkNoShow?: (bookingId: Id<"bookings">) => void;
  currentDate: Date;
  quickBookingSlots: QuickBookingSelection[];
  slotDurationMins: number;
  onQuickBooking: (slot: QuickBookingSelection) => void;
}) {
  const { t, locale } = useDashboardI18n();

  const hours = useMemo(
    () =>
      Array.from(
        { length: END_HOUR - START_HOUR + 1 },
        (_, i) => START_HOUR + i,
      ),
    [],
  );

  const totalTimelineWidth = hours.length * HOUR_WIDTH;

  const [currentTimeOffset, setCurrentTimeOffset] = useState<number | null>(
    null,
  );
  const [drag, setDrag] = useState<DragState | null>(null);
  const [pendingDragReschedule, setPendingDragReschedule] =
    useState<PendingDragReschedule | null>(null);
  const [isConfirmingReschedule, setIsConfirmingReschedule] = useState(false);
  const [hoveredQuickSlot, setHoveredQuickSlot] =
    useState<QuickBookingSelection | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);
  const rowRefs = useRef<Map<Id<"staff_members">, HTMLDivElement>>(new Map());

  const dragStartMouseX = useRef(0);
  const isDragging = useRef(false);
  const dragTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDragBooking = useRef<{
    booking: BookingView;
    startX: number;
    grabOffsetX: number;
  } | null>(null);

  const quickSlotsByStaffAndMinute = useMemo(() => {
    const slots = new Map<string, QuickBookingSelection>();
    for (const slot of quickBookingSlots) {
      slots.set(`${slot.staffId}:${bookingMinuteOfDay(slot.startAt)}`, slot);
    }
    return slots;
  }, [quickBookingSlots]);

  // Current time vertical indicator
  useEffect(() => {
    const updateOffset = () => {
      const now = new Date();
      if (isSameDay(now, currentDate)) {
        if (now.getHours() >= START_HOUR && now.getHours() <= END_HOUR) {
          const offset =
            (now.getHours() - START_HOUR + now.getMinutes() / 60) * HOUR_WIDTH;
          setCurrentTimeOffset(offset);
          return;
        }
      }
      setCurrentTimeOffset(null);
    };

    updateOffset();
    const interval = setInterval(updateOffset, 60000);
    return () => clearInterval(interval);
  }, [currentDate]);

  // Auto-scroll horizontally to current time or earliest booking
  useEffect(() => {
    hasScrolledRef.current = false;
  }, [currentDate]);

  useEffect(() => {
    if (hasScrolledRef.current) return;
    const container = scrollContainerRef.current?.closest(
      "[data-scroll-container]",
    ) as HTMLElement | null;
    if (!container) return;

    let targetLeft = 0;
    if (currentTimeOffset !== null) {
      targetLeft = Math.max(0, currentTimeOffset - HOUR_WIDTH);
    } else if (bookings.length > 0) {
      const earliest = bookings.reduce((min, b) => {
        const t = new Date(b.startAt).getTime();
        return t < min ? t : min;
      }, Infinity);
      const firstMinute = bookingMinuteOfDay(earliest);
      targetLeft = Math.max(
        0,
        (firstMinute / 60 - START_HOUR) * HOUR_WIDTH - HOUR_WIDTH / 2,
      );
    } else {
      targetLeft = HOUR_WIDTH;
    }

    container.scrollTo({ left: targetLeft, behavior: "smooth" });
    hasScrolledRef.current = true;
  }, [currentTimeOffset, bookings]);

  // Drag start
  const handleDragStart = useCallback(
    (e: React.MouseEvent, booking: BookingView) => {
      if (!onReschedule) return;
      if (["completed", "cancelled", "no_show"].includes(booking.status))
        return;

      e.preventDefault();
      e.stopPropagation();

      const start = new Date(booking.startAt);
      const startMinute = bookingMinuteOfDay(booking.startAt);
      const originalGridLeft = timeToOffset(
        Math.floor(startMinute / 60),
        startMinute % 60,
      );

      const rowEl = rowRefs.current.get(booking.staffId);
      if (!rowEl) return;

      const rowRect = rowEl.getBoundingClientRect();
      const grabOffsetX =
        e.clientX - (rowRect.left + STAFF_COL_WIDTH + originalGridLeft);

      pendingDragBooking.current = { booking, startX: e.clientX, grabOffsetX };
      dragStartMouseX.current = e.clientX;

      dragTimeout.current = setTimeout(() => {
        if (!pendingDragBooking.current) return;
        isDragging.current = true;

        const end = new Date(booking.endAt);
        setDrag({
          bookingId: booking._id,
          booking,
          staffId: booking.staffId,
          grabOffsetX: pendingDragBooking.current.grabOffsetX,
          currentGridLeft: originalGridLeft,
          originalGridLeft,
          durationMs: end.getTime() - start.getTime(),
        });
      }, 150);
    },
    [onReschedule],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (pendingDragBooking.current && !isDragging.current) {
        const dist = Math.abs(e.clientX - dragStartMouseX.current);
        if (dist > 4) {
          const { booking, grabOffsetX } = pendingDragBooking.current;
          if (dragTimeout.current) clearTimeout(dragTimeout.current);

          isDragging.current = true;
          const start = new Date(booking.startAt);
          const end = new Date(booking.endAt);
          const startMinute = bookingMinuteOfDay(booking.startAt);
          const originalGridLeft = timeToOffset(
            Math.floor(startMinute / 60),
            startMinute % 60,
          );

          setDrag({
            bookingId: booking._id,
            booking,
            staffId: booking.staffId,
            grabOffsetX,
            currentGridLeft: originalGridLeft,
            originalGridLeft,
            durationMs: end.getTime() - start.getTime(),
          });
        }
      }

      if (!isDragging.current || !drag) return;

      const rowEl = rowRefs.current.get(drag.staffId);
      if (!rowEl) return;

      const rowRect = rowEl.getBoundingClientRect();
      const relativeX =
        e.clientX - rowRect.left - STAFF_COL_WIDTH - drag.grabOffsetX;

      const time = offsetToTime(relativeX, slotDurationMins);
      const newGridLeft = timeToOffset(time.hours, time.minutes);

      const durationHours = drag.durationMs / (1000 * 60 * 60);
      const maxLeft = (END_HOUR + 1 - START_HOUR - durationHours) * HOUR_WIDTH;
      const clampedLeft = Math.max(0, Math.min(newGridLeft, maxLeft));

      setDrag((prev) =>
        prev ? { ...prev, currentGridLeft: clampedLeft } : null,
      );
    },
    [drag, slotDurationMins],
  );

  const handleMouseUp = useCallback(() => {
    if (dragTimeout.current) {
      clearTimeout(dragTimeout.current);
      dragTimeout.current = null;
    }
    pendingDragBooking.current = null;

    if (!isDragging.current || !drag) {
      isDragging.current = false;
      setDrag(null);
      return;
    }

    isDragging.current = false;

    const newTime = offsetToTime(drag.currentGridLeft, slotDurationMins);
    const newStartAt = bookingTimestampForDate(
      currentDate,
      newTime.hours * 60 + newTime.minutes,
    );

    const originalTime = offsetToTime(drag.originalGridLeft, slotDurationMins);
    if (
      newTime.hours !== originalTime.hours ||
      newTime.minutes !== originalTime.minutes
    ) {
      setPendingDragReschedule({
        booking: drag.booking,
        newStartAt,
        newEndAt: newStartAt + drag.durationMs,
      });
    }

    setDrag(null);
  }, [drag, currentDate, slotDurationMins]);

  const confirmDragReschedule = useCallback(async () => {
    if (!pendingDragReschedule || !onReschedule || isConfirmingReschedule) {
      return;
    }

    setIsConfirmingReschedule(true);
    try {
      const changed = await onReschedule(
        pendingDragReschedule.booking._id,
        pendingDragReschedule.newStartAt,
      );
      if (changed) setPendingDragReschedule(null);
    } finally {
      setIsConfirmingReschedule(false);
    }
  }, [isConfirmingReschedule, onReschedule, pendingDragReschedule]);

  // Attach global mouse listeners while dragging
  useEffect(() => {
    if (drag) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "none";
      document.body.style.cursor = "grabbing";

      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
      };
    }
  }, [drag, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    const cleanPending = () => {
      if (dragTimeout.current) clearTimeout(dragTimeout.current);
      pendingDragBooking.current = null;
    };
    window.addEventListener("mouseup", cleanPending);
    return () => window.removeEventListener("mouseup", cleanPending);
  }, []);

  // Drag time preview label
  const dragTimeLabel = useMemo(() => {
    if (!drag) return null;
    const newTime = offsetToTime(drag.currentGridLeft, slotDurationMins);
    const endMs = drag.durationMs;
    const endMinutes =
      newTime.hours * 60 + newTime.minutes + endMs / (1000 * 60);
    const endH = Math.floor(endMinutes / 60);
    const endM = Math.round(endMinutes % 60);
    return {
      start: `${String(newTime.hours).padStart(2, "0")}:${String(newTime.minutes).padStart(2, "0")}`,
      end: `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`,
      changed: drag.currentGridLeft !== drag.originalGridLeft,
    };
  }, [drag, slotDurationMins]);

  const handleQuickSlotHover = useCallback(
    (event: React.MouseEvent<HTMLDivElement>, staffId: Id<"staff_members">) => {
      if (drag || slotDurationMins <= 0) {
        setHoveredQuickSlot(null);
        return;
      }

      const bounds = event.currentTarget.getBoundingClientRect();
      const gridOffsetX = event.clientX - bounds.left - STAFF_COL_WIDTH;
      if (gridOffsetX < 0) {
        setHoveredQuickSlot(null);
        return;
      }

      const rawMinute = START_HOUR * 60 + (gridOffsetX / HOUR_WIDTH) * 60;
      const minute =
        Math.floor(rawMinute / slotDurationMins) * slotDurationMins;
      setHoveredQuickSlot(
        quickSlotsByStaffAndMinute.get(`${staffId}:${minute}`) ?? null,
      );
    },
    [drag, quickSlotsByStaffAndMinute, slotDurationMins],
  );

  return (
    <>
      <div
        ref={scrollContainerRef}
        className={cn(
          "relative min-w-max pb-10 select-none",
          drag && "cursor-grabbing",
        )}
        style={{ width: STAFF_COL_WIDTH + totalTimelineWidth }}
      >
        {/* Top Header Row */}
        <div className="flex sticky top-0 z-30 bg-card/95 backdrop-blur-md border-b border-border/50">
          {/* Top-Left Corner: Staff Label */}
          <div
            className="shrink-0 flex items-center px-4 font-semibold text-sm text-foreground sticky left-0 z-40 bg-card border-r border-border/50"
            style={{ width: STAFF_COL_WIDTH, height: HEADER_HEIGHT }}
          >
            <span data-replay-public>{t("Staff", "Тим")}</span>
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              ({staffMembers.length})
            </span>
          </div>

          {/* Time Columns Header */}
          <div className="flex relative" style={{ width: totalTimelineWidth }}>
            {hours.map((h) => (
              <div
                key={h}
                className="flex items-center justify-start pl-2 text-xs font-medium text-muted-foreground/80 border-r border-border/30"
                style={{ width: HOUR_WIDTH, height: HEADER_HEIGHT }}
              >
                <span>{format(new Date().setHours(h, 0), "HH:mm")}</span>
              </div>
            ))}

            {/* Current Time Header Indicator Marker */}
            {currentTimeOffset !== null && (
              <div
                className="absolute top-0 bottom-0 pointer-events-none z-40 flex flex-col items-center"
                style={{ left: currentTimeOffset }}
              >
                <div className="w-0 h-0 border-x-[5px] border-x-transparent border-t-[7px] border-t-sky-500" />
                <span className="mt-0.5 px-1.5 py-0.5 rounded-full bg-sky-500 text-white font-mono font-bold text-[9px] leading-none shadow-xs">
                  {format(new Date(), "HH:mm")}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Current Time Vertical Line spanning all rows */}
        {currentTimeOffset !== null && (
          <div
            className="absolute z-20 pointer-events-none w-[2px] bg-sky-500/80 shadow-[0_0_8px_rgba(14,165,233,0.5)]"
            style={{
              left: STAFF_COL_WIDTH + currentTimeOffset,
              top: HEADER_HEIGHT,
              bottom: 0,
            }}
          />
        )}

        {/* Staff Rows */}
        <div className="flex flex-col divide-y divide-border/40">
          {staffMembers.map((staff) => {
            const staffBookings = bookings.filter(
              (b) => b.staffId === staff._id,
            );
            const staffAvatarUrl = getImageStorageUrl(staff.avatarUrl);
            const staffQuickSlot =
              hoveredQuickSlot?.staffId === staff._id ? hoveredQuickSlot : null;
            const quickSlotStartMinute = staffQuickSlot
              ? bookingMinuteOfDay(staffQuickSlot.startAt)
              : null;

            return (
              <div
                key={staff._id}
                ref={(el) => {
                  if (el) rowRefs.current.set(staff._id, el);
                }}
                className="flex relative group/row hover:bg-muted/[0.02] transition-colors"
                style={{ height: ROW_HEIGHT }}
                onMouseMove={(event) => handleQuickSlotHover(event, staff._id)}
                onMouseLeave={() => {
                  if (hoveredQuickSlot?.staffId === staff._id) {
                    setHoveredQuickSlot(null);
                  }
                }}
              >
                {/* Left Staff Column (Sticky) */}
                <div
                  className="shrink-0 flex items-center gap-3 px-4 sticky left-0 z-20 bg-card border-r border-border/50"
                  style={{ width: STAFF_COL_WIDTH, height: ROW_HEIGHT }}
                >
                  <div className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs overflow-hidden shrink-0 ring-1 ring-border/50">
                    {staffAvatarUrl ? (
                      <Image
                        src={staffAvatarUrl}
                        alt={staff.displayName}
                        width={36}
                        height={36}
                        unoptimized
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      staff.displayName.charAt(0)
                    )}
                  </div>

                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-sm text-foreground tracking-tight truncate">
                      {staff.displayName}
                    </span>
                    <span
                      data-replay-public
                      className="text-xs text-muted-foreground truncate"
                    >
                      {t("Availability: 8h", "Достапност: 8ч")}
                    </span>
                  </div>
                </div>

                {/* Timeline Grid Area for this staff */}
                <div
                  className="relative flex-1 flex"
                  style={{ width: totalTimelineWidth }}
                >
                  {/* Grid Lines */}
                  {hours.map((h) => (
                    <div
                      key={h}
                      className="border-r border-border/30 border-dashed relative h-full"
                      style={{ width: HOUR_WIDTH }}
                    >
                      {/* 30-min subtle line */}
                      <div
                        className="absolute top-0 bottom-0 border-r border-border/15 border-dotted pointer-events-none"
                        style={{ left: HOUR_WIDTH / 2 }}
                      />
                    </div>
                  ))}

                  {/* Open Quick Booking Slot Target on Hover */}
                  {staffQuickSlot && quickSlotStartMinute !== null && (
                    <button
                      type="button"
                      data-slot="quick-booking-target"
                      className="absolute top-2.5 bottom-2.5 z-10 flex items-center justify-center gap-1.5 overflow-hidden rounded-2xl border-2 border-dashed border-primary/40 bg-primary/[0.04] px-2 text-xs font-medium text-primary shadow-xs transition-all duration-150 hover:bg-primary/[0.08] hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      style={{
                        left:
                          ((quickSlotStartMinute - START_HOUR * 60) / 60) *
                          HOUR_WIDTH,
                        width: Math.max(
                          (staffQuickSlot.durationMins / 60) * HOUR_WIDTH,
                          60,
                        ),
                      }}
                      onClick={() => onQuickBooking(staffQuickSlot)}
                      aria-label={t(
                        `Book slot from ${bookingTimeLabel(staffQuickSlot.startAt)} to ${bookingTimeLabel(staffQuickSlot.endAt)} with ${staff.displayName}`,
                        `Закажи термин од ${bookingTimeLabel(staffQuickSlot.startAt)} до ${bookingTimeLabel(staffQuickSlot.endAt)} со ${staff.displayName}`,
                      )}
                    >
                      <IconPlus className="size-3.5 shrink-0" />
                      <span className="font-mono font-medium text-[11px] tabular-nums tracking-tight">
                        {bookingTimeLabel(staffQuickSlot.startAt)}–
                        {bookingTimeLabel(staffQuickSlot.endAt)}
                      </span>
                      <span
                        data-replay-public
                        className="text-[10px] opacity-70 hidden sm:inline"
                      >
                        · {t("Open", "Слободен")}
                      </span>
                    </button>
                  )}

                  {/* Ghost Guide while dragging */}
                  {drag &&
                    drag.staffId === staff._id &&
                    drag.currentGridLeft !== drag.originalGridLeft && (
                      <div
                        className="absolute top-2 bottom-2 z-[5] rounded-2xl border-2 border-dashed border-muted-foreground/30 bg-muted/15 pointer-events-none"
                        style={{
                          left: drag.originalGridLeft,
                          width: Math.max(
                            (drag.durationMs / (1000 * 60 * 60)) * HOUR_WIDTH,
                            40,
                          ),
                        }}
                      />
                    )}

                  {/* Appointments */}
                  {staffBookings.map((booking) => {
                    const isDraggingThis = drag?.bookingId === booking._id;
                    const startMinute = bookingMinuteOfDay(booking.startAt);
                    const durationMinutes =
                      (booking.endAt - booking.startAt) / 60_000;
                    const startHour = startMinute / 60;
                    const endHour = (startMinute + durationMinutes) / 60;

                    const clampedStart = Math.max(startHour, START_HOUR);
                    const clampedEnd = Math.min(endHour, END_HOUR + 1);
                    if (clampedEnd <= clampedStart) return null;

                    const left = isDraggingThis
                      ? drag!.currentGridLeft
                      : (clampedStart - START_HOUR) * HOUR_WIDTH;

                    const width = isDraggingThis
                      ? (drag!.durationMs / (1000 * 60 * 60)) * HOUR_WIDTH
                      : (clampedEnd - clampedStart) * HOUR_WIDTH;

                    const canDrag =
                      onReschedule &&
                      !["completed", "cancelled", "no_show"].includes(
                        booking.status,
                      );

                    const isSelected = selectedBookingId === booking._id;

                    return (
                      <div
                        key={booking._id}
                        className={cn(
                          "absolute top-2.5 bottom-2.5 z-10 flex items-center group/booking",
                          isDraggingThis && "z-40 opacity-90 transition-none",
                          !isDraggingThis &&
                            drag &&
                            "opacity-40 transition-opacity duration-200",
                        )}
                        style={{
                          left,
                          width: Math.max(width, 60),
                          transition: isDraggingThis ? "none" : undefined,
                        }}
                      >
                        {/* Drag Handle */}
                        {canDrag && !drag && (
                          <div
                            className="absolute -left-2 top-1 bottom-1 w-4 flex items-center justify-center opacity-0 group-hover/booking:opacity-100 transition-opacity cursor-grab z-30"
                            onMouseDown={(e) => handleDragStart(e, booking)}
                          >
                            <div className="bg-background/95 backdrop-blur border border-border/80 shadow-xs rounded-l-md px-0.5 py-1.5">
                              <IconGripVertical className="h-3 w-3 text-muted-foreground" />
                            </div>
                          </div>
                        )}

                        {/* Drag time tooltip */}
                        {isDraggingThis && dragTimeLabel && (
                          <div
                            className={cn(
                              "absolute -top-9 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 px-2.5 py-1 rounded-full shadow-lg text-[11px] font-semibold whitespace-nowrap pointer-events-none",
                              dragTimeLabel.changed
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            <IconClock className="h-3 w-3" />
                            {dragTimeLabel.start} – {dragTimeLabel.end}
                          </div>
                        )}

                        {/* Interactive Popover Card Wrapping the Appointment Pill */}
                        <BookingPopoverCard
                          booking={booking}
                          staff={staff}
                          open={isSelected}
                          onOpenChange={(open) => {
                            if (!isDragging.current) {
                              onSelectBooking(open ? booking._id : null);
                            }
                          }}
                          onComplete={onComplete}
                          onCancel={onCancel}
                          onMarkNoShow={onMarkNoShow}
                          onRescheduleClick={() => {
                            // Can trigger custom reschedule modal
                          }}
                          side="bottom"
                          align="center"
                        >
                          <div className="w-full h-full flex items-center">
                            <BookingPill
                              booking={booking}
                              isSelected={isSelected}
                              isDragging={isDraggingThis}
                              orientation="horizontal"
                              className="w-full h-full"
                              onClick={() => {
                                if (!isDragging.current) {
                                  onSelectBooking(
                                    selectedBookingId === booking._id
                                      ? null
                                      : booking._id,
                                  );
                                }
                              }}
                            />
                          </div>
                        </BookingPopoverCard>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Bottom Add Row (matching screenshot's "+" button row) */}
          <div
            className="flex items-center sticky left-0 z-20 bg-card/60 hover:bg-card transition-colors border-t border-border/30"
            style={{ height: 56, width: STAFF_COL_WIDTH }}
          >
            <button
              type="button"
              onClick={() => {
                const firstSlot = quickBookingSlots[0];
                if (firstSlot) onQuickBooking(firstSlot);
              }}
              className="ml-4 flex items-center justify-center size-9 rounded-2xl bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50 shadow-xs transition-all active:scale-[0.96]"
              aria-label={t("Add booking", "Додај термин")}
              title={t("Add booking", "Додај термин")}
            >
              <IconPlus className="size-4" />
            </button>
            <span
              data-replay-public
              className="ml-3 text-xs font-medium text-muted-foreground"
            >
              {t("Quick booking", "Брзо закажување")}
            </span>
          </div>
        </div>
      </div>

      {/* Reschedule Confirmation Dialog */}
      <AlertDialog
        open={pendingDragReschedule !== null}
        onOpenChange={(open) => {
          if (!open && !isConfirmingReschedule) {
            setPendingDragReschedule(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("Confirm reschedule", "Потврди презакажување")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDragReschedule
                ? t(
                    `Move ${pendingDragReschedule.booking.customer?.name ?? "this client"}’s ${bookingServiceLabel(pendingDragReschedule.booking)} from ${formatBookingDate(pendingDragReschedule.booking.startAt, locale === "mk" ? "mk-MK" : "en-GB")}, ${bookingTimeLabel(pendingDragReschedule.booking.startAt)}–${bookingTimeLabel(pendingDragReschedule.booking.endAt)} to ${formatBookingDate(pendingDragReschedule.newStartAt, locale === "mk" ? "mk-MK" : "en-GB")}, ${bookingTimeLabel(pendingDragReschedule.newStartAt)}–${bookingTimeLabel(pendingDragReschedule.newEndAt)}?${pendingDragReschedule.booking.customer?.email ? " The client will receive an email with the new time." : ""}`,
                    `Дали сакате да го преместите терминот (${bookingServiceLabel(pendingDragReschedule.booking, "Услуга")}) за ${pendingDragReschedule.booking.customer?.name ?? "клиентот"} од ${formatBookingDate(pendingDragReschedule.booking.startAt, "mk-MK")}, ${bookingTimeLabel(pendingDragReschedule.booking.startAt)}–${bookingTimeLabel(pendingDragReschedule.booking.endAt)} на ${formatBookingDate(pendingDragReschedule.newStartAt, "mk-MK")}, ${bookingTimeLabel(pendingDragReschedule.newStartAt)}–${bookingTimeLabel(pendingDragReschedule.newEndAt)}?${pendingDragReschedule.booking.customer?.email ? " Клиентот ќе добие е-порака со новото време." : ""}`,
                  )
                : t(
                    "Review the new appointment time before confirming.",
                    "Прегледајте го новото време на терминот пред да потврдите.",
                  )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isConfirmingReschedule}>
              {t("Keep original time", "Задржи го оригиналното време")}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isConfirmingReschedule}
              onClick={(event) => {
                event.preventDefault();
                void confirmDragReschedule();
              }}
            >
              {isConfirmingReschedule && <Spinner data-icon="inline-start" />}
              {isConfirmingReschedule
                ? t("Rescheduling...", "Презакажување...")
                : t("Confirm reschedule", "Потврди презакажување")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
