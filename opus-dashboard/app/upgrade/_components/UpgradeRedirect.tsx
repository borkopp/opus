"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Spinner } from "@/components/ui/spinner";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { upgradeDestination, upgradeLoginPath } from "@/lib/upgrade";
import { parseProTeamLimit } from "../../../../shared/pro-pricing";

export function UpgradeRedirect() {
  const router = useRouter();
  const teamLimit = parseProTeamLimit(useSearchParams().get("team"));
  const { t } = useDashboardI18n();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const profile = useQuery(
    api.users.getMyProfile,
    isAuthenticated ? {} : "skip",
  );
  const needsSetupCheck = Boolean(
    profile?.orgId && profile.role === "owner" && profile.plan !== "paid",
  );
  const activation = useQuery(
    api.activation.getState,
    needsSetupCheck ? {} : "skip",
  );

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace(upgradeLoginPath(teamLimit));
      return;
    }
    if (!profile || (needsSetupCheck && activation === undefined)) return;
    router.replace(
      upgradeDestination({
        hasStudio: Boolean(profile.orgId),
        role: profile.role,
        plan: profile.plan,
        operationalSetupComplete: activation?.operationalSetupComplete ?? false,
        teamLimit,
      }),
    );
  }, [
    isLoading,
    isAuthenticated,
    profile,
    needsSetupCheck,
    activation,
    router,
    teamLimit,
  ]);

  return (
    <main
      className="flex min-h-dvh items-center justify-center gap-3 bg-background px-4"
      aria-busy="true"
      aria-live="polite"
    >
      <Spinner />
      <p className="text-sm text-muted-foreground">
        {t(
          "Opening OPUS Pro…",
          "Го отвораме OPUS Pro…",
          "Duke hapur OPUS Pro…",
        )}
      </p>
    </main>
  );
}
