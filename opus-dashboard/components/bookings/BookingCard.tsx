"use client";

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

    const getStatusStyles = () => {
        switch (booking.status) {
            case "checked_in": return "bg-accent border-primary/30 text-foreground shadow-xs";
            case "completed": return "bg-success/10 border-success/30 text-foreground opacity-90";
            case "no_show": return "bg-danger/10 border-danger/30 text-danger shadow-xs";
            case "cancelled": return "bg-muted/40 border-border border-dashed text-muted-foreground opacity-60";
            case "confirmed":
            default:
                return "bg-card border-border text-foreground shadow-xs";
        }
    };

    const getStatusIcon = () => {
        if (booking.status === "checked_in" || booking.status === "completed") {
            return <IconCircleCheck className="h-3.5 w-3.5 text-success shrink-0" />;
        }
        if (isAiBooked) {
            return <IconSparkles className="h-3.5 w-3.5 text-primary shrink-0" />;
        }
        return <IconDotsCircleHorizontal className="h-3.5 w-3.5 opacity-50 shrink-0" />;
    };

    return (
        <div
            onClick={onClick}
            className={cn(
                "w-full h-full rounded-[8px] border px-2 py-1 flex items-center gap-1.5 overflow-hidden cursor-pointer transition-colors duration-200",
                getStatusStyles(),
                isSelected ? "ring-2 ring-primary border-primary shadow-xs z-20" : "hover:brightness-95 hover:z-10"
            )}
        >
            <div className="font-mono font-medium text-[10px] shrink-0 opacity-90 w-9 tabular-nums">
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

        </div>
    );
}
