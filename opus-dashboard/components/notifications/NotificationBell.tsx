"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useEffect, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    IconBell,
    IconBellRinging,
    IconCalendarPlus,
    IconCalendarOff,
    IconAlertTriangle,
    IconX,
    IconCheck,
    IconArrowRight,
} from "@tabler/icons-react";

// ─────────────────────────────────────────────────────
// Web Audio chime — no audio file required
// ─────────────────────────────────────────────────────
function playChime() {
    try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
        osc.onended = () => ctx.close();
    } catch {
        // AudioContext not available (SSR or blocked)
    }
}

// ─────────────────────────────────────────────────────
// Notification type metadata
// ─────────────────────────────────────────────────────
function getTypeConfig(type: string) {
    switch (type) {
        case "new_booking":
            return {
                icon: <IconCalendarPlus size={16} stroke={2} />,
                iconBg: "bg-accent/10 text-accent",
            };
        case "booking_cancelled":
            return {
                icon: <IconCalendarOff size={16} stroke={2} />,
                iconBg: "bg-destructive/10 text-destructive",
            };
        case "no_show":
            return {
                icon: <IconAlertTriangle size={16} stroke={2} />,
                iconBg: "bg-amber-500/10 text-amber-600",
            };
        default:
            return {
                icon: <IconBell size={16} stroke={2} />,
                iconBg: "bg-secondary text-muted-foreground",
            };
    }
}

// ─────────────────────────────────────────────────────
// Single notification row
// ─────────────────────────────────────────────────────
function NotificationItem({
    notification,
    onDismiss,
    onRead,
}: {
    notification: any;
    onDismiss: (id: Id<"dashboard_notifications">) => void;
    onRead: (id: Id<"dashboard_notifications">) => void;
}) {
    const router = useRouter();
    const { icon, iconBg } = getTypeConfig(notification.type);

    const handleClick = () => {
        onRead(notification._id);
        if (notification.bookingId) {
            router.push(`/beauty/bookings`);
        }
    };

    return (
        <div
            className={cn(
                "group relative flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer",
                "hover:bg-secondary/40",
                !notification.isRead && "bg-primary/[0.03] border-l-2 border-l-accent",
                notification.isRead && "border-l-2 border-l-transparent",
            )}
            onClick={handleClick}
        >
            {/* Type icon */}
            <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full", iconBg)}>
                {icon}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pr-6">
                <p className={cn("text-sm leading-snug", !notification.isRead ? "font-semibold text-foreground" : "font-medium text-foreground")}>
                    {notification.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {notification.body}
                </p>
                <p className="text-[10px] text-muted-foreground/60 mt-1 font-outfit">
                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                </p>
            </div>

            {/* Unread dot */}
            {!notification.isRead && (
                <div className="absolute right-8 top-3.5 h-2 w-2 rounded-full bg-accent" />
            )}

            {/* Dismiss button */}
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onDismiss(notification._id);
                }}
                className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-destructive/10 hover:text-destructive text-muted-foreground/40"
            >
                <IconX size={13} />
            </button>
        </div>
    );
}

// ─────────────────────────────────────────────────────
// Bell + dropdown
// ─────────────────────────────────────────────────────
export function NotificationBell({ orgId }: { orgId: Id<"orgs"> }) {
    const notifications = useQuery(api.dashboardNotifications.list, { orgId });
    const unreadCount = useQuery(api.dashboardNotifications.getUnreadCount, { orgId });
    const markRead = useMutation(api.dashboardNotifications.markRead);
    const markAllRead = useMutation(api.dashboardNotifications.markAllRead);
    const dismiss = useMutation(api.dashboardNotifications.dismiss);

    const [open, setOpen] = useState(false);
    const [pulse, setPulse] = useState(false);
    const prevCountRef = useRef<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Sound + pulse on new notification
    useEffect(() => {
        if (unreadCount === undefined) return;
        if (prevCountRef.current === null) {
            prevCountRef.current = unreadCount;
            return;
        }
        if (unreadCount > prevCountRef.current) {
            if (document.visibilityState === "visible") {
                playChime();
            }
            setPulse(true);
            setTimeout(() => setPulse(false), 3000);
        }
        prevCountRef.current = unreadCount;
    }, [unreadCount]);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    const hasUnread = (unreadCount ?? 0) > 0;

    return (
        <div ref={containerRef} className="relative">
            {/* Bell button */}
            <button
                onClick={() => setOpen((v) => !v)}
                className={cn(
                    "relative flex items-center justify-center h-10 w-10 rounded-full transition-colors border",
                    open
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-secondary text-primary hover:bg-secondary/80 border-border/40",
                )}
            >
                {hasUnread ? (
                    <IconBellRinging className="h-5 w-5" />
                ) : (
                    <IconBell className="h-5 w-5" />
                )}

                {/* Count badge */}
                {hasUnread && (
                    <span className={cn(
                        "absolute -top-1 -right-1 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-accent text-accent-foreground text-[10px] font-bold px-1 leading-none",
                        pulse && "animate-pulse",
                    )}>
                        {(unreadCount ?? 0) > 99 ? "99+" : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {open && (
                <div className={cn(
                    "absolute right-0 top-12 z-50 w-[380px] rounded-[20px] border border-border/40 bg-card shadow-lg overflow-hidden",
                    "animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-150",
                )}>
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold font-display text-primary">Notifications</span>
                            {hasUnread && (
                                <span className="text-[10px] font-bold bg-accent/10 text-accent px-1.5 py-0.5 rounded-full">
                                    {unreadCount} new
                                </span>
                            )}
                        </div>
                        {hasUnread && (
                            <button
                                onClick={() => markAllRead({ orgId })}
                                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <IconCheck size={12} />
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* List */}
                    <div className="max-h-[420px] overflow-y-auto divide-y divide-border/30">
                        {!notifications || notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                                <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center mb-3">
                                    <IconBell size={18} className="text-muted-foreground/50" />
                                </div>
                                <p className="text-sm font-medium text-foreground">All caught up</p>
                                <p className="text-xs text-muted-foreground mt-1">New bookings and updates will appear here.</p>
                            </div>
                        ) : (
                            notifications.map((n) => (
                                <NotificationItem
                                    key={n._id}
                                    notification={n}
                                    onDismiss={(id) => dismiss({ orgId, notificationId: id })}
                                    onRead={(id) => {
                                        if (!n.isRead) markRead({ orgId, notificationId: id });
                                        setOpen(false);
                                    }}
                                />
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    {notifications && notifications.length > 0 && (
                        <div className="border-t border-border/40 px-4 py-2.5">
                            <a
                                href="/notifications"
                                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                                onClick={() => setOpen(false)}
                            >
                                View all notifications
                                <IconArrowRight size={12} />
                            </a>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
