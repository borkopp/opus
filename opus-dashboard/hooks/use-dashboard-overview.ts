"use client";
import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRetainedQueryResult } from "./use-retained-query-result";
import { useFreePlanAnalytics } from "./use-free-plan-analytics";

export function useDashboardOverview() {
  const [days, setDays] = useState<7 | 30>(7);
  const [date, setDate] = useState<string>();
  const [refreshMinute, setRefreshMinute] = useState(() =>
    Math.floor(Date.now() / 60_000),
  );
  useEffect(() => {
    const refresh = () => setRefreshMinute(Math.floor(Date.now() / 60_000));
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  const data = useQuery(api.dashboardOverview.getOverview, {
    date,
    days,
    refreshMinute,
  });
  const retainedData = useRetainedQueryResult(data);
  const utilisation = useQuery(api.dashboard.getStaffUtilisation, {});
  const analytics = useFreePlanAnalytics();
  return {
    data: retainedData,
    isUpdating: data === undefined,
    utilisation,
    analytics,
    days,
    setDays,
    setDate,
  };
}
