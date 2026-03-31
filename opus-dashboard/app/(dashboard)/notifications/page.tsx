"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    IconBell,
    IconBellRinging,
    IconCalendarPlus,
    IconCalendarOff,
    IconAlertTriangle,
    IconCheck,
    IconX,
} from "@tabler/icons-react";

type FilterTab = "all" | "unread" | "new_booking" | "booking_cancelled" | "no_show";

function getTypeConfig(type: string) {
    switch (type) {
        case "new_booking":
            return {
                icon: <IconCalendarPlus size={18} stroke={2} />,
                iconBg: "bg-accent/10 text-accent",
                label: "New Booking",
            };
        case "booking_cancelled":
            return {
                icon: <IconCalendarOff size={18} stroke={2} />,
                iconBg: "bg-destructive/10 text-destructive",
                label: "Cancellation",
            };
        case "no_show":
            return {
                icon: <IconAlertTriangle size={18} stroke={2} />,
                iconBg: "bg-amber-500/10 text-amber-600",
                label: "No-Show",
            };
        default:
            return {
                icon: <IconBell size={18} stroke={2} />,
                iconBg: "bg-secondary text-muted-foreground",
                label: "Notification",
            };
    }
}

const TABS: { id: FilterTab; label: string }[] = [
    { id: "all", label: "All" },
    { id: "unread", label: "Unread" },
    { id: "new_booking", label: "New Bookings" },
    { id: "booking_cancelled", label: "Cancellations" },
    { id: "no_show", label: "No-Shows" },
];

export default function NotificationsPage() {
    const router = useRouter();
    const profile = useQuery(api.users.getMyProfile);
    const orgId = profile?.orgId as Id<"orgs"> | undefined;

    const notifications = useQuery(
        api.dashboardNotifications.list,
        orgId ? { orgId } : "skip",
    );
    const unreadCount = useQuery(
        api.dashboardNotifications.getUnreadCount,
        orgId ? { orgId } : "skip",
    );

    const markRead = useMutation(api.dashboardNotifications.markRead);
    const markAllRead = useMutation(api.dashboardNotifications.markAllRead);
    const dismiss = useMutation(api.dashboardNotifications.dismiss);

    const [activeTab, setActiveTab] = useState<FilterTab>("all");

    const filtered = (notifications ?? []).filter((n) => {
        if (activeTab === "all") return true;
        if (activeTab === "unread") return !n.isRead;
        return n.type === activeTab;
    });

    const handleClick = (n: (typeof filtered)[0]) => {
        if (!orgId) return;
        if (!n.isRead) markRead({ orgId, notificationId: n._id });
        if (n.bookingId) router.push("/beauty/bookings");
    };

    if (!orgId) return null;

    return (
        <div className="w-full max-w-2xl mx-auto py-8 px-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold font-display text-primary">Notifications</h1>
                    {(unreadCount ?? 0) > 0 && (
                        <p className="text-sm text-muted-foreground mt-0.5">
                            {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
                        </p>
                    )}
                </div>
                {(unreadCount ?? 0) > 0 && (
                    <button
                        onClick={() => markAllRead({ orgId })}
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors border border-border/40 rounded-full px-3 py-1.5"
                    >
                        <IconCheck size={14} />
                        Mark all read
                    </button>
                )}
            </div>

            {/* Filter tabs */}
            <div className="flex items-center gap-1.5 mb-4 flex-wrap">
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            "text-xs font-medium px-3 py-1.5 rounded-full transition-colors border",
                            activeTab === tab.id
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-secondary text-muted-foreground border-border/40 hover:bg-secondary/80",
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* List */}
            <div className="bg-card border border-border/40 rounded-[24px] overflow-hidden divide-y divide-border/30">
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                        <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center mb-3">
                            {(unreadCount ?? 0) === 0
                                ? <IconBell size={20} className="text-muted-foreground/50" />
                                : <IconBellRinging size={20} className="text-muted-foreground/50" />
                            }
                        </div>
                        <p className="text-sm font-medium text-foreground">Nothing here</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            {activeTab === "unread" ? "You're all caught up." : "No notifications in this category yet."}
                        </p>
                    </div>
                ) : (
                    filtered.map((n) => {
                        const { icon, iconBg } = getTypeConfig(n.type);
                        return (
                            <div
                                key={n._id}
                                className={cn(
                                    "group relative flex items-start gap-4 px-5 py-4 transition-colors cursor-pointer",
                                    "hover:bg-secondary/40",
                                    !n.isRead && "bg-primary/[0.03] border-l-2 border-l-accent",
                                    n.isRead && "border-l-2 border-l-transparent",
                                )}
                                onClick={() => handleClick(n)}
                            >
                                <div className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full", iconBg)}>
                                    {icon}
                                </div>
                                <div className="flex-1 min-w-0 pr-8">
                                    <p className={cn("text-sm leading-snug", !n.isRead ? "font-semibold text-foreground" : "font-medium text-foreground")}>
                                        {n.title}
                                    </p>
                                    <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
                                        {n.body}
                                    </p>
                                    <p className="text-xs text-muted-foreground/60 mt-1 font-outfit">
                                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                                    </p>
                                </div>
                                {!n.isRead && (
                                    <div className="absolute right-10 top-4 h-2 w-2 rounded-full bg-accent" />
                                )}
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        dismiss({ orgId, notificationId: n._id });
                                    }}
                                    className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 hover:text-destructive text-muted-foreground/40"
                                >
                                    <IconX size={14} />
                                </button>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
