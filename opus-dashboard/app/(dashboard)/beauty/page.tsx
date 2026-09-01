"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import type { FunctionReturnType } from "convex/server";
import {
  startOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import { useMemo } from "react";
import { toast } from "sonner";
import { formatPrice } from "@/components/ui/price";
import { motion } from "framer-motion";

// Widgets
import { GapOptimizerWidget } from "@/components/dashboard/GapOptimizerWidget";
import { LiveScheduleWidget } from "@/components/dashboard/LiveScheduleWidget";
import { RevenueChartWidget } from "@/components/dashboard/RevenueChartWidget";
import { StaffUtilisationWidget } from "@/components/dashboard/StaffUtilisationWidget";
import { LatestActivityWidget } from "@/components/dashboard/LatestActivityWidget";
import { AIPerformanceWidget } from "@/components/dashboard/AIPerformanceWidget";

export default function DashboardHome() {
  const today = useMemo(() => new Date(), []);
  const startOfTodayMs = startOfDay(today).getTime();
  const endOfTodayMs = startOfTodayMs + 24 * 60 * 60 * 1000;

  const startOfCurrentWeekMs = startOfWeek(today, { weekStartsOn: 1 }).getTime();
  const endOfCurrentWeekMs = endOfWeek(today, { weekStartsOn: 1 }).getTime();
  const startOfPreviousWeekMs = startOfCurrentWeekMs - 7 * 24 * 60 * 60 * 1000;
  const endOfPreviousWeekMs = startOfCurrentWeekMs - 1;

  const startOfCurrentMonthMs = startOfMonth(today).getTime();
  const endOfCurrentMonthMs = endOfMonth(today).getTime();
  const profile = useQuery(api.users.getMyProfile);
  const orgId = profile?.orgId;

  // Mutations
  const complete = useMutation(api.bookings.completeBooking);

  // Queries — all hooks must be called unconditionally (Rules of Hooks)
  const orgSettingsData = useQuery(api.orgSettings.getOrgSettings, orgId ? { orgId } : "skip");

  const dashboardMetrics = useQuery(
    api.dashboard.getDashboardMetrics,
    orgId ? { orgId, startOfDayMs: startOfTodayMs, endOfDayMs: endOfTodayMs } : "skip",
  );

  const dailySchedule = useQuery(
    api.dashboard.getDailySchedule,
    orgId ? { orgId, startOfDayMs: startOfTodayMs, endOfDayMs: endOfTodayMs } : "skip",
  );

  const staffUtilisation = useQuery(
    api.dashboard.getStaffUtilisation,
    orgId ? { orgId, startMs: startOfCurrentWeekMs, endMs: endOfCurrentWeekMs } : "skip",
  );

  const weeklyRevenueChart = useQuery(
    api.dashboard.getWeeklyRevenueChart,
    orgId ? {
      orgId,
      currentWeekStartMs: startOfCurrentWeekMs,
      currentWeekEndMs: endOfCurrentWeekMs,
      previousWeekStartMs: startOfPreviousWeekMs,
      previousWeekEndMs: endOfPreviousWeekMs,
    } : "skip",
  );

  const aiPerformance = useQuery(
    api.dashboard.getAIPerformance,
    orgId ? { orgId, startMs: startOfCurrentMonthMs, endMs: endOfCurrentMonthMs } : "skip",
  );

  if (profile === undefined) {
    return (
      <div className="flex h-[400px] w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  if (!orgId) return null;

  // ── Dashboard loading state ──
  if (
    dashboardMetrics === undefined ||
    dailySchedule === undefined ||
    staffUtilisation === undefined ||
    weeklyRevenueChart === undefined ||
    aiPerformance === undefined ||
    orgSettingsData === undefined
  ) {
    return (
      <div className="flex h-[400px] w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  // Derived calculations for UI
  const formatMoney = (minorUnits: number) => formatPrice(minorUnits, orgSettingsData?.settings?.currency, orgSettingsData?.settings?.locale);

  type DailyBooking = FunctionReturnType<typeof api.dashboard.getDailySchedule>[number];
  const groupedByStaff: Record<string, DailyBooking[]> = {};
  dailySchedule.forEach((booking) => {
    if (!groupedByStaff[booking.staffName]) {
      groupedByStaff[booking.staffName] = [];
    }
    groupedByStaff[booking.staffName].push(booking);
  });

  const handleComplete = async (bookingId: Id<"bookings">) => {
    try {
      await complete({ orgId, bookingId });
      toast.success("Booking completed");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Could not complete booking");
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1700px] mx-auto flex-1 min-h-full">
      {/* ── Dashboard Grid ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-6 flex-1 min-h-0"
      >
        {/* ── Row 1: Schedule + AI Gap Optimizer + Latest Activity ── */}
        <div className="md:col-span-2 md:h-full md:min-h-0">
          <LiveScheduleWidget
            groupedByStaff={groupedByStaff}
            onComplete={handleComplete}
          />
        </div>
        <div className="md:col-span-1 md:h-full md:min-h-0">
          <GapOptimizerWidget orgId={orgId} />
        </div>
        <div className="md:col-span-1 md:h-full md:min-h-0">
          <LatestActivityWidget orgId={orgId} />
        </div>

        {/* ── Row 2: Staff Capacity + Revenue Chart + AI Performance ── */}
        <div className="md:col-span-1 md:h-full md:min-h-0">
          <StaffUtilisationWidget
            staffUtilisation={staffUtilisation}
          />
        </div>
        <div className="md:col-span-2 md:h-full md:min-h-0">
          <RevenueChartWidget
            revenueData={weeklyRevenueChart}
            formatMoney={formatMoney}
          />
        </div>
        <div className="md:col-span-1 md:h-full md:min-h-0">
          <AIPerformanceWidget
            aiPerformance={aiPerformance}
          />
        </div>
      </motion.div>
    </div>
  );
}
