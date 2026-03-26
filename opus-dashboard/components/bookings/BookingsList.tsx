"use client";

import { useMemo } from "react";
import { format, differenceInMinutes } from "date-fns";
import { cn } from "@/lib/utils";
import { IconCircleCheck, IconSparkles, IconDotsCircleHorizontal } from "@tabler/icons-react";
import { Price } from "@/components/ui/price";

export function BookingsList({
    bookings,
    staffMembers,
    selectedBookingId,
    onSelectBooking
}: {
    bookings: any[];
    staffMembers: any[];
    selectedBookingId: string | null;
    onSelectBooking: (id: string | null) => void;
}) {

    const sortedBookings = useMemo(() => {
        return [...bookings].sort((a, b) => a.startAt - b.startAt);
    }, [bookings]);

    // Same mapping functions as the card for consistency, but optimized for list
    const getStatusIndicator = (status: string, isAi: boolean, isSelected: boolean) => {
        if (status === "checked_in" || status === "completed") {
            return <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-sm" title="Completed/Checked In" />;
        }
        if (status === "no_show") {
            return <div className="h-2.5 w-2.5 rounded-full bg-red-500 shadow-sm" title="No Show" />;
        }
        if (status === "cancelled") {
            return <div className="h-2.5 w-2.5 rounded-full bg-red-500/50 shadow-sm" title="Cancelled" />;
        }
        if (isAi) {
            return <IconSparkles className="h-3.5 w-3.5 text-violet-500" title="AI Booked" />;
        }
        return <div className={cn("h-2.5 w-2.5 rounded-full shadow-sm", isSelected ? "bg-primary" : "bg-orange-400")} title="Upcoming" />;
    };

    const getPaymentBadgeStyles = (paymentStatus: string) => {
        if (paymentStatus === "Paid") return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20";
        if (paymentStatus === "Unpaid") return "bg-red-100/80 text-red-800 border-red-300 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30 shadow-sm shadow-red-900/5 font-semibold"; // High urgency
        if (paymentStatus === "Deposit") return "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20 shadow-sm font-semibold";
        return "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700";
    };

    return (
        <div className="flex flex-col w-full h-full p-2 gap-1.5 custom-scrollbar">
            {sortedBookings.map(booking => {
                const start = new Date(booking.startAt);
                const end = new Date(booking.endAt);
                const duration = differenceInMinutes(end, start);

                const isSelected = selectedBookingId === booking._id;
                const isAiBooked = booking.source?.startsWith("ai_");

                const paymentStatus = (booking.depositPaidAt && !booking.paymentIntentId) ? "Deposit" :
                    (booking.paymentIntentId && booking.status === "completed" ? "Paid" : "Unpaid");

                return (
                    <div
                        key={booking._id}
                        onClick={() => onSelectBooking(booking._id)}
                        className={cn(
                            "group flex items-center justify-between px-3 py-3 rounded-lg text-sm cursor-pointer hover:bg-muted/30 hover:border-border hover:shadow-m transition-all",
                            isSelected
                                ? "bg-muted/30 border-border/50 shadow-md ring-1 ring-primary/20"
                                : "bg-card border-border/50 hover:border-primary/40 dark:hover:bg-zinc-800/50 "
                        )}
                    >
                        <div className="flex items-center gap-4 flex-1">
                            {/* 10:00 */}
                            <div className="w-12 text-muted-foreground font-semibold text-[13px] text-right shrink-0">
                                {format(start, "HH:mm")}
                            </div>

                            {/* Name */}
                            <div className="w-36 font-semibold text-foreground truncate shrink-0">
                                {booking.customer?.name || "Unknown"}
                            </div>

                            {/* Service · Duration · Staff */}
                            <div className="flex-1 flex items-center gap-2 text-muted-foreground text-[13px] truncate">
                                <span className={cn("truncate font-medium", isSelected ? "text-foreground" : "")}>
                                    {booking.service?.name || "Service"}
                                </span>
                                <span>·</span>
                                <span>{duration}m</span>
                                <span>·</span>
                                <span className="truncate max-w-[120px]">
                                    {booking.staff?.displayName || "Staff"}
                                </span>
                            </div>
                        </div>

                        {/* Right Actions: Price, Payment, Status */}
                        <div className="flex items-center gap-4 shrink-0 justify-end ml-4">
                            <div className="font-semibold text-foreground w-12 text-right">
                                <Price amount={booking.priceMinorUnits || 0} showDecimals={false} />
                            </div>

                            <div className={cn(
                                "w-16 text-center text-[10px] uppercase tracking-wider py-0.5 px-1 rounded border",
                                getPaymentBadgeStyles(paymentStatus)
                            )}>
                                {paymentStatus}
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

