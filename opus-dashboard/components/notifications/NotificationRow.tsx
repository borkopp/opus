"use client";

import Link from "next/link";
import type { FunctionReturnType } from "convex/server";
import { formatDistanceToNow } from "date-fns";
import { mk, sq } from "date-fns/locale";
import {
  Bell,
  BellRing,
  CalendarClock,
  CalendarPlus,
  CalendarX,
  Loader2,
  TriangleAlert,
  X,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { getDashboardNotificationCopy } from "@/lib/i18n/dashboard-notifications";
import { cn } from "@/lib/utils";

export type DashboardNotification = FunctionReturnType<
  typeof api.dashboardNotifications.list
>[number];

export function getNotificationAppearance(type: string) {
  switch (type) {
    case "new_booking":
      return { Icon: CalendarPlus, className: "bg-primary/10 text-primary" };
    case "booking_changed":
      return { Icon: CalendarClock, className: "bg-primary/10 text-primary" };
    case "booking_cancelled":
      return {
        Icon: CalendarX,
        className: "bg-destructive/10 text-destructive",
      };
    case "no_show":
      return { Icon: TriangleAlert, className: "bg-warning/15 text-warning" };
    case "ai_handoff":
      return { Icon: BellRing, className: "bg-warning/15 text-warning" };
    default:
      return { Icon: Bell, className: "bg-secondary text-muted-foreground" };
  }
}

export function NotificationRow({
  notification,
  compact = false,
  pending,
  onRead,
  onDismiss,
  onOpened,
}: {
  notification: DashboardNotification;
  compact?: boolean;
  pending: boolean;
  onRead: (
    notification: DashboardNotification,
    reportFailure?: boolean,
  ) => Promise<boolean>;
  onDismiss: () => Promise<boolean>;
  onOpened?: () => void;
}) {
  const { language, locale, t } = useDashboardI18n();
  const copy = getDashboardNotificationCopy(language, notification);
  const { Icon, className: iconClassName } = getNotificationAppearance(
    notification.type,
  );
  const open = async () => {
    if (pending || !(await onRead(notification))) return;
    onOpened?.();
  };
  const content = (
    <>
      <span
        aria-hidden="true"
        className={cn(
          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl sm:size-9",
          iconClassName,
        )}
      >
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block text-sm leading-snug [overflow-wrap:anywhere]",
            !notification.isRead ? "font-semibold" : "font-medium",
          )}
        >
          {copy.title}
          {!notification.isRead && (
            <>
              <span
                aria-hidden="true"
                className="ml-2 inline-block size-1.5 rounded-full bg-primary align-middle"
              />
              <span className="sr-only">
                {" "}
                — {t("Unread", "Непрочитано", "I palexuar")}
              </span>
            </>
          )}
        </span>
        <span
          className={cn(
            "mt-1 block leading-relaxed text-muted-foreground [overflow-wrap:anywhere]",
            compact ? "text-xs" : "text-sm",
          )}
        >
          {copy.body}
        </span>
        <time
          className="mt-1.5 block text-xs text-muted-foreground"
          dateTime={new Date(notification.createdAt).toISOString()}
          title={new Intl.DateTimeFormat(locale, {
            dateStyle: "medium",
            timeStyle: "short",
          }).format(notification.createdAt)}
        >
          {formatDistanceToNow(notification.createdAt, {
            addSuffix: true,
            locale: language === "sq" ? sq : language === "mk" ? mk : undefined,
          })}
        </time>
      </span>
    </>
  );
  const actionClassName =
    "flex min-w-0 flex-1 items-start gap-2.5 rounded-lg p-3 text-left transition-colors hover:bg-secondary/60 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring sm:gap-3 sm:p-4";

  return (
    <div
      className={cn(
        "flex items-start rounded-lg border-l-2",
        notification.isRead
          ? "border-l-transparent"
          : "border-l-primary bg-primary/[0.035]",
      )}
      aria-busy={pending}
    >
      {notification.href ? (
        <Link
          href={notification.href}
          prefetch={false}
          className={actionClassName}
          onNavigate={() => {
            // Read tracking must not hold up navigation while Convex reconnects.
            void onRead(notification, true);
            onOpened?.();
          }}
        >
          {content}
        </Link>
      ) : (
        <button
          type="button"
          className={actionClassName}
          disabled={pending}
          onClick={() => void open()}
        >
          {content}
        </button>
      )}
      <button
        type="button"
        disabled={pending}
        className="mr-1 mt-1 flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50 sm:mr-2 sm:mt-2"
        aria-label={`${t("Dismiss notification", "Отфрли известување", "Hiq njoftimin")}: ${copy.title}`}
        onClick={() => void onDismiss()}
      >
        {pending ? (
          <Loader2
            aria-hidden="true"
            className="size-4 animate-spin motion-reduce:animate-none"
          />
        ) : (
          <X aria-hidden="true" className="size-4" />
        )}
      </button>
    </div>
  );
}
