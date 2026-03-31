"use client";

import { useMemo, useState, useEffect } from "react";
import { format, formatDistanceToNow, setHours, setMinutes, startOfDay, addDays, isBefore } from "date-fns";
import {
    IconX,
    IconWand,
    IconClock,
    IconUser,
    IconPhone,
    IconMail,
    IconBrandWhatsapp,
    IconCurrencyPound,
    IconCalendarOff,
    IconChartLine,
    IconCalendarStar,
    IconAlertCircle,
    IconMessageCircle,
    IconTrendingUp,
    IconSparkles,
    IconCalendarTime,
    IconArrowRight,
    IconChevronRight,
    IconChevronLeft
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Price } from "@/components/ui/price";

export function BookingSidebar({
    booking,
    onClose,
    onReschedule
}: {
    booking: any | null;
    onClose: () => void;
    onReschedule?: (bookingId: string, newStartAt: number) => void;
}) {
    const [showReschedule, setShowReschedule] = useState(false);
    const [rescheduleDate, setRescheduleDate] = useState<Date | null>(null);

    // Reset reschedule panel when the selected booking changes
    useEffect(() => {
        setShowReschedule(false);
        setRescheduleDate(null);
    }, [booking?._id]);

    if (!booking) {
        return (
            <div className="h-full flex flex-col rounded-xl pt-6 pb-6 px-4 md:px-6 relative text-center">
                <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                    <div className="text-primary mb-2">
                        <IconWand className="h-8 w-8" />
                    </div>

                    <div>
                        <h3 className="text-2xl font-display font-medium tracking-tight text-foreground">
                            Smart Schedule
                        </h3>
                        <p className="text-muted-foreground mt-2 text-sm leading-relaxed max-w-[280px] mx-auto">
                            The intelligent split-view schedule. Click on any booking to view contextual details and AI insights.
                        </p>
                    </div>

                    <div className="w-full max-w-[340px] mx-auto mt-8 flex flex-col gap-3">
                        {/* Gap Optimizer Card */}
                        <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/40 dark:to-purple-950/40 border border-violet-100 dark:border-violet-500/20 rounded-2xl p-4 md:p-5 relative overflow-hidden group">
                            {/* Decorative Background */}
                            <div className="absolute -top-6 -right-6 p-4 opacity-5 group-hover:opacity-10 transition-opacity duration-500 rotate-12">
                                <IconSparkles className="h-32 w-32 text-violet-500" />
                            </div>

                            <div className="flex items-start gap-3.5 relative z-10">
                                <div className="bg-white dark:bg-violet-500/20 shadow-sm border border-violet-50 dark:border-violet-500/30 p-2.5 rounded-xl text-violet-600 dark:text-violet-400 shrink-0">
                                    <IconCalendarStar className="h-5 w-5" />
                                </div>
                                <div className="text-left mt-0.5">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-semibold text-sm text-violet-950 dark:text-violet-100 tracking-tight">Gap Optimizer</h4>
                                        {/* <span className="bg-violet-600 text-white text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-widest shadow-sm">Active</span> */}
                                    </div>
                                    <p className="text-[12px] text-violet-700/80 dark:text-violet-300/80 mt-1.5 leading-relaxed font-medium">
                                        AI has identified <strong className="text-violet-900 dark:text-violet-200">2 unbooked 30-min slots</strong> disrupting your schedule flow today.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-5 pt-4 border-t border-violet-200/60 dark:border-violet-500/20 flex items-center justify-between relative z-10">
                                <div className="text-left">
                                    <p className="text-[9px] uppercase font-bold text-violet-500/80 dark:text-violet-400/80 tracking-widest mb-0.5">Revenue Potential</p>
                                    <div className="flex items-center gap-1.5">
                                        <IconChartLine className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-500 stroke-[2.5]" />
                                        <span className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400 tracking-tight"><Price amount={8500} /></span>
                                    </div>
                                </div>

                                <Button size="sm" className="h-8 gap-1.5 bg-violet-600 hover:bg-violet-700 text-white shadow min-w-[100px] text-xs px-3 rounded-full transition-all hover:shadow-md">
                                    <IconWand className="h-3.5 w-3.5" />
                                    Fill Gaps
                                </Button>
                            </div>
                        </div>

                        {/* Daily Tip Card */}
                        <div className="bg-card shadow-s dark:shadow-l rounded-2xl p-3.5 flex items-start gap-3 text-left hover:border-primary/30 transition-colors">
                            <div className="bg-amber-100 dark:bg-amber-500/20 shadow-inner p-2 rounded-xl text-amber-600 dark:text-amber-500 shrink-0">
                                <IconTrendingUp className="h-4 w-4" />
                            </div>
                            <div className="mt-0.5">
                                <h4 className="font-semibold text-xs text-foreground">Peak Time Approaching</h4>
                                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed font-medium">
                                    Historical data shows 20% higher walk-in traffic between <span className="text-foreground">14:00-16:00</span> on Thursdays.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const { customer, service, staff, startAt, endAt, source, status } = booking;

    // Dummy / Derived data
    const isAiBooked = source?.startsWith("ai_");
    const ltvMinorUnits = customer?.totalSpendMinorUnits ?? 14500;
    const lastVisit = customer?.lastVisitAt ? format(new Date(customer.lastVisitAt), "MMM d, yyyy") : "First visit";
    const totalVisits = customer?.totalVisits || 1;
    const isNoShowRisk = (customer?.noShowRiskScore || 0) >= 0.7;

    return (
        <div className="h-full flex flex-col bg-card/80 backdrop-blur-3xl rounded-xl text-foreground w-full  relative">
            {/* Header Sticky */}
            <div className="sticky top-0 z-10 p-5 flex justify-between items-start bg-card/90 backdrop-blur-md border-b border-border shadow-sm shrink-0 rounded-xl">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-xl font-semibold border border-border shadow-inner overflow-hidden relative">
                        {customer?.avatarUrl ? (
                            <img src={customer.avatarUrl} alt={customer.name} className="w-full h-full object-cover" />
                        ) : (
                            customer?.name?.charAt(0) || <IconUser className="opacity-50" />
                        )}
                        {/* New Client Badge on Avatar */}
                        {totalVisits === 1 && (
                            <div className="absolute -top-1 -right-1 bg-indigo-500 text-white text-[9px] px-1 py-0.5 rounded shadow">
                                NEW
                            </div>
                        )}
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold tracking-tight">{customer?.name || "Unknown Client"}</h2>
                        <div className="flex items-center gap-2 text-xs font-medium mt-1">
                            <span className="text-emerald-600 bg-emerald-100 dark:bg-emerald-500/20 px-2 py-0.5 rounded-full">
                                LTV: <Price amount={ltvMinorUnits} showDecimals={false} />
                            </span>
                            <span className="text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                {totalVisits} {totalVisits === 1 ? 'visit' : 'visits'}
                            </span>
                        </div>
                    </div>
                </div>

                <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-muted-foreground hover:bg-muted/50 rounded-full shrink-0">
                    <IconX className="h-4 w-4" />
                </Button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">

                {/* Booking Core Info */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center px-4 py-3 bg-zinc-50 dark:bg-zinc-900/40 rounded-xl border border-border dark:border-zinc-800 shadow-sm">
                        <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Time</p>
                            <div className="font-semibold text-sm flex items-center gap-1.5">
                                <IconClock className="h-4 w-4 text-primary opacity-80" />
                                {format(new Date(startAt), "h:mm a")} - {format(new Date(endAt), "h:mm a")}
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Date</p>
                            <div className="font-semibold text-sm">
                                {format(new Date(startAt), "MMM d, yyyy")}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-between items-center px-4 py-3 bg-zinc-50 dark:bg-zinc-900/40 rounded-xl border border-border dark:border-zinc-800 shadow-sm">
                        <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Service</p>
                            <div className="font-semibold text-sm">
                                {service?.name || "Service"}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">with {staff?.displayName || "Staff"}</div>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Price</p>
                            <div className="font-semibold text-sm">
                                <Price amount={booking.priceMinorUnits || 0} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* AI Insights & Context */}
                <div className="space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <IconSparkles className="h-3 w-3" />
                        Intelligence
                    </h4>

                    {/* AI Notes */}
                    <div className="bg-violet-50 dark:bg-violet-500/5 border border-violet-100 dark:border-violet-500/10 rounded-xl p-3 shadow-sm">
                        <div className="flex items-start gap-2.5">
                            <div className="bg-violet-100 dark:bg-violet-500/10 p-1.5 rounded-lg text-violet-600 dark:text-violet-400 shrink-0 mt-0.5">
                                {isAiBooked ? <IconBrandWhatsapp className="h-4 w-4" /> : <IconMessageCircle className="h-4 w-4" />}
                            </div>
                            <div>
                                <p className="text-xs font-medium text-violet-900 dark:text-violet-300 mb-1">
                                    {isAiBooked ? "AI Handled Booking via WhatsApp" : "System Note"}
                                </p>
                                <p className="text-xs text-violet-700/90 dark:text-violet-300/60 leading-relaxed font-medium">
                                    {booking.customerNote || "Client mentioned they have a sensitive scalp and prefer a softer blend. Also asked about the beard oil."}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Upsell Suggestion */}
                    <div className="bg-indigo-50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/10 rounded-xl p-3 shadow-sm flex items-start gap-2.5">
                        <div className="bg-indigo-100 dark:bg-indigo-500/10 p-1.5 rounded-lg text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5">
                            <IconTrendingUp className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-indigo-900 dark:text-indigo-300 mb-1">Upsell Suggestion</p>
                            <p className="text-xs text-indigo-700/90 dark:text-indigo-300/60 leading-relaxed font-medium">
                                Usually gets a beard trim; suggestion: mention the new beard oil (+<Price amount={1500} showDecimals={false} />).
                            </p>
                        </div>
                    </div>

                    {/* No-Show Warning */}
                    {isNoShowRisk && (
                        <div className="bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/10 rounded-xl p-3 shadow-sm flex items-start gap-2.5">
                            <div className="bg-amber-100 dark:bg-amber-500/10 p-1.5 rounded-lg text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                                <IconAlertCircle className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-amber-900 dark:text-amber-300 mb-1">High No-Show Risk</p>
                                <p className="text-xs text-amber-700/90 dark:text-amber-300/60 leading-relaxed font-medium">
                                    This client has a {Math.round(customer.noShowRiskScore * 100)}% risk of no-showing based on history.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Last Visit Details */}
                <div className="text-xs text-muted-foreground font-medium pt-2 pb-6 flex items-center gap-2">
                    <IconClock className="h-3 w-3" />
                    Last visited: {lastVisit}
                </div>
            </div>

            {/* Reschedule Inline Panel */}
            {showReschedule && (
                <ReschedulePanel
                    booking={booking}
                    rescheduleDate={rescheduleDate}
                    onDateChange={setRescheduleDate}
                    onConfirm={(newStartAt) => {
                        onReschedule?.(booking._id, newStartAt);
                        setShowReschedule(false);
                        setRescheduleDate(null);
                    }}
                    onCancel={() => {
                        setShowReschedule(false);
                        setRescheduleDate(null);
                    }}
                />
            )}

            {/* Sticky Actions Footer */}
            <div className="p-4 border-t border-border bg-card/90 backdrop-blur-md shadow-[0_-4px_10px_rgba(0,0,0,0.02)] shrink-0 gap-2 flex flex-col pt-3 z-20 rounded-xl">
                <Button
                    variant={showReschedule ? "secondary" : "terracotta"}
                    size="sm"
                    className={cn(
                        "w-full h-9 gap-1.5",
                        showReschedule && "ring-1 ring-primary/30 bg-primary/5",
                    )}
                    onClick={() => setShowReschedule(!showReschedule)}
                    disabled={["completed", "cancelled", "no_show"].includes(status)}
                >
                    <IconCalendarTime className="h-3.5 w-3.5" />
                    {showReschedule ? "Cancel Reschedule" : "Reschedule"}
                </Button>

                <div className="grid grid-cols-2 gap-2 w-full">
                    <Button variant="outline" size="sm" disabled className="w-full h-9 text-xs gap-1.5 text-muted-foreground">
                        <IconCurrencyPound className="h-3.5 w-3.5" />
                        Send Payment
                    </Button>
                    <Button variant="outline" size="sm" disabled className="w-full h-9 text-xs gap-1.5 text-muted-foreground">
                        <IconCalendarOff className="h-3.5 w-3.5" />
                        No-Show Charge
                    </Button>
                </div>
            </div>
        </div>
    );
}

// --- Reschedule Time Picker Panel ---

function ReschedulePanel({
    booking,
    rescheduleDate,
    onDateChange,
    onConfirm,
    onCancel
}: {
    booking: any;
    rescheduleDate: Date | null;
    onDateChange: (date: Date | null) => void;
    onConfirm: (newStartAt: number) => void;
    onCancel: () => void;
}) {
    const [selectedTime, setSelectedTime] = useState<string | null>(null);

    const bookingStart = new Date(booking.startAt);
    const bookingDate = rescheduleDate || startOfDay(bookingStart);

    // Generate 15-minute time slots from 8:00 to 20:00
    const timeSlots = useMemo(() => {
        const slots: { label: string; value: string; hours: number; minutes: number }[] = [];
        for (let h = 8; h <= 20; h++) {
            for (let m = 0; m < 60; m += 15) {
                if (h === 20 && m > 0) break;
                const label = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
                slots.push({ label, value: `${h}:${m}`, hours: h, minutes: m });
            }
        }
        return slots;
    }, []);

    // Current time for this booking
    const currentTimeStr = format(bookingStart, "HH:mm");

    const handleConfirm = () => {
        if (!selectedTime) return;
        const [h, m] = selectedTime.split(":").map(Number);
        const newStart = new Date(bookingDate);
        newStart.setHours(h, m, 0, 0);
        onConfirm(newStart.getTime());
    };

    // Calculate service duration
    const serviceDurationMins = Math.round((booking.endAt - booking.startAt) / (1000 * 60));

    return (
        <div className="border-t border-border bg-background/50">
            {/* Header */}
            <div className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <IconCalendarTime className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">Reschedule</span>
                </div>
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                    {serviceDurationMins} min · {booking.service?.name}
                </span>
            </div>

            {/* Date Switcher */}
            <div className="px-4 pb-2 flex items-center gap-2">
                <Button
                    variant="ghost" size="icon" className="h-7 w-7 shrink-0"
                    onClick={() => {
                        const prev = addDays(bookingDate, -1);
                        if (!isBefore(prev, startOfDay(new Date()))) {
                            onDateChange(prev);
                            setSelectedTime(null);
                        }
                    }}
                >
                    <IconChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs font-semibold flex-1 text-center">
                    {format(bookingDate, "EEE, MMM d")}
                </span>
                <Button
                    variant="ghost" size="icon" className="h-7 w-7 shrink-0"
                    onClick={() => {
                        onDateChange(addDays(bookingDate, 1));
                        setSelectedTime(null);
                    }}
                >
                    <IconChevronRight className="h-3.5 w-3.5" />
                </Button>
            </div>

            {/* Time Slot Grid */}
            <div className="px-4 pb-3 max-h-[180px] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-4 gap-1">
                    {timeSlots.map(slot => {
                        const isCurrentSlot = slot.label === currentTimeStr && !rescheduleDate;
                        const isSelected = selectedTime === `${slot.hours}:${slot.minutes}`;

                        return (
                            <button
                                key={slot.value}
                                onClick={() => setSelectedTime(`${slot.hours}:${slot.minutes}`)}
                                className={cn(
                                    "text-[11px] font-medium py-1.5 px-1 rounded-md border transition-all",
                                    isSelected
                                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                        : isCurrentSlot
                                            ? "bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/30 text-amber-700 dark:text-amber-400"
                                            : "bg-card border-border/50 text-foreground hover:bg-muted/50 hover:border-border"
                                )}
                            >
                                {slot.label}
                                {isCurrentSlot && !isSelected && (
                                    <span className="block text-[8px] text-amber-500 font-bold uppercase tracking-wider mt-0.5">Current</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Confirm */}
            {selectedTime && (
                <div className="px-4 pb-3">
                    <Button
                        size="sm"
                        className="w-full h-9 gap-2"
                        onClick={handleConfirm}
                    >
                        <IconArrowRight className="h-3.5 w-3.5" />
                        Move to {format(bookingDate, "MMM d")} at {selectedTime ? `${String(selectedTime.split(":")[0]).padStart(2, "0")}:${String(selectedTime.split(":")[1]).padStart(2, "0")}` : ""}
                    </Button>
                </div>
            )}
        </div>
    );
}
