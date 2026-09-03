"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { formatDistanceToNow } from "date-fns";
import { enUS, mk } from "date-fns/locale";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { getDashboardNotificationCopy } from "@/lib/i18n/dashboard-notifications";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WidgetTitle } from "@/components/dashboard/WidgetTitle";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Bell,
  CalendarPlus,
  CalendarX,
  TriangleAlert,
  X,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

function getActivityTypeConfig(
  type: string,
  t: (en: string, mk: string) => string,
) {
  switch (type) {
    case "new_booking":
      return {
        icon: <CalendarPlus className="h-4 w-4" strokeWidth={2.2} />,
        iconBg: "bg-accent/15 text-accent-foreground border-accent/20",
        label: t("New Booking", "Нов термин"),
      };
    case "booking_cancelled":
      return {
        icon: <CalendarX className="h-4 w-4" strokeWidth={2.2} />,
        iconBg: "bg-destructive/10 text-destructive border-destructive/20",
        label: t("Cancelled", "Откажано"),
      };
    case "no_show":
      return {
        icon: <TriangleAlert className="h-4 w-4" strokeWidth={2.2} />,
        iconBg: "bg-highlight/15 text-warning border-highlight/20",
        label: t("No-Show", "Не се појави"),
      };
    default:
      return {
        icon: <Bell className="h-4 w-4" strokeWidth={2.2} />,
        iconBg: "bg-secondary text-muted-foreground border-border/40",
        label: t("Update", "Ажурирање"),
      };
  }
}

export function LatestActivityWidget({ orgId }: { orgId: Id<"orgs"> }) {
  const { language, t } = useDashboardI18n();
  const dateLocale = language === "mk" ? mk : enUS;
  const router = useRouter();
  const notifications = useQuery(api.dashboardNotifications.list, { orgId });

  const markRead = useMutation(api.dashboardNotifications.markRead);
  const dismiss = useMutation(api.dashboardNotifications.dismiss);

  const allNotifications = notifications ?? [];

  const handleItemClick = (
    notificationId: Id<"dashboard_notifications">,
    bookingId?: Id<"bookings">,
    isRead?: boolean,
  ) => {
    if (!isRead) {
      void markRead({ orgId, notificationId });
    }
    if (bookingId) {
      router.push("/beauty/bookings");
    }
  };

  const containerVars = {
    hidden: { opacity: 0, scale: 0.98 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.4, staggerChildren: 0.05 },
    },
  };

  const itemVars = {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
  };

  return (
    <Card className="min-h-0 gap-0 overflow-hidden md:h-full flex flex-col transition-shadow duration-300 hover:shadow-md">
      {/* ── Header ── */}
      <CardHeader className="shrink-0 pb-4">
        <CardTitle>
          <WidgetTitle>
            {t("Latest Activity", "Последна активност")}
          </WidgetTitle>
        </CardTitle>
      </CardHeader>

      {/* ── Activity List ── */}
      <CardContent className="min-h-0 flex-1 p-0 overflow-y-auto divide-y divide-border/30">
        {allNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-44 p-6 text-center">
            <Empty className="bg-transparent border-0 p-0">
              <EmptyHeader>
                <EmptyMedia
                  variant="icon"
                  className="h-10 w-10 bg-secondary/80 text-muted-foreground/60 mb-2"
                >
                  <Bell className="h-5 w-5" />
                </EmptyMedia>
                <EmptyTitle className="text-sm font-semibold">
                  {t("No recent activity", "Нема неодамнешна активност")}
                </EmptyTitle>
                <EmptyDescription className="text-xs">
                  {t(
                    "New bookings, cancellations, and notifications will appear here.",
                    "Новите термини, откажувања и известувања ќе се појават овде.",
                  )}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        ) : (
          <motion.div
            variants={containerVars}
            initial="hidden"
            animate="visible"
            className="flex flex-col"
          >
            <AnimatePresence initial={false}>
              {allNotifications.map((item) => {
                const { icon, iconBg } = getActivityTypeConfig(item.type, t);
                const copy = getDashboardNotificationCopy(language, item);

                return (
                  <motion.div
                    key={item._id}
                    variants={itemVars}
                    layout
                    className={cn(
                      "group relative flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer",
                      "hover:bg-secondary/40",
                      !item.isRead
                        ? "bg-primary/[0.025] border-l-2 border-l-accent"
                        : "border-l-2 border-l-transparent",
                    )}
                    onClick={() =>
                      handleItemClick(item._id, item.bookingId, item.isRead)
                    }
                  >
                    {/* Icon */}
                    <div
                      className={cn(
                        "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                        iconBg,
                      )}
                    >
                      {icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-6">
                      <div className="flex items-center gap-2">
                        <p
                          className={cn(
                            "text-xs leading-snug truncate",
                            !item.isRead
                              ? "font-semibold text-foreground"
                              : "font-medium text-foreground/90",
                          )}
                        >
                          {copy.title}
                        </p>
                        {!item.isRead && (
                          <span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                        {copy.body}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1 font-display">
                        {formatDistanceToNow(new Date(item.createdAt), {
                          addSuffix: true,
                          locale: dateLocale,
                        })}
                      </p>
                    </div>

                    {/* Dismiss Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void dismiss({ orgId, notificationId: item._id });
                      }}
                      className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-destructive/10 hover:text-destructive text-muted-foreground/40"
                      aria-label={t(
                        "Dismiss notification",
                        "Отфрли известување",
                      )}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </CardContent>

      {/* ── Footer Link ── */}
      <div className="border-t border-border/40 px-4 py-2.5 shrink-0 bg-card">
        <Link
          href="/notifications"
          className="flex items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group/link"
        >
          <span>{t("View all notifications", "Види ги сите известувања")}</span>
          <ArrowRight className="h-3.5 w-3.5 group-hover/link:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </Card>
  );
}
