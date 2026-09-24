"use client";

import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { mk } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { getDashboardNotificationCopy } from "@/lib/i18n/dashboard-notifications";
import {
  IconBell,
  IconBellRinging,
  IconCalendarPlus,
  IconCalendarOff,
  IconAlertTriangle,
  IconCheck,
  IconX,
} from "@tabler/icons-react";

type FilterTab =
  | "all"
  | "unread"
  | "new_booking"
  | "booking_cancelled"
  | "ai_handoff"
  | "no_show";

function getTypeConfig(type: string, t: (en: string, mk: string) => string) {
  switch (type) {
    case "ai_handoff":
      return {
        icon: <IconBellRinging size={18} stroke={2} />,
        iconBg: "bg-warning/15 text-warning",
        label: t("AI handoff", "Преземи разговор"),
      };
    case "new_booking":
      return {
        icon: <IconCalendarPlus size={18} stroke={2} />,
        iconBg: "bg-primary/10 text-primary",
        label: t("New Booking", "Нов термин"),
      };
    case "booking_cancelled":
      return {
        icon: <IconCalendarOff size={18} stroke={2} />,
        iconBg: "bg-destructive/10 text-destructive",
        label: t("Cancellation", "Откажан термин"),
      };
    case "no_show":
      return {
        icon: <IconAlertTriangle size={18} stroke={2} />,
        iconBg: "bg-warning/15 text-warning",
        label: t("No-Show", "Непојавување"),
      };
    default:
      return {
        icon: <IconBell size={18} stroke={2} />,
        iconBg: "bg-muted text-muted-foreground",
        label: t("Notification", "Известување"),
      };
  }
}

export function NotificationsWorkspace() {
  const { language, t } = useDashboardI18n();
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

  const tabs: { id: FilterTab; label: string }[] = [
    { id: "all", label: t("All", "Сите") },
    { id: "unread", label: t("Unread", "Непрочитани") },
    { id: "ai_handoff", label: t("AI handoffs", "AI разговори") },
    { id: "new_booking", label: t("New Bookings", "Нови термини") },
    { id: "booking_cancelled", label: t("Cancellations", "Откажани") },
    { id: "no_show", label: t("No-Shows", "Непојавувања") },
  ];

  if (profile === undefined || notifications === undefined) {
    return (
      <div className="flex w-full flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-44" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
        <Skeleton className="h-10 w-80" />
        <div className="overflow-hidden rounded-2xl border border-border/70">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="flex items-center justify-between gap-4 border-b border-border/40 px-5 py-4 last:border-b-0"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-xl" />
                <div className="flex flex-col gap-1.5">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-72" />
                </div>
              </div>
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (profile === null || !orgId)
    return <div>{t("Not found", "Не е пронајдено")}</div>;

  const filtered = (notifications ?? []).filter((n) => {
    if (activeTab === "all") return true;
    if (activeTab === "unread") return !n.isRead;
    return n.type === activeTab;
  });

  const handleClick = (n: (typeof filtered)[0]) => {
    if (!orgId) return;
    if (!n.isRead) markRead({ orgId, notificationId: n._id });
    if (n.conversationId)
      router.push(`/ai-inbox?conversation=${n.conversationId}`);
    else if (n.bookingId) router.push("/beauty/bookings");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="flex min-h-full w-full flex-1 flex-col gap-6"
    >
      {/* Header */}
      <DashboardPageHeader
        title={t("Notifications", "Известувања")}
        eyebrow={t("STUDIO UPDATES", "НОВОСТИ ОД СТУДИОТО")}
        description={t(
          `${unreadCount ?? 0} unread notifications. Your latest booking updates, in one place.`,
          `${unreadCount ?? 0} непрочитани известувања. Сите новости за термините на едно место.`,
        )}
      >
        {(unreadCount ?? 0) > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllRead({ orgId })}
            className="w-full transition-transform duration-150 active:scale-[0.97] motion-reduce:transform-none sm:w-auto cursor-pointer"
          >
            <IconCheck className="mr-1.5 h-4 w-4" />
            {t("Mark all read", "Означи ги сите како прочитани")}
          </Button>
        )}
      </DashboardPageHeader>

      {/* Filter tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as FilterTab)}
        className="w-full"
      >
        <div className="overflow-x-auto pb-1">
          <TabsList className="h-12 md:h-9">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="min-h-11 cursor-pointer px-3 text-xs md:min-h-0"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>

      {/* List */}
      <div className="dashboard-record-list divide-y divide-border/40">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="h-12 w-12 rounded-2xl bg-muted/60 flex items-center justify-center mb-3 text-muted-foreground">
              {(unreadCount ?? 0) === 0 ? (
                <IconBell size={22} className="text-muted-foreground/70" />
              ) : (
                <IconBellRinging
                  size={22}
                  className="text-muted-foreground/70"
                />
              )}
            </div>
            <p className="font-display text-base font-semibold text-foreground">
              {t("Nothing here", "Нема ништо тука")}
            </p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              {activeTab === "unread"
                ? t(
                    "You're all caught up on new notifications.",
                    "Ги прочитавте сите нови известувања.",
                  )
                : t(
                    "No notifications in this category yet.",
                    "Сè уште нема известувања во оваа категорија.",
                  )}
            </p>
          </div>
        ) : (
          filtered.map((n) => {
            const { icon, iconBg } = getTypeConfig(n.type, t);
            const copy = getDashboardNotificationCopy(language, n);
            return (
              <div
                key={n._id}
                className={cn(
                  "group relative flex items-start gap-4 px-5 py-4 transition-colors cursor-pointer",
                  "hover:bg-muted/40",
                  !n.isRead && "bg-primary/[0.03] border-l-2 border-l-primary",
                  n.isRead && "border-l-2 border-l-transparent",
                )}
                onClick={() => handleClick(n)}
              >
                <div
                  className={cn(
                    "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                    iconBg,
                  )}
                >
                  {icon}
                </div>
                <div className="flex-1 min-w-0 pr-8">
                  <p
                    className={cn(
                      "text-sm leading-snug",
                      !n.isRead
                        ? "font-semibold text-foreground"
                        : "font-medium text-foreground",
                    )}
                  >
                    {copy.title}
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
                    {copy.body}
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1.5 font-sans">
                    {formatDistanceToNow(new Date(n.createdAt), {
                      addSuffix: true,
                      locale: language === "mk" ? mk : undefined,
                    })}
                  </p>
                </div>
                {!n.isRead && (
                  <div className="absolute right-14 top-5 md:right-10 h-2 w-2 rounded-full bg-primary" />
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    dismiss({ orgId, notificationId: n._id });
                  }}
                  className="absolute right-2 top-3 flex size-11 items-center justify-center opacity-100 md:right-4 md:top-4.5 md:size-7 md:opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity rounded-md hover:bg-destructive/10 hover:text-destructive text-muted-foreground/50 cursor-pointer"
                  aria-label={t("Dismiss notification", "Отфрли известување")}
                >
                  <IconX size={15} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}
