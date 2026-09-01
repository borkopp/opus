"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { AppSidebar, SidebarProvider } from "@/components/sidebar";
import React from "react";
import { getNavLinks } from "@/lib/vertical-nav-config";
import { ACTIVE_DASHBOARD_PATH, ACTIVE_INDUSTRY } from "@/lib/product-scope";
import { QuickBookingProvider } from "@/components/bookings/QuickBookingProvider";

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
    const sharedPaths = ["/settings", "/notifications", "/gap-optimizer", "/ai-inbox"];
    if (sharedPaths.some((p) => pathname.startsWith(p))) return;

    // If in the wrong vertical module, redirect
    if (!pathname.startsWith(targetBase)) {
      router.push(targetBase);
    }
  }, [profile, pathname, router]);

  if (isLoading || (isAuthenticated && !profile)) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  if (!profile?.orgId) return null;

  // ── Resolve nav links from vertical config ──────────────
  const industry =
    profile?.industry === ACTIVE_INDUSTRY ? profile.industry : ACTIVE_INDUSTRY;
  const { basePath: industryBase, links: primaryLinks } = getNavLinks(industry);

  return (
    <SidebarProvider>
      <QuickBookingProvider orgId={profile.orgId}>
        <div className="flex h-screen w-full flex-col md:flex-row overflow-hidden bg-background">
          <AppSidebar
            profile={profile}
            primaryLinks={primaryLinks}
            industryBase={industryBase}
          />
          <main className="flex-1 overflow-y-auto p-4 md:p-8 w-full bg-background relative z-0 flex flex-col">
            {children}
          </main>
        </div>
      </QuickBookingProvider>
    </SidebarProvider>
  );
}
