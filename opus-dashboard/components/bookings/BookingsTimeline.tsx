"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { format, isSameDay } from "date-fns";
import { BookingCard } from "./BookingCard";
import { IconPlus, IconClock, IconGripVertical } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { Id } from "@/convex/_generated/dataModel";
import { BookingView, StaffView } from "./types";

const START_HOUR = 8;
const END_HOUR = 20;
const HOUR_HEIGHT = 90;
const HEADER_HEIGHT = 56; // h-14 = 3.5rem = 56px — staff header row
const SNAP_MINUTES = 15; // Snap to 15-minute intervals
/** Convert a pixel offset (relative to the grid, not including header) to { hours, minutes } */
function offsetToTime(offsetPx: number): { hours: number; minutes: number } {
    const totalMinutes = (offsetPx / HOUR_HEIGHT) * 60 + START_HOUR * 60;
    const snappedMinutes = Math.round(totalMinutes / SNAP_MINUTES) * SNAP_MINUTES;
    const clamped = Math.max(START_HOUR * 60, Math.min(END_HOUR * 60, snappedMinutes));
    return { hours: Math.floor(clamped / 60), minutes: clamped % 60 };
}

/** Convert { hours, minutes } to a pixel offset from grid top (not including header) */
function timeToOffset(hours: number, minutes: number): number {
    return ((hours - START_HOUR) + minutes / 60) * HOUR_HEIGHT;
}

interface DragState {
    bookingId: Id<"bookings">;
    booking: BookingView;
    staffId: Id<"staff_members">;
    /** The Y offset where the user grabbed the card relative to the card's top */
    grabOffsetY: number;
    /** Current top position in the grid (px, not including header) */
    currentGridTop: number;
    /** The original grid top for visual comparison */
    originalGridTop: number;
    /** Duration of the booking in ms */
    durationMs: number;
}

export function BookingsTimeline({
    bookings,
    staffMembers,
    selectedBookingId,
    onSelectBooking,
    onReschedule,
    currentDate
}: {
    bookings: BookingView[];
    staffMembers: StaffView[];
    selectedBookingId: Id<"bookings"> | null;
    onSelectBooking: (id: Id<"bookings"> | null) => void;
    onReschedule?: (bookingId: Id<"bookings">, newStartAt: number) => void;
    currentDate: Date;
}) {
    const hours = useMemo(() => Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i), []);

    const [currentTimeOffset, setCurrentTimeOffset] = useState<number | null>(null);
    const [drag, setDrag] = useState<DragState | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const hasScrolledRef = useRef(false);
    const columnRefs = useRef<Map<Id<"staff_members">, HTMLDivElement>>(new Map());
    const dragStartMouseY = useRef(0);
    const isDragging = useRef(false);
    const dragTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingDragBooking = useRef<{ booking: BookingView; startY: number; grabOffsetY: number } | null>(null);

    // Update the red line for current time
    useEffect(() => {
        const updateOffset = () => {
            const now = new Date();
            if (isSameDay(now, currentDate)) {
                if (now.getHours() >= START_HOUR && now.getHours() <= END_HOUR) {
                    const offset = ((now.getHours() - START_HOUR) + (now.getMinutes() / 60)) * HOUR_HEIGHT;
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

    // Auto-scroll to current time or first booking
    useEffect(() => { hasScrolledRef.current = false; }, [currentDate]);

    useEffect(() => {
        if (hasScrolledRef.current) return;
        const container = scrollContainerRef.current?.closest("[data-scroll-container]") as HTMLElement | null;
        if (!container) return;

        let scrollTarget: number;
        if (currentTimeOffset !== null) {
            scrollTarget = Math.max(0, currentTimeOffset - HOUR_HEIGHT);
        } else if (bookings.length > 0) {
            const earliest = bookings.reduce((min, b) => {
                const t = new Date(b.startAt).getTime();
                return t < min ? t : min;
            }, Infinity);
            const firstDate = new Date(earliest);
            scrollTarget = Math.max(0, ((firstDate.getHours() - START_HOUR) + (firstDate.getMinutes() / 60)) * HOUR_HEIGHT - HOUR_HEIGHT);
        } else {
            scrollTarget = HOUR_HEIGHT;
        }

        container.scrollTo({ top: scrollTarget, behavior: "smooth" });
        hasScrolledRef.current = true;
    }, [currentTimeOffset, bookings]);

    // --- Drag to reschedule handlers ---
    const handleDragStart = useCallback((e: React.MouseEvent, booking: BookingView) => {
        if (!onReschedule) return;
        // Don't allow dragging completed, cancelled, or no-show bookings
        if (["completed", "cancelled", "no_show"].includes(booking.status)) return;

        e.preventDefault();
        e.stopPropagation();

        const start = new Date(booking.startAt);
        const originalGridTop = timeToOffset(start.getHours(), start.getMinutes());

        // Get the column element for this booking's staff
        const columnEl = columnRefs.current.get(booking.staffId);
        if (!columnEl) return;

        const columnRect = columnEl.getBoundingClientRect();
        const grabOffsetY = e.clientY - (columnRect.top + HEADER_HEIGHT + originalGridTop);

        // Set up a delayed drag start (150ms hold) to distinguish from clicks
        pendingDragBooking.current = { booking, startY: e.clientY, grabOffsetY };
        dragStartMouseY.current = e.clientY;

        dragTimeout.current = setTimeout(() => {
            if (!pendingDragBooking.current) return;
            isDragging.current = true;

            const end = new Date(booking.endAt);
            setDrag({
                bookingId: booking._id,
                booking,
                staffId: booking.staffId,
                grabOffsetY: pendingDragBooking.current.grabOffsetY,
                currentGridTop: originalGridTop,
                originalGridTop,
                durationMs: end.getTime() - start.getTime(),
            });
        }, 150);
    }, [onReschedule]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        // Cancel drag start if mouse moved significantly before timeout fires (it's a click)
        if (pendingDragBooking.current && !isDragging.current) {
            const dist = Math.abs(e.clientY - dragStartMouseY.current);
            if (dist > 4) {
                // Enough movement to treat as intentional drag - start drag immediately
                const { booking, grabOffsetY } = pendingDragBooking.current;
                if (dragTimeout.current) clearTimeout(dragTimeout.current);

                isDragging.current = true;
                const start = new Date(booking.startAt);
                const end = new Date(booking.endAt);
                const originalGridTop = timeToOffset(start.getHours(), start.getMinutes());

                setDrag({
                    bookingId: booking._id,
                    booking,
                    staffId: booking.staffId,
                    grabOffsetY,
                    currentGridTop: originalGridTop,
                    originalGridTop,
                    durationMs: end.getTime() - start.getTime(),
                });
            }
        }

        if (!isDragging.current || !drag) return;

        const columnEl = columnRefs.current.get(drag.staffId);
        if (!columnEl) return;

        const columnRect = columnEl.getBoundingClientRect();
        const relativeY = e.clientY - columnRect.top - HEADER_HEIGHT - drag.grabOffsetY;

        // Snap to 15-minute intervals
        const time = offsetToTime(relativeY);
        const newGridTop = timeToOffset(time.hours, time.minutes);

        // Clamp: don't let the booking overflow bottom
        const durationHours = drag.durationMs / (1000 * 60 * 60);
        const maxTop = ((END_HOUR + 1) - START_HOUR - durationHours) * HOUR_HEIGHT;
        const clampedTop = Math.max(0, Math.min(newGridTop, maxTop));

        setDrag(prev => prev ? { ...prev, currentGridTop: clampedTop } : null);
    }, [drag]);

    const handleMouseUp = useCallback(() => {
        // Clear pending drag
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

        // Calculate the new start time
        const newTime = offsetToTime(drag.currentGridTop);

        // Build the new startAt timestamp using the currentDate
        const newStart = new Date(currentDate);
        newStart.setHours(newTime.hours, newTime.minutes, 0, 0);
        const newStartAt = newStart.getTime();

        // Only trigger if time actually changed
        const originalTime = offsetToTime(drag.originalGridTop);
        if (newTime.hours !== originalTime.hours || newTime.minutes !== originalTime.minutes) {
            onReschedule?.(drag.bookingId, newStartAt);
        }

        setDrag(null);
    }, [drag, currentDate, onReschedule]);

    // Attach global listeners while dragging
    useEffect(() => {
        if (drag) {
            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("mouseup", handleMouseUp);
            // Prevent text selection while dragging
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

    // Cleanup on mouseup even without drag state (for cancelled drags)
    useEffect(() => {
        const cleanPending = () => {
            if (dragTimeout.current) clearTimeout(dragTimeout.current);
            pendingDragBooking.current = null;
        };
        window.addEventListener("mouseup", cleanPending);
        return () => window.removeEventListener("mouseup", cleanPending);
    }, []);

    // Derive the drag preview time label
    const dragTimeLabel = useMemo(() => {
        if (!drag) return null;
        const newTime = offsetToTime(drag.currentGridTop);
        const endMs = drag.durationMs;
        const endMinutes = newTime.hours * 60 + newTime.minutes + endMs / (1000 * 60);
        const endH = Math.floor(endMinutes / 60);
        const endM = Math.round(endMinutes % 60);
        return {
            start: `${String(newTime.hours).padStart(2, "0")}:${String(newTime.minutes).padStart(2, "0")}`,
            end: `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`,
            changed: drag.currentGridTop !== drag.originalGridTop,
        };
    }, [drag]);

    return (
        <div ref={scrollContainerRef} className={cn("flex relative min-w-max pb-10", drag && "select-none")}>
            {/* Left Time Axis */}
            <div className="w-12 shrink-0 border-r border-border/50 sticky left-0 bg-card z-20">
                <div className="h-14 border-b border-border/50 bg-muted/10"></div>

                {hours.map(h => (
                    <div key={h} className="text-[10px] text-muted-foreground pr-1 relative" style={{ height: HOUR_HEIGHT }}>
                        <span className="absolute -top-[7px] right-1 font-medium bg-card px-0.5 opacity-70">
                            {format(new Date().setHours(h, 0), "HH:mm")}
                        </span>
                        <span className="absolute right-1 font-medium bg-card px-0.5 opacity-40 text-[9px]" style={{ top: HOUR_HEIGHT / 2 - 5 }}>
                            {format(new Date().setHours(h, 30), "HH:mm")}
                        </span>
                    </div>
                ))}
            </div>

            {/* Current Time Indicator */}
            {currentTimeOffset !== null && (
                <div
                    className="absolute left-12 right-0 border-t-[1.5px] border-danger z-10 pointer-events-none"
                    style={{ top: currentTimeOffset + HEADER_HEIGHT }}
                >
                    <div className="absolute -left-1.5 -top-[5px] w-[9px] h-[9px] rounded-full bg-danger animate-pulse" />
                </div>
            )}

            {/* Staff Columns */}
            <div className="flex-1 flex divide-x divide-border/40">
                {staffMembers.map(staff => {
                    const staffBookings = bookings.filter(b => b.staffId === staff._id);

                    return (
                        <div
                            key={staff._id}
                            className="flex-1 min-w-[220px] relative group/column"
                            ref={(el) => { if (el) columnRefs.current.set(staff._id, el); }}
                        >
                            {/* Staff Header */}
                            <div className="h-14 flex items-center justify-center font-medium text-sm border-b border-border/50 bg-card sticky top-0 z-20 transition-colors">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold overflow-hidden">
                                        {staff.avatarUrl ? (
                                            <Image src={staff.avatarUrl} alt={staff.displayName} width={24} height={24} className="w-full h-full object-cover" />
                                        ) : (
                                            staff.displayName.charAt(0)
                                        )}
                                    </div>
                                    <span>{staff.displayName}</span>
                                    {staffBookings.length > 0 && (
                                        <span className="text-[10px] font-semibold bg-muted/50 text-muted-foreground px-1.5 py-0.5 rounded-full">
                                            {staffBookings.length}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Grid Lines */}
                            {hours.map(h => (
                                <div
                                    key={h}
                                    className="border-b border-border/10 border-dashed relative group/slot transition-colors hover:bg-muted/5 cursor-pointer"
                                    style={{ height: HOUR_HEIGHT }}
                                    onClick={() => { /* open New Booking modal for this staff + slot */ }}
                                >
                                    <div
                                        className="absolute left-0 right-0 border-b border-border/5 border-dotted pointer-events-none"
                                        style={{ top: HOUR_HEIGHT / 2 }}
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/slot:opacity-100 transition-opacity pointer-events-none">
                                        <div className="bg-background border border-border/50 shadow-sm rounded-md p-1.5 text-muted-foreground/50">
                                            <IconPlus className="h-5 w-5" />
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Ghost guide: original position while dragging */}
                            {drag && drag.staffId === staff._id && drag.currentGridTop !== drag.originalGridTop && (
                                <div
                                    className="absolute left-1 right-1 z-[5] rounded-[8px] border-2 border-dashed border-muted-foreground/20 bg-muted/10 pointer-events-none"
                                    style={{
                                        top: drag.originalGridTop + HEADER_HEIGHT,
                                        height: Math.max((drag.durationMs / (1000 * 60 * 60)) * HOUR_HEIGHT, 24),
                                    }}
                                />
                            )}

                            {/* Bookings */}
                            {staffBookings.map(booking => {
                                const isDraggingThis = drag?.bookingId === booking._id;
                                const start = new Date(booking.startAt);
                                const end = new Date(booking.endAt);
                                const startHour = start.getHours() + start.getMinutes() / 60;
                                const endHour = end.getHours() + end.getMinutes() / 60;

                                const clampedStart = Math.max(startHour, START_HOUR);
                                const clampedEnd = Math.min(endHour, END_HOUR + 1);
                                if (clampedEnd <= clampedStart) return null;

                                const top = isDraggingThis
                                    ? drag!.currentGridTop + HEADER_HEIGHT
                                    : (clampedStart - START_HOUR) * HOUR_HEIGHT + HEADER_HEIGHT;

                                const height = isDraggingThis
                                    ? (drag!.durationMs / (1000 * 60 * 60)) * HOUR_HEIGHT
                                    : (clampedEnd - clampedStart) * HOUR_HEIGHT;

                                const canDrag = onReschedule && !["completed", "cancelled", "no_show"].includes(booking.status);

                                return (
                                    <div
                                        key={booking._id}
                                        className={cn(
                                            "absolute left-1 right-1 z-10 p-[1px] group/booking",
                                            isDraggingThis && "z-30 opacity-90",
                                            isDraggingThis && "transition-none",
                                            !isDraggingThis && drag && "opacity-40 transition-opacity duration-200",
                                        )}
                                        style={{
                                            top,
                                            height: Math.max(height, 24),
                                            transition: isDraggingThis ? "none" : undefined,
                                        }}
                                    >
                                        {/* Drag handle */}
                                        {canDrag && !drag && (
                                            <div
                                                className="absolute -left-0 top-0 bottom-0 w-5 flex items-center justify-center opacity-0 group-hover/booking:opacity-100 transition-opacity cursor-grab z-20"
                                                onMouseDown={(e) => handleDragStart(e, booking)}
                                            >
                                                <div className="bg-background/90 backdrop-blur border border-border/60 shadow-sm rounded-l-md px-0.5 py-2">
                                                    <IconGripVertical className="h-3 w-3 text-muted-foreground" />
                                                </div>
                                            </div>
                                        )}

                                        {/* Drag time tooltip */}
                                        {isDraggingThis && dragTimeLabel && (
                                            <div className={cn(
                                                "absolute -top-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 px-2.5 py-1 rounded-md shadow-lg text-[11px] font-semibold whitespace-nowrap pointer-events-none",
                                                dragTimeLabel.changed
                                                    ? "bg-primary text-primary-foreground"
                                                    : "bg-muted text-muted-foreground"
                                            )}>
                                                <IconClock className="h-3 w-3" />
                                                {dragTimeLabel.start} – {dragTimeLabel.end}
                                            </div>
                                        )}

                                        <BookingCard
                                            booking={booking}
                                            isSelected={selectedBookingId === booking._id}
                                            onClick={() => {
                                                if (!isDragging.current) {
                                                    onSelectBooking(booking._id);
                                                }
                                            }}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
