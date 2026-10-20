"use client";

import { useState } from "react";
import { useConvex, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard";
import { AnalyticsClientDirectory } from "@/components/analytics/AnalyticsClientDirectory";
import {
  studioMonth,
  validAnalyticsMonths,
  type AnalyticsFilters,
} from "@/lib/analytics-filters";
import { buildAnalyticsDemo } from "@/lib/analytics-demo";
import { Skeleton } from "@/components/ui/skeleton";
import { AnalyticsQueryBoundary } from "./AnalyticsQueryBoundary";

export function AnalyticsWorkspace() {
  const profile = useQuery(api.users.getMyProfile);
  if (profile === undefined) return <Skeleton className="h-96 rounded-3xl" />;
  if (!profile?.orgId || profile.bookingAccess === "own") return null;
  const demo = profile.plan !== "paid";
  return (
    <div
      className={`flex min-w-0 flex-col ${demo ? "" : "pb-6"}`}
      data-replay-private
    >
      <AnalyticsQueryBoundary key={`${profile.orgId}:${profile.plan}`}>
        <AnalyticsContent demo={demo} />
      </AnalyticsQueryBoundary>
      {!demo && <AnalyticsClientDirectory key={profile.orgId} />}
    </div>
  );
}

function AnalyticsContent({ demo }: { demo: boolean }) {
  const convex = useConvex();
  const [filters, setFilters] = useState<AnalyticsFilters>(() => ({
    startMonth: studioMonth(),
    endMonth: studioMonth(),
    staffId: "",
    currency: "",
  }));
  const valid = validAnalyticsMonths(filters.startMonth, filters.endMonth);
  const args = {
    startMonth: filters.startMonth,
    endMonth: filters.endMonth,
    ...(filters.staffId
      ? { staffId: filters.staffId as Id<"staff_members"> }
      : {}),
    ...(filters.currency ? { currency: filters.currency } : {}),
  };
  const analytics = useQuery(
    api.studioAnalytics.getDashboard,
    !demo && valid ? args : "skip",
  );
  return (
    <AnalyticsDashboard
      data={
        valid ? (demo ? buildAnalyticsDemo(filters) : analytics) : undefined
      }
      filters={filters}
      onFiltersChange={setFilters}
      demo={demo}
      onGetReportData={async () => {
        if (demo || !valid)
          throw new Error("Reports require Pro and a valid period.");
        // Re-read to enforce the current server-side plan, even after a downgrade.
        return convex.action(api.studioAnalytics.getReport, args);
      }}
    />
  );
}
