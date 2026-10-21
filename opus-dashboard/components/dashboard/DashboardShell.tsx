"use client";

import { useQuery } from "convex/react";
import { useSessionRecovery } from "@/hooks/use-session-recovery";
import { SessionLoading } from "@/components/auth/SessionLoading";
import { api } from "@/convex/_generated/api";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import s from "@/components/dashboard/clarity.module.css";
import React from "react";
import { ACTIVE_DASHBOARD_PATH, isActiveIndustry } from "@/lib/product-scope";
import { BeautyStudioRequired } from "@/components/dashboard/BeautyStudioRequired";
import { QuickBookingProvider } from "@/components/bookings/QuickBookingProvider";
import { WebsiteSetupBanner } from "@/components/dashboard/WebsiteSetupBanner";
import { DashboardAnnouncementCarousel } from "@/components/dashboard/DashboardAnnouncementCarousel";
import { DashboardAppearanceProvider } from "@/components/dashboard/DashboardAppearanceProvider";
import { resolveDashboardTheme } from "@/lib/dashboard-theme";
import { BrowserPushSync } from "@/components/notifications/BrowserPushSync";
import { Spinner } from "@/components/ui/spinner";
import { StudioInstallCard } from "@/components/pwa/StudioInstallCard";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, isSignedOut, isRecovering, retry } =
    useSessionRecovery();
  const router = useRouter();
  const pathname = usePathname();

  const profile = useQuery(
    api.users.getMyProfile,
    isAuthenticated ? {} : "skip",
  );

  useEffect(() => {
    if (isSignedOut) {
      const callback = `${pathname}${window.location.search}`;
      router.replace(`/login?callbackUrl=${encodeURIComponent(callback)}`);
    }
  }, [isSignedOut, pathname, router]);

  useEffect(() => {
    if (profile && !profile.orgId) {
      router.replace("/onboarding");
    }
  }, [profile, router]);

  // ── Industry-based routing ──────────────────────────────
  useEffect(() => {
    if (!profile || !isActiveIndustry(profile.industry)) return;

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
  }, [profile, pathname, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <SessionLoading recovering={isRecovering} onRetry={retry} />
      </div>
    );
  }

  if (isAuthenticated && !profile) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Spinner className="size-8 text-brand" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  if (!profile?.orgId) return null;
  // A shared session can still select a business from another product vertical.
  // Check before mounting any beauty queries, including those on shared routes.
  if (!isActiveIndustry(profile.industry))
    return <BeautyStudioRequired orgId={profile.orgId} />;

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
          className={`dashboard-shell ${s.scope} ${pathname === "/beauty/bookings" ? s.viewportShell : ""}`}
        >
          <a
            data-replay-public
            className="dashboard-skip-link"
            href="#dashboard-content"
          >
            Skip to content
          </a>
          {pathname === "/beauty/assistant" ? (
            <main id="dashboard-content" tabIndex={-1}>
              {children}
            </main>
          ) : (
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
                  {pathname === "/beauty" && <StudioInstallCard banner />}
                  {children}
                </main>
              </div>
            </div>
          )}
        </div>
      </QuickBookingProvider>
    </DashboardAppearanceProvider>
  );
}
