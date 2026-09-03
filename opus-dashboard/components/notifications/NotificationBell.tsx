"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import type { FunctionReturnType } from "convex/server";
import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { formatDistanceToNow } from "date-fns";
import { mk } from "date-fns/locale";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { getDashboardNotificationCopy } from "@/lib/i18n/dashboard-notifications";
import {
  Bell,
  BellRing,
  CalendarPlus,
  CalendarX,
  TriangleAlert,
  X,
  Check,
  ArrowRight,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type DashboardNotification = FunctionReturnType<
  typeof api.dashboardNotifications.list
>[number];

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
export function getNotificationTypeConfig(
  type: string,
  t?: (en: string, mk: string) => string,
) {
  switch (type) {
    case "new_booking":
      return {
        icon: <CalendarPlus size={16} strokeWidth={2} />,
        iconBg: "bg-accent text-accent-foreground",
        label: t ? t("New Booking", "Нов термин") : "New Booking",
      };
    case "booking_cancelled":
      return {
        icon: <CalendarX size={16} strokeWidth={2} />,
        iconBg: "bg-destructive/10 text-destructive",
        label: t ? t("Cancellation", "Откажан термин") : "Cancellation",
      };
    case "no_show":
      return {
        icon: <TriangleAlert size={16} strokeWidth={2} />,
        iconBg: "bg-highlight/15 text-warning",
        label: t ? t("No-Show", "Непојавување") : "No-Show",
      };
    default:
      return {
        icon: <Bell size={16} strokeWidth={2} />,
        iconBg: "bg-secondary text-muted-foreground",
        label: t ? t("Notification", "Известување") : "Notification",
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
  notification: DashboardNotification;
  onDismiss: (id: Id<"dashboard_notifications">) => void;
  onRead: (id: Id<"dashboard_notifications">) => void;
}) {
  const { language, t } = useDashboardI18n();
  const router = useRouter();
  const { icon, iconBg } = getNotificationTypeConfig(notification.type, t);
  const copy = getDashboardNotificationCopy(language, notification);

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
      <div
        className={cn(
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          iconBg,
        )}
      >
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pr-6">
        <p
          className={cn(
            "text-sm leading-snug",
            !notification.isRead
              ? "font-semibold text-foreground"
              : "font-medium text-foreground",
          )}
        >
          {copy.title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
          {copy.body}
        </p>
        <p className="text-[10px] text-muted-foreground/60 mt-1 font-display">
          {formatDistanceToNow(new Date(notification.createdAt), {
            addSuffix: true,
            locale: language === "mk" ? mk : undefined,
          })}
        </p>
      </div>

      {/* Unread dot */}
      {!notification.isRead && (
        <div className="absolute right-8 top-3.5 h-2 w-2 rounded-full bg-primary" />
      )}

      {/* Dismiss button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(notification._id);
        }}
        className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-destructive/10 hover:text-destructive text-muted-foreground/40"
        aria-label={t("Dismiss notification", "Отфрли известување")}
      >
        <X size={13} />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// Inline notification toast
// ─────────────────────────────────────────────────────
const TOAST_DURATION_MS = 5000;

const emptySubscribe = () => () => {};

function NotificationToast({
  notification,
  onDismiss,
  onClick,
}: {
  notification: DashboardNotification;
  onDismiss: () => void;
  onClick: () => void;
}) {
  const { language, t } = useDashboardI18n();
  const { icon, iconBg } = getNotificationTypeConfig(notification.type, t);
  const copy = getDashboardNotificationCopy(language, notification);
  const [exiting, setExiting] = useState(false);
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  const handleDismiss = useCallback(() => {
    setExiting(true);
    setTimeout(onDismiss, 250);
  }, [onDismiss]);

  // Auto-dismiss timer
  useEffect(() => {
    const timer = setTimeout(handleDismiss, TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [handleDismiss]);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={cn(
        "fixed z-[100] w-[340px] max-w-[calc(100vw-2rem)] rounded-2xl border border-border/50 bg-card shadow-2xl overflow-hidden cursor-pointer right-4 top-16",
        "transition-all duration-250 ease-out",
        exiting
          ? "opacity-0 translate-y-[-8px] scale-95"
          : "animate-[notif-toast-in_0.3s_ease-out_forwards]",
      )}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
        handleDismiss();
      }}
    >
      <div className="flex items-start gap-3 p-3.5">
        {/* Icon */}
        <div
          className={cn(
            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
            iconBg,
          )}
        >
          {icon}
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0 pr-5">
          <p className="text-[13px] font-semibold text-foreground leading-snug">
            {copy.title}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
            {copy.body}
          </p>
          <p className="text-[10px] text-muted-foreground/50 mt-1.5 font-medium">
            {t("Just now", "Штотуку")}
          </p>
        </div>

        {/* Close */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleDismiss();
          }}
          className="absolute right-2.5 top-2.5 p-1 rounded-lg hover:bg-secondary text-muted-foreground/40 hover:text-muted-foreground transition-colors"
          aria-label={t("Dismiss notification", "Отфрли известување")}
        >
          <X size={14} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-[2px] w-full bg-border/20">
        <div
          className="h-full bg-accent/60 rounded-full"
          style={{
            animation: `notif-toast-progress ${TOAST_DURATION_MS}ms linear forwards`,
          }}
        />
      </div>
    </div>,
    document.body,
  );
}

// ─────────────────────────────────────────────────────
// Bell + popover dropdown
// ─────────────────────────────────────────────────────
export function NotificationBell({
  orgId,
  placement = "header",
  collapsed = false,
  enableToast,
  enableSound,
}: {
  orgId: Id<"orgs">;
  placement?: "header" | "sidebar" | "sidebar-nav" | "drawer-nav";
  collapsed?: boolean;
  enableToast?: boolean;
  enableSound?: boolean;
}) {
  const { t } = useDashboardI18n();
  const showToast = enableToast ?? placement === "header";
  const showSound = enableSound ?? placement === "header";

  const notifications = useQuery(api.dashboardNotifications.list, { orgId });
  const unreadCount = useQuery(api.dashboardNotifications.getUnreadCount, {
    orgId,
  });
  const orgSettings = useQuery(api.orgSettings.getOrgSettings, { orgId });
  const markRead = useMutation(api.dashboardNotifications.markRead);
  const markAllRead = useMutation(api.dashboardNotifications.markAllRead);
  const dismiss = useMutation(api.dashboardNotifications.dismiss);

  // Dashboard notification preferences (default to true if never set)
  const dashEnabled =
    orgSettings?.settings?.dashboardNotificationsEnabled ?? true;
  const soundEnabled = orgSettings?.settings?.dashboardSoundEnabled ?? true;
  const toastEnabled = orgSettings?.settings?.dashboardToastEnabled ?? true;

  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(false);
  const [toastNotification, setToastNotification] =
    useState<DashboardNotification | null>(null);
  const prevCountRef = useRef<number | null>(null);
  const router = useRouter();

  // Sound + pulse + toast on new notification
  useEffect(() => {
    if (unreadCount === undefined || !notifications) return;
    if (prevCountRef.current === null) {
      prevCountRef.current = unreadCount;
      return;
    }
    if (unreadCount > prevCountRef.current && dashEnabled) {
      if (showSound && soundEnabled && document.visibilityState === "visible") {
        playChime();
      }
      const pulseStartTimer = window.setTimeout(() => setPulse(true), 0);
      const pulseEndTimer = window.setTimeout(() => setPulse(false), 3000);

      // Show toast with the newest notification (only when dropdown is closed)
      if (showToast && toastEnabled && !open && notifications.length > 0) {
        window.setTimeout(() => setToastNotification(notifications[0]), 0);
      }
      prevCountRef.current = unreadCount;
      return () => {
        window.clearTimeout(pulseStartTimer);
        window.clearTimeout(pulseEndTimer);
      };
    }
    prevCountRef.current = unreadCount;
  }, [
    unreadCount,
    notifications,
    open,
    dashEnabled,
    soundEnabled,
    toastEnabled,
    showSound,
    showToast,
  ]);

  const hasUnread = dashEnabled && (unreadCount ?? 0) > 0;

  let triggerElement: React.ReactNode;

  if (placement === "sidebar-nav") {
    if (collapsed) {
      triggerElement = (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => {
                setToastNotification(null);
              }}
              className={cn(
                "group relative flex items-center justify-center rounded-lg transition-all duration-200 cursor-pointer active:scale-[0.98] h-10 w-10 mx-auto outline-none",
                open
                  ? "bg-secondary text-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/70",
              )}
              aria-label={t("Notifications", "Известувања")}
            >
              <div className="shrink-0 flex items-center justify-center relative">
                {hasUnread ? (
                  <BellRing className="h-5 w-5" />
                ) : (
                  <Bell className="h-5 w-5" />
                )}
                {hasUnread && (
                  <span
                    className={cn(
                      "absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent text-accent-foreground text-[10px] font-bold px-1 leading-none",
                      pulse && "animate-pulse",
                    )}
                  >
                    {(unreadCount ?? 0) > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </div>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={12}>
            {t("Notifications", "Известувања")}
            {hasUnread ? ` (${unreadCount})` : ""}
          </TooltipContent>
        </Tooltip>
      );
    } else {
      triggerElement = (
        <button
          type="button"
          onClick={() => {
            setToastNotification(null);
          }}
          className={cn(
            "group relative flex items-center rounded-lg transition-all duration-200 cursor-pointer active:scale-[0.98] h-10 w-full px-3 justify-start gap-3 outline-none",
            open
              ? "bg-secondary text-foreground font-semibold shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/70",
          )}
          aria-label={t("Notifications", "Известувања")}
        >
          <div
            className={cn(
              "shrink-0 flex items-center justify-center transition-colors",
              open
                ? "text-foreground"
                : "text-muted-foreground group-hover:text-foreground",
            )}
          >
            {hasUnread ? (
              <BellRing className="h-5 w-5" />
            ) : (
              <Bell className="h-5 w-5" />
            )}
          </div>

          <span className="text-sm font-medium whitespace-nowrap overflow-hidden truncate">
            {t("Notifications", "Известувања")}
          </span>

          {hasUnread && (
            <span
              className={cn(
                "ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent text-accent-foreground text-[11px] font-bold px-1.5 leading-none",
                pulse && "animate-pulse",
              )}
            >
              {(unreadCount ?? 0) > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      );
    }
  } else if (placement === "drawer-nav") {
    triggerElement = (
      <button
        type="button"
        onClick={() => {
          setToastNotification(null);
        }}
        className={cn(
          "flex w-full items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all active:scale-[0.98] cursor-pointer outline-none",
          open
            ? "bg-secondary text-foreground font-semibold shadow-xs"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary/70",
        )}
        aria-label={t("Notifications", "Известувања")}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "shrink-0",
              open ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {hasUnread ? (
              <BellRing className="h-5 w-5" />
            ) : (
              <Bell className="h-5 w-5" />
            )}
          </div>
          <span>{t("Notifications", "Известувања")}</span>
        </div>

        {hasUnread && (
          <span
            className={cn(
              "flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent text-accent-foreground text-[11px] font-bold px-1.5 leading-none",
              pulse && "animate-pulse",
            )}
          >
            {(unreadCount ?? 0) > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
    );
  } else {
    triggerElement = (
      <button
        type="button"
        onClick={() => {
          setToastNotification(null);
        }}
        className={cn(
          "relative flex items-center justify-center h-10 w-10 rounded-full transition-colors border outline-none cursor-pointer",
          open
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-secondary text-primary hover:bg-secondary/80 border-border/40",
        )}
        aria-label={t("Notifications", "Известувања")}
      >
        {hasUnread ? (
          <BellRing className="h-5 w-5" />
        ) : (
          <Bell className="h-5 w-5" />
        )}

        {/* Count badge */}
        {hasUnread && (
          <span
            className={cn(
              "absolute -top-1 -right-1 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-accent text-accent-foreground text-[10px] font-bold px-1 leading-none",
              pulse && "animate-pulse",
            )}
          >
            {(unreadCount ?? 0) > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
    );
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{triggerElement}</PopoverTrigger>

        <PopoverContent
          side={
            placement === "header" || placement === "drawer-nav"
              ? "bottom"
              : "right"
          }
          align={
            placement === "header"
              ? "end"
              : placement === "sidebar-nav"
                ? "start"
                : "end"
          }
          sideOffset={12}
          className="w-[380px] max-w-[calc(100vw-2rem)] p-0 rounded-xl border border-border/40 bg-card shadow-2xl overflow-hidden z-50"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold font-display text-primary">
                {t("Notifications", "Известувања")}
              </span>
              {hasUnread && (
                <span className="text-[10px] font-bold bg-accent text-accent-foreground px-1.5 py-0.5 rounded-full">
                  {unreadCount} {t("new", "нови")}
                </span>
              )}
            </div>
            {hasUnread && (
              <button
                type="button"
                onClick={() => markAllRead({ orgId })}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <Check size={12} />
                {t("Mark all read", "Означи ги сите како прочитани")}
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto divide-y divide-border/30">
            {!notifications || notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center mb-3">
                  <Bell size={18} className="text-muted-foreground/50" />
                </div>
                <p className="text-sm font-medium text-foreground">
                  {t("All caught up", "Сè е прочитано")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t(
                    "New bookings and updates will appear here.",
                    "Новите термини и известувања ќе се појават тука.",
                  )}
                </p>
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
          <div className="border-t border-border/40 p-2 bg-muted/20">
            <Link
              href="/notifications"
              className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition-colors"
              onClick={() => setOpen(false)}
            >
              <span>
                {t("View all notifications", "Види ги сите известувања")}
              </span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </PopoverContent>
      </Popover>

      {/* Inline toast — shows when a new notification arrives while popover is closed */}
      {toastNotification && !open && (
        <NotificationToast
          notification={toastNotification}
          onDismiss={() => setToastNotification(null)}
          onClick={() => {
            if (toastNotification.bookingId) {
              router.push("/beauty/bookings");
            } else {
              setOpen(true);
            }
          }}
        />
      )}
    </>
  );
}
