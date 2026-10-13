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
import { WebsiteSetupBanner } from "@/components/dashboard/WebsiteSetupBanner";
import { DashboardAnnouncementCarousel } from "@/components/dashboard/DashboardAnnouncementCarousel";
import { DashboardAppearanceProvider } from "@/components/dashboard/DashboardAppearanceProvider";
import { resolveDashboardTheme } from "@/lib/dashboard-theme";
import { BrowserPushSync } from "@/components/notifications/BrowserPushSync";
import { HospitalityShell } from "@/components/reservations/HospitalityShell";
import { hospitalityHome } from "@/lib/onboarding";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();
  const pathname = usePathname();
  const hospitalityRoute = pathname.startsWith("/hospitality");

  const profile = useQuery(
    api.users.getMyProfile,
    isAuthenticated ? {} : "skip",
  );

  const hospitalityAccess = useQuery(
    api.hospitality.getAccess,
    profile?.industry === "hospitality" ? {} : "skip",
  );
  const hospitalityDestination = hospitalityHome(
    hospitalityAccess?.onboardingComplete ?? false,
    profile?.role,
  );

  const orgSettingsData = useQuery(
    api.orgSettings.getOrgSettings,
    profile?.orgId &&
      !hospitalityRoute &&
      profile.industry === "beauty_wellness" &&
      profile.bookingAccess !== "own"
      ? { orgId: profile.orgId }
      : "skip",
  );

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const callback =
        pathname === "/notifications/open" || hospitalityRoute
          ? `${pathname}${window.location.search}`
          : undefined;
      router.replace(
        callback
          ? `/login?callbackUrl=${encodeURIComponent(callback)}`
          : "/login",
      );
    }
  }, [isAuthenticated, isLoading, pathname, router, hospitalityRoute]);

  useEffect(() => {
    if (profile && !profile.orgId) {
      router.replace("/onboarding");
    }
  }, [profile, router]);

  // ── Industry-based routing ──────────────────────────────
  useEffect(() => {
    if (!profile || !profile.industry) return;
    if (profile.industry === "hospitality") {
      if (
        hospitalityAccess &&
        (!hospitalityRoute ||
          (hospitalityDestination === "/hospitality/setup" &&
            pathname !== hospitalityDestination))
      )
        router.replace(hospitalityDestination);
      return;
    }
    if (hospitalityRoute) return;

    if (profile.bookingAccess === "own") {
      if (
        pathname === "/notifications/preferences" ||
        pathname === "/notifications/open"
      )
        return;
      if (pathname !== "/beauty/bookings") router.replace("/beauty/bookings");
      return;
    }
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
      "/website",
    ];
    if (sharedPaths.some((p) => pathname.startsWith(p))) return;

    // If in the wrong vertical module, redirect
    if (!pathname.startsWith(targetBase)) {
      router.push(targetBase);
    }
  }, [
    profile,
    pathname,
    router,
    hospitalityRoute,
    hospitalityAccess,
    hospitalityDestination,
  ]);

  if (
    isLoading ||
    (isAuthenticated && !profile) ||
    (profile?.industry === "hospitality" && !hospitalityAccess) ||
    (profile?.orgId &&
      !hospitalityRoute &&
      profile.industry === "beauty_wellness" &&
      profile.bookingAccess !== "own" &&
      orgSettingsData === undefined)
  ) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  if (!profile?.orgId) return null;
  // Wait for the vertical redirect before mounting route-specific tenant queries.
  if (
    profile?.industry === "hospitality" &&
    (!hospitalityRoute ||
      (hospitalityDestination === "/hospitality/setup" &&
        pathname !== hospitalityDestination))
  )
    return null;
  if (hospitalityRoute || profile?.industry === "hospitality")
    return <HospitalityShell profile={profile}>{children}</HospitalityShell>;
  if (!profile?.orgId) return null;
  if (
    profile.bookingAccess === "own" &&
    pathname !== "/beauty/bookings" &&
    pathname !== "/notifications/preferences" &&
    pathname !== "/notifications/open"
  )
    return null;

  if (pathname === "/website" || pathname.startsWith("/website/"))
    return <>{children}</>;

  return (
    <DashboardAppearanceProvider
      theme={resolveDashboardTheme(profile.dashboardTheme)}
    >
      <BrowserPushSync key={`${profile.orgId}:${profile.user._id}`} />
      <QuickBookingProvider key={profile.orgId} orgId={profile.orgId}>
        <div
          data-dashboard-theme={resolveDashboardTheme(profile.dashboardTheme)}
          className={`dashboard-shell ${s.scope} ${pathname === "/beauty/bookings" || (pathname === "/beauty/assistant" && profile.plan === "paid") ? s.viewportShell : ""}`}
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
                {profile.bookingAccess !== "own" && (
                  <WebsiteSetupBanner
                    key={profile.orgId}
                    orgId={profile.orgId}
                  />
                )}
                <DashboardAnnouncementCarousel
                  key={`announcements:${profile.orgId}`}
                />
                {children}
              </main>
            </div>
          </div>
        </div>
      </QuickBookingProvider>
    </DashboardAppearanceProvider>
  );
}
