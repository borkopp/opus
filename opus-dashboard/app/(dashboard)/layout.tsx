"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import s from "@/components/dashboard/clarity.module.css";
import React from "react";
import { ACTIVE_DASHBOARD_PATH } from "@/lib/product-scope";
import { QuickBookingProvider } from "@/components/bookings/QuickBookingProvider";
import { MobileSetupBanner } from "@/components/dashboard/MobileSetupBanner";
import { DashboardAppearanceProvider } from "@/components/dashboard/DashboardAppearanceProvider";
import { resolveDashboardTheme } from "@/lib/dashboard-theme";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();
  const pathname = usePathname();

  const profile = useQuery(
    api.users.getMyProfile,
    isAuthenticated ? {} : "skip",
  );

  const orgSettingsData = useQuery(
    api.orgSettings.getOrgSettings,
    profile?.orgId ? { orgId: profile.orgId } : "skip",
  );

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (profile && !profile.orgId) {
      router.replace("/onboarding");
    }
  }, [profile, router]);

  // ── Industry-based routing ──────────────────────────────
  useEffect(() => {
    if (!profile || !profile.industry) return;

    const targetBase = ACTIVE_DASHBOARD_PATH;

    // Bare dashboard root → redirect to vertical module
    if (pathname === "/") {
      router.push(targetBase);
      return;
    }

    // Allow shared routes (settings, gap optimizer, notifications, etc.)
    const sharedPaths = [
      "/settings",
      "/notifications",
      "/gap-optimizer",
      "/ai-inbox",
    ];
    if (sharedPaths.some((p) => pathname.startsWith(p))) return;

    // If in the wrong vertical module, redirect
    if (!pathname.startsWith(targetBase)) {
      router.push(targetBase);
    }
  }, [profile, pathname, router]);

  if (
    isLoading ||
    (isAuthenticated && !profile) ||
    (profile?.orgId && orgSettingsData === undefined)
  ) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  if (!profile?.orgId) return null;

  return (
    <DashboardAppearanceProvider
      theme={resolveDashboardTheme(profile.dashboardTheme)}
    >
      <QuickBookingProvider key={profile.orgId} orgId={profile.orgId}>
        <div
          data-dashboard-theme={resolveDashboardTheme(profile.dashboardTheme)}
          className={`dashboard-shell ${s.scope} ${pathname === "/beauty/bookings" ? s.viewportShell : ""}`}
        >
          <a
            data-replay-public
            className="dashboard-skip-link"
            href="#dashboard-content"
          >
            Skip to content
          </a>
          <div className={s.stage}>
            <div className={s.dashboard}>
              <DashboardHeader profile={profile} />
              <main
                id="dashboard-content"
                tabIndex={-1}
                className={`dashboard-workspace ${pathname === "/beauty" ? "dashboard-overview" : "dashboard-page"}`}
              >
                <MobileSetupBanner orgId={profile.orgId} />
                {children}
              </main>
            </div>
          </div>
        </div>
      </QuickBookingProvider>
    </DashboardAppearanceProvider>
  );
}
