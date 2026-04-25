"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  startOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subMonths,
} from "date-fns";
import { useMemo } from "react";
import { toast } from "sonner";
import { formatPrice } from "@/components/ui/price";
import { motion } from "framer-motion";

// Widgets
import { RevenueTargetWidget } from "@/components/dashboard/RevenueTargetWidget";
import { GapOptimizerWidget } from "@/components/dashboard/GapOptimizerWidget";
import { LiveScheduleWidget } from "@/components/dashboard/LiveScheduleWidget";
import { RevenueChartWidget } from "@/components/dashboard/RevenueChartWidget";
import { StaffUtilisationWidget } from "@/components/dashboard/StaffUtilisationWidget";
import { CustomerInsightsWidget } from "@/components/dashboard/CustomerInsightsWidget";
import { AIPerformanceWidget } from "@/components/dashboard/AIPerformanceWidget";
import { GreetingHeader } from "@/components/dashboard/GreetingHeader";
import { ListingBanner } from "@/components/dashboard/ListingBanner";

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
  const startOfPreviousMonthMs = startOfMonth(subMonths(today, 1)).getTime();
  const endOfPreviousMonthMs = endOfMonth(subMonths(today, 1)).getTime();

  const profile = useQuery(api.users.getMyProfile);
  const orgId = profile?.orgId;

  // Listing readiness — drives whether to show dashboard or onboarding banner
  const listingReadiness = useQuery(
    api.listing.getListingReadiness,
    orgId ? { orgId } : "skip"
  );

  // True when listing is published (dashboard should show)
  const isPublished = listingReadiness?.listingStatus === "published";

  // Mutations
  const checkIn = useMutation(api.bookings.checkInBooking);
  const complete = useMutation(api.bookings.completeBooking);

  // Queries — all hooks must be called unconditionally (Rules of Hooks)
  const orgSettingsData = useQuery(api.orgSettings.getOrgSettings, orgId ? { orgId } : "skip");

  const dashboardMetrics = useQuery(
    api.dashboard.getDashboardMetrics,
    orgId ? { orgId, startOfDayMs: startOfTodayMs, endOfDayMs: endOfTodayMs } : "skip",
  );

  const upcomingBookings = useQuery(
    api.dashboard.getUpcomingBookings,
    orgId ? { orgId, startMs: today.getTime(), endMs: endOfTodayMs, limit: 3 } : "skip",
  );

  const dailySchedule = useQuery(
    api.dashboard.getDailySchedule,
    orgId ? { orgId, startOfDayMs: startOfTodayMs, endOfDayMs: endOfTodayMs } : "skip",
  );

  const weeklyComparison = useQuery(
    api.dashboard.getWeeklyComparison,
    orgId ? {
      orgId,
      thisWeekStartMs: startOfCurrentWeekMs,
      thisWeekEndMs: endOfCurrentWeekMs,
      lastWeekStartMs: startOfPreviousWeekMs,
      lastWeekEndMs: endOfPreviousWeekMs,
      thisMonthStartMs: startOfCurrentMonthMs,
      thisMonthEndMs: endOfCurrentMonthMs,
      lastMonthStartMs: startOfPreviousMonthMs,
      lastMonthEndMs: endOfPreviousMonthMs,
    } : "skip",
  );

  const bookingStats = useQuery(
    api.dashboard.getBookingStats,
    orgId ? { orgId, startMs: startOfCurrentWeekMs, endMs: endOfCurrentWeekMs } : "skip",
  );

  const staffUtilisation = useQuery(
    api.dashboard.getStaffUtilisation,
    orgId ? { orgId, startMs: startOfCurrentWeekMs, endMs: endOfCurrentWeekMs } : "skip",
  );

  const revenueByStaff = useQuery(
    api.dashboard.getRevenueByStaff,
    orgId ? { orgId, startMs: startOfCurrentWeekMs, endMs: endOfCurrentWeekMs } : "skip",
  );
  const customerInsights = useQuery(
    api.dashboard.getCustomerInsights,
    orgId ? { orgId, monthStartMs: startOfCurrentMonthMs, monthEndMs: endOfCurrentMonthMs } : "skip",
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

  const topCustomers = useQuery(api.dashboard.getTopCustomers, orgId ? { orgId } : "skip");

  const noShowRiskCustomers = useQuery(api.dashboard.getNoShowStats, orgId ? { orgId } : "skip");

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

  // ── If listing is NOT published, show ONLY the ListingBanner ──
  if (!isPublished) {
    return (
      <div className="flex items-start justify-center min-h-full w-full pt-8 pb-12">
        <div className="w-full max-w-4xl">
          <ListingBanner orgId={orgId} />
        </div>
      </div>
    );
  }

  // ── Dashboard loading state (only reached when published) ──
  if (
    dashboardMetrics === undefined ||
    upcomingBookings === undefined ||
    dailySchedule === undefined ||
    weeklyComparison === undefined ||
    bookingStats === undefined ||
    staffUtilisation === undefined ||
    revenueByStaff === undefined ||
    customerInsights === undefined ||
    topCustomers === undefined ||
    noShowRiskCustomers === undefined ||
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

  const groupedByStaff: Record<string, any[]> = {};
  dailySchedule.forEach((booking) => {
    if (!groupedByStaff[booking.staffName]) {
      groupedByStaff[booking.staffName] = [];
    }
    groupedByStaff[booking.staffName].push(booking);
  });

  const handleAction = async (action: any, bookingId: string, successMessage: string) => {
    try {
      await action({ orgId, bookingId });
      toast.success(successMessage);
    } catch (error: any) {
      toast.error(error.message || "Action failed");
    }
  };

  const currentWeeekRevenue = weeklyComparison.week.current.revenue;
  const previousWeekRevenue = weeklyComparison.week.previous.revenue;
  const revenueGrowth = previousWeekRevenue > 0 ? ((currentWeeekRevenue - previousWeekRevenue) / previousWeekRevenue) * 100 : 0;

  const staffChartData = revenueByStaff.map(s => ({ staffName: s.staffName, revenue: s.revenue / 100 }));

  const nextBooking = upcomingBookings[0];

  const totalBookedMins = staffUtilisation.reduce((sum, s) => sum + s.bookedMins, 0);
  const totalAvailableMins = staffUtilisation.reduce((sum, s) => sum + s.availableMins, 0);
  const utilisationPct = totalAvailableMins > 0 ? Math.round((totalBookedMins / totalAvailableMins) * 100) : 0;

  return (
    <div className="flex flex-col gap-8 w-full max-w-[1700px] mx-auto overflow-visible min-h-[calc(100vh-150px)]">
      {/* Greeting Header */}
      {/* <GreetingHeader profile={profile} /> */}

      {/* ── Dashboard Grid ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="grid grid-cols-1 md:grid-cols-4 gap-6 flex-1 overflow-visible min-h-0"
      >
        {/* ── Row 1: Schedule + AI Widgets + Staff ── */}
        <div className="md:col-span-2 h-full max-h-[500px] min-h-0">
          <LiveScheduleWidget
            groupedByStaff={groupedByStaff}
            handleAction={handleAction}
            checkIn={checkIn}
            complete={complete}
          />
        </div>
        <div className="md:col-span-1 h-full min-h-0">
          <GapOptimizerWidget orgId={orgId} />
        </div>
        <div className="md:col-span-1 h-full min-h-0">
          <StaffUtilisationWidget
            staffUtilisation={staffUtilisation}
          />
        </div>

        {/* ── Row 2: Insights + Revenue Chart + AI Performance ── */}
        <div className="md:col-span-1 h-full min-h-0">
          <CustomerInsightsWidget
            insights={customerInsights}
            topCustomers={topCustomers}
            noShowRisk={noShowRiskCustomers}
            formatMoney={formatMoney}
            revenueToday={dashboardMetrics.revenueToday}
            bookingsToday={dashboardMetrics.totalBookingsToday}
          />
        </div>
        <div className="md:col-span-2 h-full min-h-0">
          <RevenueChartWidget
            revenueData={weeklyRevenueChart}
            formatMoney={formatMoney}
          />
        </div>
        <div className="md:col-span-1 h-full min-h-0">
          <AIPerformanceWidget
            aiPerformance={aiPerformance}
          />
        </div>
      </motion.div>
    </div>
  );
}
