"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Spinner } from "@/components/ui/spinner";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { upgradeDestination, upgradeLoginPath } from "@/lib/upgrade";
import { hospitalityHome } from "@/lib/onboarding";
import { parseProTeamLimit } from "../../../../shared/pro-pricing";
import { parseBillingCurrency } from "../../../../shared/billing-currency";

export function UpgradeRedirect() {
  const router = useRouter();
  const params = useSearchParams();
  const teamLimit = parseProTeamLimit(params.get("team"));
  const currency = parseBillingCurrency(params.get("currency"));
  const { t } = useDashboardI18n();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const profile = useQuery(
    api.users.getMyProfile,
    isAuthenticated ? {} : "skip",
  );
  const needsSetupCheck = Boolean(
    profile?.orgId &&
    profile.industry === "beauty_wellness" &&
    profile.role === "owner" &&
    profile.plan !== "paid",
  );
  const hospitalityAccess = useQuery(
    api.hospitality.getAccess,
    profile?.industry === "hospitality" ? {} : "skip",
  );
  const activation = useQuery(
    api.activation.getState,
    needsSetupCheck ? {} : "skip",
  );

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace(upgradeLoginPath(teamLimit, currency));
      return;
    }
    if (!profile || (needsSetupCheck && activation === undefined)) return;
    if (profile.industry === "hospitality") {
      if (hospitalityAccess)
        router.replace(
          hospitalityHome(hospitalityAccess.onboardingComplete, profile.role),
        );
      return;
    }
    router.replace(
      upgradeDestination({
        hasStudio: Boolean(profile.orgId),
        role: profile.role,
        plan: profile.plan,
        operationalSetupComplete: activation?.operationalSetupComplete ?? false,
        teamLimit,
        currency,
      }),
    );
  }, [
    isLoading,
    isAuthenticated,
    profile,
    needsSetupCheck,
    activation,
    hospitalityAccess,
    router,
    teamLimit,
    currency,
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
