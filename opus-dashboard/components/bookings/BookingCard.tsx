"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import {
    IconSparkles,
    IconCircleCheck,
    IconDotsCircleHorizontal
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { BookingView } from "./types";

export function BookingCard({
    booking,
    isSelected,
    onClick
}: {
    booking: BookingView;
    isSelected: boolean;
    onClick: () => void;
}) {
    const start = new Date(booking.startAt);

    // Derived states
    const isAiBooked = booking.source?.startsWith("ai_");

    const paymentStatus = useMemo(() => {
        if (booking.depositPaidAt && !booking.paymentIntentId) return "Deposit";
        if (booking.paymentIntentId && booking.status === "completed") return "Paid";
        return "Unpaid";
    }, [booking]);

    const getStatusStyles = () => {
        switch (booking.status) {
            case "checked_in": return "bg-blue-100 border-blue-300 text-blue-900 dark:bg-blue-500/10 dark:border-blue-500/50 dark:text-blue-200 shadow-sm";
            case "completed": return "bg-emerald-100 border-emerald-300 text-emerald-900 dark:bg-emerald-500/10 dark:border-emerald-500/50 dark:text-emerald-200 opacity-90";
            case "no_show": return "bg-red-100 border-red-300 text-red-900 dark:bg-red-500/10 dark:border-red-500/50 dark:text-red-200 shadow-sm";
            case "cancelled": return "bg-red-50 border-red-200 border-dashed text-red-600 dark:bg-zinc-500/5 dark:border-zinc-500/20 dark:text-zinc-500 opacity-60";
            case "confirmed":
            default:
                if (paymentStatus === "Unpaid" && booking.status === "confirmed") {
                    return "bg-amber-100 border-amber-300 text-amber-950 dark:bg-amber-500/10 dark:border-amber-500/50 dark:text-amber-200 shadow-sm";
                }
                return "bg-zinc-100 border-zinc-300 text-zinc-900 dark:bg-zinc-800/40 dark:border-zinc-700 dark:text-zinc-400 shadow-sm";
        }
    };

    const getStatusIcon = () => {
        if (booking.status === "checked_in" || booking.status === "completed") {
            return <IconCircleCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />;
        }
        if (isAiBooked) {
            return <IconSparkles className="h-3.5 w-3.5 text-violet-500 dark:text-violet-400 shrink-0" />;
        }
        return <IconDotsCircleHorizontal className="h-3.5 w-3.5 opacity-50 shrink-0" />;
    };

    const getPaymentBadge = () => {
        if (paymentStatus === "Paid") return "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30 shadow-sm";
        if (paymentStatus === "Unpaid") return "bg-red-500 text-white border-red-600 dark:bg-red-600/80 dark:border-red-500 shadow-sm";
        if (paymentStatus === "Deposit") return "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30 shadow-sm";
        return "bg-zinc-200 text-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700";
    };

    return (
        <div
            onClick={onClick}
            className={cn(
                "w-full h-full rounded-[8px] border px-2 py-1 flex items-center gap-1.5 overflow-hidden cursor-pointer transition-colors duration-200",
                getStatusStyles(),
                isSelected ? "ring-1 ring-primary border-primary/50 shadow-sm z-20" : "hover:brightness-95 hover:z-10"
            )}
        >
            <div className="font-semibold text-[10px] shrink-0 opacity-80 w-8">
                {format(start, "HH:mm")}
            </div>

            {getStatusIcon()}

            <div className="font-semibold text-xs truncate shrink-0 max-w-[100px]">
                {booking.customer?.name || "Unknown"}
            </div>

            <div className="text-[11px] opacity-70 px-1 shrink-0">·</div>

            <div className="text-[11px] opacity-90 truncate flex-1 font-medium">
                {booking.service?.name || "Service"}
            </div>

            <div className={cn(
                "text-[9px] px-1 rounded flex items-center border font-semibold tracking-wide shrink-0",
                getPaymentBadge()
            )}>
                {paymentStatus}
            </div>
        </div>
    );
}
