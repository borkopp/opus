"use client";
import { useReservationCopy } from "@/hooks/use-reservation-copy";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { StudioSwitcher } from "@/components/staff/StudioSwitcher";
import { usePushSignOut } from "@/hooks/use-push-sign-out";
import { useReservationAction } from "@/hooks/use-reservation-action";
import { ReservationError } from "./ReservationFields";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import type { DashboardProfile } from "@/components/dashboard/DashboardAccountMenu";
import { DashboardAppearanceProvider } from "@/components/dashboard/DashboardAppearanceProvider";
import { resolveDashboardTheme } from "@/lib/dashboard-theme";
import s from "@/components/dashboard/clarity.module.css";
import { OnboardingHeader } from "@/components/onboarding/OnboardingHeader";

export function HospitalityShell({
  children,
  profile,
}: {
  children: React.ReactNode;
  profile: DashboardProfile;
}) {
  const copy = useReservationCopy();
  const { t } = useDashboardI18n();
  const { orgId } = profile;
  const theme = resolveDashboardTheme(profile.dashboardTheme);
  const access = useQuery(api.hospitality.getAccess);
  const pathname = usePathname();
  const router = useRouter();
  const signOut = usePushSignOut();
  const action = useReservationAction();
  if (!access)
    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-4 p-6">
        <Skeleton className="h-14" />
        <Skeleton className="h-80" />
      </div>
    );
  if (!access.available)
    return (
      <main className="mx-auto max-w-xl p-6">
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{copy("This workspace is unavailable")}</EmptyTitle>
            <EmptyDescription>
              {copy(
                "Use a business you have access to, or contact the account owner.",
              )}
            </EmptyDescription>
          </EmptyHeader>
          <StudioSwitcher orgId={orgId} />
          <Button
            variant="outline"
            onClick={() =>
              void action.run(async () => {
                await signOut();
                router.replace("/login");
              })
            }
          >
            {copy("Sign out")}
          </Button>
          <ReservationError error={action.error} />
        </Empty>
      </main>
    );
  if (!access.hasVenue && access.canCreate && pathname === "/hospitality/setup")
    return (
      <main className="min-h-dvh bg-background">
        <OnboardingHeader dashboardHref={orgId ? "/beauty" : undefined} />
        <div className="mx-auto flex max-w-6xl flex-col items-center px-4 pb-8 pt-8 sm:px-8 sm:pb-16 sm:pt-12">
          {children}
        </div>
      </main>
    );
  return (
    <DashboardAppearanceProvider theme={theme}>
      <div
        data-dashboard-theme={theme}
        className={`dashboard-shell ${s.scope}`}
      >
        <a
          data-replay-public
          className="dashboard-skip-link"
          href="#dashboard-content"
        >
          {t(
            "Skip to content",
            "Прескокни до содржината",
            "Kalo te përmbajtja",
          )}
        </a>
        <div className={s.stage}>
          <div className={s.dashboard}>
            <DashboardHeader
              profile={{ ...profile, industry: "hospitality" }}
            />
            <main
              id="dashboard-content"
              tabIndex={-1}
              className="dashboard-workspace dashboard-page"
            >
              {!access.hasVenue && pathname !== "/hospitality/setup" ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyTitle>{copy("Set up your venue")}</EmptyTitle>
                    <EmptyDescription>
                      {copy(
                        "Add your tables and reservation hours to get started.",
                      )}
                    </EmptyDescription>
                  </EmptyHeader>
                  <Button asChild>
                    <Link href="/hospitality/setup">
                      {copy("Start venue setup")}
                    </Link>
                  </Button>
                </Empty>
              ) : (
                children
              )}
            </main>
          </div>
        </div>
      </div>
    </DashboardAppearanceProvider>
  );
}
