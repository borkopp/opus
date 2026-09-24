"use client";

import { useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { DashboardTheme } from "@/lib/dashboard-theme";

export function useSaveDashboardTheme({ optimistic = true } = {}) {
  const [isSaving, setIsSaving] = useState(false);
  const inFlight = useRef(false);
  const updateTheme = useMutation(
    api.users.setDashboardTheme,
  ).withOptimisticUpdate((store, { theme }) => {
    if (!optimistic) return;
    const profile = store.getQuery(api.users.getMyProfile, {});
    if (profile?.orgId) {
      store.setQuery(
        api.users.getMyProfile,
        {},
        {
          ...profile,
          dashboardTheme: theme,
        },
      );
    }
  });

  async function saveTheme(theme: DashboardTheme) {
    if (inFlight.current) return;
    inFlight.current = true;
    setIsSaving(true);
    try {
      await updateTheme({ theme });
    } finally {
      inFlight.current = false;
      setIsSaving(false);
    }
  }

  return { saveTheme, isSaving };
}
