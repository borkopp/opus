"use client";

import { useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { format, isSameDay, startOfDay, addDays, subDays, isBefore } from "date-fns";
import {
    IconPlus,
    IconChevronLeft,
    IconChevronRight,
    IconSparkles,
    IconCalendarOff,
    IconLayoutList,
    IconCalendarEvent,
    IconFilter
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { BookingsTimeline } from "./BookingsTimeline";
import { BookingSidebar } from "./BookingSidebar";
import { BookingsList } from "./BookingsList";
import { cn } from "@/lib/utils";
import { Price } from "@/components/ui/price";

export function BookingsSplitView({ bookings, staffMembers, orgId }: { bookings: any[], staffMembers: any[], orgId: string }) {
    const rescheduleBooking = useMutation(api.bookings.rescheduleBooking);
    const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
    const [currentDate, setCurrentDate] = useState(startOfDay(new Date()));
    const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
    const [statusFilter, setStatusFilter] = useState<"all" | "upcoming" | "completed" | "unpaid" | "no-show">("all");

    const todayBookings = bookings.filter(b => isSameDay(new Date(b.startAt), currentDate));

    // Day Summary Calculations
    const totalBookingsCount = todayBookings.length;

    const projectedRevenueMinorUnits = todayBookings.reduce((sum, b) => b.status !== "cancelled" && b.status !== "no_show" ? sum + (b.priceMinorUnits || 0) : sum, 0);

    // Simplistic collected calc: completed + checked_in or has payment intent
    const collectedRevenue = todayBookings.reduce((sum, b) => {
        if (b.status === "completed" || b.paymentIntentId) {
            return sum + (b.priceMinorUnits || 0);
        }
        return sum;
    }, 0);

    // Filtering logic for the main view
    const filteredBookings = todayBookings.filter(b => {
        if (statusFilter === "all") return true;

        const now = Date.now();
        const start = new Date(b.startAt).getTime();

        // Unpaid logic
        const paymentStatus = (b.depositPaidAt && !b.paymentIntentId) ? "Deposit" : (b.paymentIntentId && b.status === "completed" ? "Paid" : "Unpaid");

        if (statusFilter === "completed") return b.status === "completed";
        if (statusFilter === "no-show") return b.status === "no_show";
        if (statusFilter === "unpaid") return paymentStatus === "Unpaid";
        if (statusFilter === "upcoming") return b.status === "confirmed" && start > now;

        return true;
    });

    const selectedBooking = bookings.find(b => b._id === selectedBookingId);

    // Shared reschedule handler for both drag-and-drop and sidebar button
    const handleReschedule = useCallback(async (bookingId: string, newStartAt: number) => {
        try {
            await rescheduleBooking({
                orgId: orgId as any,
                bookingId: bookingId as any,
                newStartAt,
            });
            // After rescheduling, deselect the old booking (it was cancelled + new one created)
            setSelectedBookingId(null);
        } catch (err: any) {
            console.error("Reschedule failed:", err);
            // In a real app, this would show a toast notification
            alert(err?.data ?? err?.message ?? "Failed to reschedule booking. The slot may conflict with another booking.");
        }
    }, [rescheduleBooking, orgId]);

    return (
        <div className="flex flex-col h-full gap-4">
            {/* Header / Live View */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-2 sm:gap-4">
                    <h1 className="text-3xl font-display font-semibold tracking-tight text-foreground">
                        Bookings
                    </h1>

                    <div className="hidden sm:flex h-8 w-[1px] bg-border mx-1"></div>

                    <div className="hidden sm:flex items-center gap-3 text-sm">
                        <div className="flex items-baseline gap-1.5">
                            <span className="font-semibold text-foreground tracking-tight">{totalBookingsCount}</span>
                            <span className="text-muted-foreground font-medium text-xs uppercase tracking-wider">Bookings</span>
                        </div>

                        <span className="text-border px-1">·</span>

                        <div className="flex items-baseline gap-1.5 line-clamp-1">
                            <span className="font-semibold text-emerald-600 dark:text-emerald-500 tracking-tight"><Price amount={collectedRevenue} showDecimals={false} /></span>
                            <span className="text-muted-foreground font-medium text-xs uppercase tracking-wider"><span className="lowercase font-normal opacity-70">/ <Price amount={projectedRevenueMinorUnits} showDecimals={false} /></span></span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* Dummy Gap Filler Button */}
                    <Button variant="outline" className="gap-2 bg-gradient-to-r from-violet-500/10 hover:text-violet-700 to-fuchsia-500/10 border-violet-500/30 text-violet-700 dark:text-violet-300 hover:bg-violet-500/20">
                        <IconSparkles className="h-4 w-4" />
                        Fill Gaps
                    </Button>
                    <Button variant="terracotta">
                        <IconPlus className="mr-2 h-4 w-4" />
                        New Booking
                    </Button>
                </div>
            </div>

            {/* Split View Container */}
            <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-visible min-h-[600px] relative">

                {/* 70% Left: Schedule Main Area */}
                <div className="flex-1 overflow-hidden bg-card shadow-s dark:shadow-l rounded-xl flex flex-col">

                    {/* Action & Filter Bar */}
                    <div className="p-3 border-b border-border/40 flex flex-wrap justify-between items-center gap-3">
                        {/* Date Nav */}
                        <div className="flex items-center gap-2 rounded-md p-1 bg-background">
                            <Button variant="ghost" size="icon" className="h-7 w-7 border-none rounded-l-sm rounded-r-[2px]" onClick={() => setCurrentDate(subDays(currentDate, 1))}>
                                <IconChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-sm font-semibold w-36 text-center select-none tracking-tight">
                                {format(currentDate, "EEE, MMM d")}
                            </span>
                            <Button variant="ghost" size="icon" className="h-7 w-7 border-none rounded-l-none rounded-r-sm" onClick={() => setCurrentDate(addDays(currentDate, 1))}>
                                <IconChevronRight className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* View Filters & Toggles */}
                        <div className="flex items-center gap-3">
                            {/* Status Filter Tabs */}
                            <div className="hidden lg:flex items-center rounded-md bg-background p-1 shadow-s dark:shadow-l overflow-hidden text-xs font-medium">
                                <button onClick={() => setStatusFilter("all")} className={cn("px-3 py-1.5 rounded transition-colors", statusFilter === "all" ? "bg-muted/30 text-foreground rounded-md" : "text-muted-foreground hover:bg-muted/20 hover:text-muted-foreground rounded-md")}>All</button>
                                <button onClick={() => setStatusFilter("upcoming")} className={cn("px-3 py-1.5 rounded transition-colors", statusFilter === "upcoming" ? "bg-muted/30 text-foreground rounded-md" : "text-muted-foreground hover:bg-muted/20 hover:text-muted-foreground rounded-md")}>Upcoming</button>
                                <button onClick={() => setStatusFilter("completed")} className={cn("px-3 py-1.5 rounded transition-colors", statusFilter === "completed" ? "bg-muted/30 text-foreground rounded-md" : "text-muted-foreground hover:bg-muted/20 hover:text-muted-foreground rounded-md")}>Completed</button>
                                <button onClick={() => setStatusFilter("unpaid")} className={cn("px-3 py-1.5 rounded transition-colors", statusFilter === "unpaid" ? "bg-muted/30 text-foreground rounded-md" : "text-muted-foreground hover:bg-muted/20 hover:text-muted-foreground rounded-md")}>Unpaid</button>
                                <button onClick={() => setStatusFilter("no-show")} className={cn("px-3 py-1.5 rounded transition-colors", statusFilter === "no-show" ? "bg-muted/30 text-foreground rounded-md" : "text-muted-foreground hover:bg-muted/20 hover:text-muted-foreground rounded-md")}>No-Show</button>
                            </div>

                            {/* Mobile Filter */}
                            <Button variant="outline" size="icon" className="h-9 w-9 lg:hidden text-muted-foreground">
                                <IconFilter className="h-4 w-4" />
                            </Button>

                            <div className="w-px h-6 bg-border mx-1 hidden sm:block"></div>

                            {/* View Mode Toggle */}
                            <div className="flex items-center gap-2">
                                <Button
                                    variant={viewMode === "list" ? "secondary" : "ghost"}
                                    size="sm"
                                    className={cn("h-7 px-2.5", viewMode === "list" ? "shadow-sm" : "opacity-70 hover:opacity-100 shadow-s dark:shadow-l")}
                                    onClick={() => setViewMode("list")}
                                >
                                    <IconLayoutList className="h-4 w-4 mr-1.5" />
                                    List
                                </Button>
                                <Button
                                    variant={viewMode === "calendar" ? "secondary" : "ghost"}
                                    size="sm"
                                    className={cn("h-7 px-2.5", viewMode === "calendar" ? "shadow-sm" : "opacity-70 hover:opacity-100")}
                                    onClick={() => setViewMode("calendar")}
                                >
                                    <IconCalendarEvent className="h-4 w-4 mr-1.5" />
                                    Calendar
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div data-scroll-container className="flex-1 overflow-y-auto overflow-x-auto relative bg-background/50">
                        {staffMembers.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8">
                                <IconCalendarOff className="h-10 w-10 mb-4 opacity-50" />
                                <p className="font-medium text-foreground">No staff members found</p>
                            </div>
                        ) : filteredBookings.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8">
                                <IconCalendarOff className="h-10 w-10 mb-4 opacity-30" />
                                <p className="font-medium text-foreground">No bookings found</p>
                                <p className="text-sm">Try a different filter or date.</p>
                            </div>
                        ) : viewMode === "calendar" ? (
                            <BookingsTimeline
                                bookings={filteredBookings}
                                staffMembers={staffMembers}
                                selectedBookingId={selectedBookingId}
                                onSelectBooking={(id: string | null) => setSelectedBookingId(id === selectedBookingId ? null : id)}
                                onReschedule={handleReschedule}
                                currentDate={currentDate}
                            />
                        ) : (
                            <BookingsList
                                bookings={filteredBookings}
                                staffMembers={staffMembers}
                                selectedBookingId={selectedBookingId}
                                onSelectBooking={(id: string | null) => setSelectedBookingId(id === selectedBookingId ? null : id)}
                            />
                        )}
                    </div>
                </div>

                {/* 30% Right: Sidebar */}
                <div className="w-full md:w-[320px] lg:w-[380px] shrink-0 bg-card shadow-s dark:shadow-l rounded-xl flex flex-col">
                    <BookingSidebar booking={selectedBooking} onClose={() => setSelectedBookingId(null)} onReschedule={handleReschedule} />
                </div>
            </div>
        </div>
    );
}

