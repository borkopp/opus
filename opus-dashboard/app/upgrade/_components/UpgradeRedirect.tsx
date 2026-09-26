"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Spinner } from "@/components/ui/spinner";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { upgradeDestination, UPGRADE_LOGIN_PATH } from "@/lib/upgrade";

export function UpgradeRedirect() {
  const router = useRouter();
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
      router.replace(UPGRADE_LOGIN_PATH);
      return;
    }
    if (!profile || (needsSetupCheck && activation === undefined)) return;
    router.replace(
      upgradeDestination({
        hasStudio: Boolean(profile.orgId),
        role: profile.role,
        plan: profile.plan,
        operationalSetupComplete: activation?.operationalSetupComplete ?? false,
      }),
    );
  }, [
    isLoading,
    isAuthenticated,
    profile,
    needsSetupCheck,
    activation,
    router,
  ]);

  return (
    <main
      className="flex min-h-dvh items-center justify-center gap-3 bg-background px-4"
      aria-busy="true"
      aria-live="polite"
    >
      <Spinner />
      <p className="text-sm text-muted-foreground">
        {t("Opening OPUS Pro…", "Го отвораме OPUS Pro…")}
      </p>
    </main>
  );
}
