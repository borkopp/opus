"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Bell, BellRing, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useNotificationActions } from "@/hooks/use-notification-actions";
import { getDashboardNotificationCopy } from "@/lib/i18n/dashboard-notifications";
import { cn } from "@/lib/utils";
import { NotificationRow } from "./NotificationRow";
import { NotificationQueryBoundary } from "./NotificationQueryBoundary";
import {
  MarkAllNotificationsRead,
  NotificationActionError,
  NotificationEmpty,
  NotificationLoading,
} from "./NotificationListState";

function playChime() {
  try {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    oscillator.frequency.setValueAtTime(1100, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.5);
    oscillator.onended = () => {
      void ctx.close().catch(() => {});
    };
  } catch {
    // The browser may require a prior user interaction before playing audio.
  }
}

type NotificationBellProps = {
  orgId: Id<"orgs">;
  placement?: "header" | "sidebar" | "sidebar-nav" | "drawer-nav";
  collapsed?: boolean;
  enableToast?: boolean;
  enableSound?: boolean;
};

export function NotificationBell(props: NotificationBellProps) {
  return (
    <NotificationQueryBoundary key={props.orgId} compact>
      <NotificationBellContent {...props} />
    </NotificationQueryBoundary>
  );
}

function NotificationBellContent({
  orgId,
  placement = "header",
  collapsed = false,
  enableToast,
  enableSound,
}: NotificationBellProps) {
  const { language, t } = useDashboardI18n();
  const router = useRouter();
  const mobile = useMediaQuery("(max-width: 767px)");
  const [open, setOpen] = useState(false);
  const notifications = useQuery(api.dashboardNotifications.list, { orgId });
  const unreadCount = useQuery(api.dashboardNotifications.getUnreadCount, {
    orgId,
  });
  const settings = useQuery(api.orgSettings.getOrgSettings, { orgId });
  const actions = useNotificationActions(orgId);
  const seen = useRef<{ ids: Set<string>; newestCreatedAt: number } | null>(
    null,
  );
  const activeToast = useRef<string | number | undefined>(undefined);
  // The shell can mount before saved preferences arrive. Do not enable alerts
  // until settings resolve; only then apply defaults for an unset preference.
  const dashEnabled =
    settings !== undefined &&
    (settings?.settings?.dashboardNotificationsEnabled ?? true);
  const soundEnabled = settings?.settings?.dashboardSoundEnabled ?? true;
  const toastEnabled = settings?.settings?.dashboardToastEnabled ?? true;
  const showToast = enableToast ?? placement === "header";
  const showSound = enableSound ?? placement === "header";
  const count = unreadCount ?? 0;
  const showUnreadBadge = dashEnabled && count > 0;

  useEffect(
    () => () => {
      if (activeToast.current !== undefined) toast.dismiss(activeToast.current);
    },
    [],
  );

  useEffect(() => {
    if (!notifications || settings === undefined) return;
    const previous = seen.current;
    seen.current = {
      ids: new Set(notifications.map((notification) => notification._id)),
      newestCreatedAt: Math.max(
        previous?.newestCreatedAt ?? 0,
        ...notifications.map((notification) => notification.createdAt),
      ),
    };
    if (!previous) return;
    const incoming = notifications.find(
      (notification) =>
        !notification.isRead &&
        !previous.ids.has(notification._id) &&
        notification.createdAt >= previous.newestCreatedAt,
    );
    if (!incoming || !dashEnabled) return;
    if (showSound && soundEnabled && document.visibilityState === "visible")
      playChime();
    if (!showToast || !toastEnabled || open) return;
    const copy = getDashboardNotificationCopy(language, incoming);
    if (activeToast.current !== undefined) toast.dismiss(activeToast.current);
    const id = `dashboard-notification:${orgId}:${incoming._id}`;
    activeToast.current = id;
    toast(copy.title, {
      id,
      description: copy.body,
      duration: 8000,
      onDismiss: () => {
        if (activeToast.current === id) activeToast.current = undefined;
      },
      onAutoClose: () => {
        if (activeToast.current === id) activeToast.current = undefined;
      },
      style: { flexWrap: "wrap" },
      classNames: {
        content: "min-w-0 flex-1 [overflow-wrap:anywhere]",
        description: "[overflow-wrap:anywhere]",
      },
      action: (
        <div
          className="flex w-full gap-2"
          onFocusCapture={() => {
            if (activeToast.current === id)
              toast(copy.title, { id, duration: Infinity });
          }}
          onBlurCapture={(event) => {
            if (
              activeToast.current === id &&
              !event.currentTarget.contains(event.relatedTarget)
            )
              toast(copy.title, { id, duration: 8000 });
          }}
        >
          <Button
            className="min-h-11"
            onClick={() => {
              void actions.read(incoming).then((saved) => {
                activeToast.current = undefined;
                if (!saved) {
                  setOpen(true);
                  toast.dismiss(id);
                  return;
                }
                toast.dismiss(id);
                if (incoming.href) router.push(incoming.href);
                else setOpen(true);
              });
            }}
          >
            {t("Open", "Отвори", "Hap")}
          </Button>
          <Button
            variant="ghost"
            className="min-h-11"
            onClick={() => {
              activeToast.current = undefined;
              toast.dismiss(id);
            }}
          >
            {t("Dismiss", "Затвори", "Mbyll")}
          </Button>
        </div>
      ),
    });
  }, [
    notifications,
    settings,
    dashEnabled,
    soundEnabled,
    toastEnabled,
    showSound,
    showToast,
    open,
    language,
    orgId,
    actions,
    router,
    t,
  ]);

  const changeOpen = (next: boolean) => {
    if (next && activeToast.current !== undefined) {
      toast.dismiss(activeToast.current);
      activeToast.current = undefined;
    }
    setOpen(next);
  };
  const title = t("Notifications", "Известувања", "Njoftimet");
  const expandedTrigger =
    (placement === "sidebar-nav" && !collapsed) || placement === "drawer-nav";
  const trigger = (
    <button
      type="button"
      className={cn(
        "relative flex min-h-11 shrink-0 items-center rounded-full border border-border/50 bg-card text-foreground transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        expandedTrigger
          ? "w-full justify-start gap-3 rounded-lg px-3"
          : "size-11 justify-center",
        open && "bg-secondary",
      )}
      aria-label={
        showUnreadBadge
          ? t(
              `${title}, ${count} unread`,
              `${title}, ${count} непрочитани`,
              `${title}, ${count} të palexuara`,
            )
          : title
      }
    >
      {showUnreadBadge ? (
        <BellRing aria-hidden="true" className="size-5" />
      ) : (
        <Bell aria-hidden="true" className="size-5" />
      )}
      {expandedTrigger && (
        <span className="min-w-0 truncate text-sm font-medium">{title}</span>
      )}
      {showUnreadBadge && (
        <span
          aria-hidden="true"
          className={cn(
            "flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground",
            expandedTrigger ? "ml-auto" : "absolute -right-1 -top-1",
          )}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );

  const header = (
    <div
      className={cn(
        "shrink-0 border-b border-border/60",
        mobile ? "px-4 pb-3 pt-4" : "px-3 py-2",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          {mobile ? (
            <SheetTitle>{title}</SheetTitle>
          ) : (
            <h2 className="font-semibold">{title}</h2>
          )}
          <p className="mt-1 text-xs text-muted-foreground" role="status">
            {unreadCount === undefined
              ? t("Loading…", "Се вчитува…", "Duke ngarkuar…")
              : t(
                  `${count} unread`,
                  `${count} непрочитани`,
                  `${count} të palexuara`,
                )}
          </p>
        </div>
        {!mobile && count > 0 && (
          <div className="min-w-0 max-w-[60%]">
            <MarkAllNotificationsRead
              pending={actions.markingAll}
              onClick={actions.markAllRead}
            />
          </div>
        )}
        {mobile && (
          <SheetClose asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-11"
              aria-label={t(
                "Close notifications",
                "Затвори известувања",
                "Mbyll njoftimet",
              )}
            >
              <X aria-hidden="true" className="size-5" />
            </Button>
          </SheetClose>
        )}
      </div>
      {mobile && (
        <SheetDescription className="sr-only">
          {t(
            "Your latest booking updates.",
            "Најновите известувања за термините.",
            "Përditësimet më të fundit të termineve.",
          )}
        </SheetDescription>
      )}
      {mobile && count > 0 && (
        <div className="mt-3">
          <MarkAllNotificationsRead
            pending={actions.markingAll}
            onClick={actions.markAllRead}
          />
        </div>
      )}
    </div>
  );
  const list = (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      {actions.failed && (
        <div className="p-3">
          <NotificationActionError failed retry={actions.retry} />
        </div>
      )}
      {notifications === undefined ? (
        <NotificationLoading />
      ) : notifications.length === 0 ? (
        count > 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm font-semibold">
              {t(
                "Older unread notifications",
                "Постари непрочитани известувања",
                "Njoftime të mëparshme të palexuara",
              )}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t(
                "Open the inbox to view earlier updates.",
                "Отвори ги сите известувања за да ги видиш постарите.",
                "Hapni kutinë për të parë përditësimet e mëparshme.",
              )}
            </p>
          </div>
        ) : (
          <NotificationEmpty />
        )
      ) : (
        <div className="divide-y divide-border/50 p-1">
          {notifications.map((notification) => (
            <NotificationRow
              key={notification._id}
              notification={notification}
              compact
              pending={actions.isPending(notification._id)}
              onRead={actions.read}
              onDismiss={() => actions.dismiss(notification._id)}
              onOpened={() => setOpen(false)}
            />
          ))}
        </div>
      )}
    </div>
  );
  const footer = (
    <div
      className={cn(
        "shrink-0 border-t border-border/60 bg-card px-3 py-2",
        mobile
          ? "pb-[max(0.5rem,env(safe-area-inset-bottom))]"
          : "flex items-center justify-between gap-2",
      )}
    >
      <Link
        href="/notifications"
        onClick={() => setOpen(false)}
        className={cn(
          "flex min-h-11 items-center justify-between gap-2 rounded-lg px-2 font-medium text-primary hover:bg-secondary focus-visible:outline-2 focus-visible:outline-ring",
          mobile ? "text-sm" : "min-w-0 text-xs",
        )}
      >
        {t(
          "View all notifications",
          "Види ги сите известувања",
          "Shiko të gjitha njoftimet",
        )}
        <ArrowRight aria-hidden="true" className="size-4 shrink-0" />
      </Link>
      <Link
        href="/notifications/preferences"
        onClick={() => setOpen(false)}
        className={cn(
          "flex min-h-11 items-center rounded-lg px-2 text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring",
          mobile ? "text-sm" : "shrink-0 text-xs",
        )}
      >
        {t("My preferences", "Мои поставки", "Preferencat e mia")}
      </Link>
    </div>
  );

  if (mobile)
    return (
      <Sheet open={open} onOpenChange={changeOpen}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="dashboard-notification-sheet h-[min(42rem,calc(100dvh-1rem))] max-h-[calc(100dvh-1rem)] gap-0 overflow-hidden border-border/60 bg-card p-0"
        >
          {header}
          {list}
          {footer}
        </SheetContent>
      </Sheet>
    );

  return (
    <Popover open={open} onOpenChange={changeOpen}>
      {collapsed && placement === "sidebar-nav" ? (
        <Tooltip open={open ? false : undefined}>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>{trigger}</PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="right">{title}</TooltipContent>
        </Tooltip>
      ) : (
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      )}
      <PopoverContent
        side={
          placement === "header" || placement === "drawer-nav"
            ? "bottom"
            : "right"
        }
        align={placement === "sidebar-nav" ? "start" : "end"}
        sideOffset={10}
        collisionPadding={12}
        aria-label={title}
        className="flex max-h-[min(42rem,var(--radix-popover-content-available-height))] w-[400px] max-w-[calc(100vw-1.5rem)] flex-col gap-0 overflow-hidden rounded-2xl border-border/60 bg-card p-0 shadow-xl"
      >
        {header}
        {list}
        {footer}
      </PopoverContent>
    </Popover>
  );
}
