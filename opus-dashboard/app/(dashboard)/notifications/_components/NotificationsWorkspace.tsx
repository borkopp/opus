"use client";

import { useState } from "react";
import { usePaginatedQuery, useQuery } from "convex/react";
import Link from "next/link";
import { Loader2, Settings2 } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { NotificationRow } from "@/components/notifications/NotificationRow";
import { NotificationQueryBoundary } from "@/components/notifications/NotificationQueryBoundary";
import {
  MarkAllNotificationsRead,
  NotificationActionError,
  NotificationEmpty,
  NotificationLoading,
} from "@/components/notifications/NotificationListState";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNotificationActions } from "@/hooks/use-notification-actions";
import { cn } from "@/lib/utils";

type Category =
  | "all"
  | "new_booking"
  | "booking_changed"
  | "booking_cancelled"
  | "ai_handoff"
  | "no_show";

export function NotificationsWorkspace() {
  return (
    <NotificationQueryBoundary>
      <NotificationsWorkspaceContent />
    </NotificationQueryBoundary>
  );
}

function NotificationsWorkspaceContent() {
  const { t } = useDashboardI18n();
  const profile = useQuery(api.users.getMyProfile);
  const orgId = profile?.orgId ?? undefined;
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [category, setCategory] = useState<Category>("all");
  const {
    results: notifications,
    status,
    loadMore,
  } = usePaginatedQuery(
    api.dashboardNotifications.listPage,
    orgId
      ? { orgId, unreadOnly, ...(category === "all" ? {} : { type: category }) }
      : "skip",
    { initialNumItems: 25 },
  );
  const unreadCount = useQuery(
    api.dashboardNotifications.getUnreadCount,
    orgId ? { orgId } : "skip",
  );
  const actions = useNotificationActions(orgId);
  const categories: { value: Category; label: string }[] = [
    {
      value: "all",
      label: t("All categories", "Сите категории", "Të gjitha kategoritë"),
    },
    {
      value: "new_booking",
      label: t("New bookings", "Нови термини", "Termine të reja"),
    },
    {
      value: "booking_changed",
      label: t("Rescheduled", "Презакажани", "Të ricaktuara"),
    },
    {
      value: "booking_cancelled",
      label: t("Cancellations", "Откажани", "Të anuluara"),
    },
    {
      value: "ai_handoff",
      label: t("AI handoffs", "AI разговори", "Bisedat e kaluara te stafi"),
    },
    { value: "no_show", label: t("No-shows", "Непојавувања", "Mosparaqitje") },
  ];

  if (profile === null || (profile && !orgId))
    return <p>{t("Not found", "Не е пронајдено", "Nuk u gjet")}</p>;

  const loading = profile === undefined || status === "LoadingFirstPage";
  const hasMore = status === "CanLoadMore" || status === "LoadingMore";
  return (
    <div className="flex min-h-full min-w-0 w-full flex-1 flex-col gap-5">
      <DashboardPageHeader
        replayPublicTitle
        title={t("Notifications", "Известувања", "Njoftimet")}
        description={
          <span role="status">
            {unreadCount === undefined
              ? t(
                  "Your latest booking updates, in one place.",
                  "Сите новости за термините на едно место.",
                  "Përditësimet e termineve në një vend.",
                )
              : t(
                  `${unreadCount} unread notifications.`,
                  `${unreadCount} непрочитани известувања.`,
                  `${unreadCount} njoftime të palexuara.`,
                )}
          </span>
        }
      >
        {(unreadCount ?? 0) > 0 && (
          <MarkAllNotificationsRead
            pending={actions.markingAll}
            onClick={actions.markAllRead}
          />
        )}
      </DashboardPageHeader>

      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div
          role="group"
          aria-label={t(
            "Notification status",
            "Статус на известувања",
            "Statusi i njoftimeve",
          )}
          className="flex w-fit max-w-full rounded-full border border-border/60 bg-secondary p-1"
        >
          {[false, true].map((unread) => (
            <button
              key={String(unread)}
              type="button"
              aria-pressed={unreadOnly === unread}
              onClick={() => setUnreadOnly(unread)}
              className={cn(
                "min-h-11 rounded-full px-5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                unreadOnly === unread
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {unread
                ? t("Unread", "Непрочитани", "Të palexuara")
                : t("All", "Сите", "Të gjitha")}
            </button>
          ))}
        </div>
        <div className="min-w-0 w-full sm:w-64">
          <label
            htmlFor="notification-category"
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            {t("Category", "Категорија", "Kategoria")}
          </label>
          <Select
            value={category}
            onValueChange={(value) => setCategory(value as Category)}
          >
            <SelectTrigger
              id="notification-category"
              className="min-h-11 w-full"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((item) => (
                <SelectItem
                  key={item.value}
                  value={item.value}
                  className="min-h-11"
                >
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <NotificationActionError failed={actions.failed} retry={actions.retry} />
      <div className="dashboard-record-list min-w-0 divide-y divide-border/50">
        {loading ? (
          <NotificationLoading rows={5} />
        ) : notifications.length === 0 ? (
          <NotificationEmpty
            unread={unreadOnly}
            filtered={category !== "all"}
            moreAvailable={hasMore}
          />
        ) : (
          notifications.map((notification) => (
            <NotificationRow
              key={notification._id}
              notification={notification}
              pending={actions.isPending(notification._id)}
              onRead={actions.read}
              onDismiss={() => actions.dismiss(notification._id)}
            />
          ))
        )}
      </div>
      {!loading && hasMore && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            className="min-h-11"
            disabled={status === "LoadingMore"}
            onClick={() => loadMore(25)}
          >
            {status === "LoadingMore" && (
              <Loader2
                aria-hidden="true"
                className="size-4 animate-spin motion-reduce:animate-none"
              />
            )}
            {status === "LoadingMore"
              ? t("Loading…", "Се вчитува…", "Duke ngarkuar…")
              : t("Load more", "Вчитај повеќе", "Ngarkoni më shumë")}
          </Button>
        </div>
      )}
      <Link
        href="/notifications/preferences"
        className="flex min-h-11 w-fit max-w-full items-center gap-2 rounded-lg text-sm text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
      >
        <Settings2 aria-hidden="true" className="size-4 shrink-0" />
        {t(
          "My notification preferences",
          "Мои поставки за известувања",
          "Preferencat e mia për njoftimet",
        )}
      </Link>
    </div>
  );
}
