"use client";

import { useState } from "react";
import { addDays, format, isBefore, startOfDay } from "date-fns";
import Image from "next/image";
import { useQuery } from "convex/react";
import {
    CalendarClock,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock,
    LogIn,
    Sparkles,
    User,
    UserX,
    WandSparkles,
    X,
} from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Price } from "@/components/ui/price";
import { cn } from "@/lib/utils";
import { BookingView } from "./types";

type RescheduleHandler = (bookingId: Id<"bookings">, newStartAt: number) => Promise<boolean>;
type BookingActionHandler = (bookingId: Id<"bookings">) => void;

export function BookingSidebar({
    booking,
    onClose,
    onReschedule,
    onCancel,
    onCheckIn,
    onComplete,
    onMarkNoShow,
    isUpdating = false,
}: {
    booking: BookingView | null;
    onClose: () => void;
    onReschedule?: RescheduleHandler;
    onCancel?: BookingActionHandler;
    onCheckIn?: BookingActionHandler;
    onComplete?: BookingActionHandler;
    onMarkNoShow?: BookingActionHandler;
    isUpdating?: boolean;
}) {
    const [showReschedule, setShowReschedule] = useState(false);
    const [rescheduleDate, setRescheduleDate] = useState<Date | null>(null);
    const [confirmingCancel, setConfirmingCancel] = useState(false);

    if (!booking) {
        return (
            <div className="flex h-full flex-col items-center justify-center rounded-xl px-6 py-10 text-center">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                    <WandSparkles className="h-6 w-6" />
                </div>
                <h3 className="font-display text-xl font-semibold">Smart schedule</h3>
                <p className="mt-2 max-w-[260px] text-sm leading-relaxed text-muted-foreground">
                    Select a booking to see the customer, service, status, and appointment actions.
                </p>
            </div>
        );
    }

    const { customer, service, staff, startAt, endAt, source, status } = booking;
    const totalVisits = customer?.totalVisits ?? 0;
    const isAiBooked = source?.startsWith("ai_") ?? false;
    const isTerminal = ["completed", "cancelled", "no_show"].includes(status);

    return (
        <div className="flex h-full w-full flex-col rounded-xl bg-card/80 text-foreground backdrop-blur-3xl">
            <div className="flex shrink-0 items-start justify-between border-b border-border p-5">
                <div className="flex min-w-0 items-center gap-3">
                    <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
                        {customer?.avatarUrl ? (
                            <Image
                                src={customer.avatarUrl}
                                alt={customer.name}
                                width={44}
                                height={44}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            customer?.name?.charAt(0) || <User className="h-5 w-5 text-muted-foreground" />
                        )}
                    </div>
                    <div className="min-w-0">
                        <h2 className="truncate font-semibold">{customer?.name ?? "Unknown customer"}</h2>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            {totalVisits > 0 ? `${totalVisits} previous ${totalVisits === 1 ? "visit" : "visits"}` : "New customer"}
                        </p>
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 shrink-0 rounded-full">
                    <X className="h-4 w-4" />
                </Button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-5">
                <section className="grid grid-cols-2 gap-3">
                    <Detail label="Date" value={format(new Date(startAt), "MMM d, yyyy")} />
                    <Detail label="Time" value={`${format(new Date(startAt), "HH:mm")}–${format(new Date(endAt), "HH:mm")}`} />
                    <Detail label="Service" value={service?.name ?? "Service"} />
                    <Detail label="Professional" value={staff?.displayName ?? "Staff"} />
                </section>

                <section className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-4 py-3">
                    <div>
                        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Booking value</p>
                        <p className="mt-1 font-semibold"><Price amount={booking.priceMinorUnits} /></p>
                    </div>
                    <div className="text-right">
                        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Status</p>
                        <p className="mt-1 text-sm font-semibold capitalize">{status.replace("_", " ")}</p>
                    </div>
                </section>

                {booking.customerNote && (
                    <section className="rounded-xl border border-border bg-muted/20 px-4 py-3">
                        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Customer note</p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{booking.customerNote}</p>
                    </section>
                )}

                {isAiBooked && (
                    <section className="flex gap-3 rounded-xl border border-violet-200 bg-violet-50 p-3 text-violet-950 dark:border-violet-500/20 dark:bg-violet-500/5 dark:text-violet-200">
                        <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
                        <div>
                            <p className="text-sm font-semibold">AI-assisted booking</p>
                            <p className="mt-1 text-xs leading-relaxed opacity-75">
                                The front desk created this appointment from a customer conversation.
                            </p>
                        </div>
                    </section>
                )}
            </div>

            {showReschedule && (
                <ReschedulePanel
                    booking={booking}
                    rescheduleDate={rescheduleDate}
                    onDateChange={setRescheduleDate}
                    onConfirm={async (newStartAt) => {
                        const changed = await onReschedule?.(booking._id, newStartAt);
                        if (changed) {
                            setShowReschedule(false);
                            setRescheduleDate(null);
                        }
                    }}
                />
            )}

            <div className="flex shrink-0 flex-col gap-2 border-t border-border p-4">
                {!isTerminal && (
                    <div className="grid grid-cols-2 gap-2">
                        {status === "confirmed" && (
                            <Button
                                variant="outline"
                                onClick={() => onCheckIn?.(booking._id)}
                                disabled={!onCheckIn || isUpdating}
                            >
                                <LogIn data-icon="inline-start" />
                                Check in
                            </Button>
                        )}
                        {["confirmed", "checked_in"].includes(status) && (
                            <Button
                                variant="outline"
                                onClick={() => onComplete?.(booking._id)}
                                disabled={!onComplete || isUpdating}
                            >
                                <CheckCircle2 data-icon="inline-start" />
                                Complete
                            </Button>
                        )}
                        {["confirmed", "checked_in"].includes(status) && (
                            <Button
                                variant="outline"
                                onClick={() => onMarkNoShow?.(booking._id)}
                                disabled={!onMarkNoShow || isUpdating}
                            >
                                <UserX data-icon="inline-start" />
                                No-show
                            </Button>
                        )}
                        <Button
                            variant="destructive"
                            onClick={() => {
                                if (!confirmingCancel) {
                                    setConfirmingCancel(true);
                                    return;
                                }
                                onCancel?.(booking._id);
                                setConfirmingCancel(false);
                            }}
                            disabled={!onCancel || isUpdating}
                        >
                            {confirmingCancel ? "Confirm cancel" : "Cancel booking"}
                        </Button>
                    </div>
                )}
                <Button
                    variant={showReschedule ? "secondary" : "terracotta"}
                    className="w-full gap-2"
                    onClick={() => setShowReschedule((visible) => !visible)}
                    disabled={!onReschedule || isUpdating || isTerminal}
                >
                    <CalendarClock className="h-4 w-4" />
                    {showReschedule ? "Close rescheduler" : "Reschedule booking"}
                </Button>
            </div>
        </div>
    );
}

function Detail({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border border-border bg-muted/20 px-3 py-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="mt-1 truncate text-sm font-semibold">{value}</p>
        </div>
    );
}

function ReschedulePanel({
    booking,
    rescheduleDate,
    onDateChange,
    onConfirm,
}: {
    booking: BookingView;
    rescheduleDate: Date | null;
    onDateChange: (date: Date | null) => void;
    onConfirm: (newStartAt: number) => Promise<void>;
}) {
    const [selectedStartAt, setSelectedStartAt] = useState<number | null>(null);
    const bookingStart = new Date(booking.startAt);
    const bookingDate = rescheduleDate ?? startOfDay(bookingStart);
    const date = format(bookingDate, "yyyy-MM-dd");
    const availableSlots = useQuery(api.slots.getAvailableSlots, {
        orgId: booking.orgId,
        staffId: booking.staffId,
        serviceId: booking.serviceId,
        date,
    });

    const handleConfirm = async () => {
        if (!selectedStartAt) return;
        await onConfirm(selectedStartAt);
    };

    return (
        <div className="border-t border-border bg-background/70 px-4 py-3">
            <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold">
                    <Clock className="h-4 w-4 text-accent" />
                    Choose a new time
                </div>
                <span className="text-xs text-muted-foreground">
                    {Math.round((booking.endAt - booking.startAt) / 60_000)} min
                </span>
            </div>

            <div className="mb-3 flex items-center gap-2">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                        const previousDate = addDays(bookingDate, -1);
                        if (!isBefore(previousDate, startOfDay(new Date()))) {
                            onDateChange(previousDate);
                            setSelectedStartAt(null);
                        }
                    }}
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="flex-1 text-center text-sm font-semibold">{format(bookingDate, "EEE, MMM d")}</span>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                        onDateChange(addDays(bookingDate, 1));
                        setSelectedStartAt(null);
                    }}
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>

            <div className="max-h-40 overflow-y-auto">
                <div className="grid grid-cols-4 gap-1">
                    {availableSlots?.map((slot) => (
                        <button
                            key={slot.startAt}
                            type="button"
                            onClick={() => setSelectedStartAt(slot.startAt)}
                            className={cn(
                                "rounded-md border px-1 py-1.5 text-[11px] font-medium transition-colors",
                                selectedStartAt === slot.startAt
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border bg-card hover:bg-muted",
                            )}
                        >
                            {format(new Date(slot.startAt), "HH:mm")}
                        </button>
                    ))}
                </div>
                {availableSlots === undefined && (
                    <p className="py-4 text-center text-xs text-muted-foreground">Loading available times…</p>
                )}
                {availableSlots?.length === 0 && (
                    <p className="py-4 text-center text-xs text-muted-foreground">No available times on this date.</p>
                )}
            </div>

            <Button size="sm" className="mt-3 w-full" disabled={!selectedStartAt} onClick={handleConfirm}>
                Confirm new time
            </Button>
        </div>
    );
}
