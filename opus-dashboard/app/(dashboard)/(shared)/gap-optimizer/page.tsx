"use client";

import { RecoveryDashboard } from "./_components/RecoveryDashboard";
import { useState } from "react";
import { useConvexAuth, useQuery } from "convex/react";
import { redirect } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { ACTIVE_CAPABILITIES } from "@/lib/product-scope";
import { PaidFeatureOverlay } from "@/components/ui/paid-feature-overlay";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";

export default function GapOptimizerPage() {
  const { t } = useDashboardI18n();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [date, setDate] = useState<string>();
  const profile = useQuery(
    api.users.getMyProfile,
    isAuthenticated ? {} : "skip",
  );
  const orgId = profile?.orgId;
  const isPaid = profile?.plan === "paid";
  const data = useQuery(
    api.ai.gapOptimizerHelpers.getRecoveryDashboard,
    orgId && isPaid ? { orgId, serviceDate: date } : "skip",
  );
  if (!ACTIVE_CAPABILITIES.automatedGapOptimizer) redirect("/beauty");
  if (isLoading || profile === undefined || (isPaid && data === undefined))
    return <Skeleton className="h-80 w-full" />;
  if (!orgId) return null;
  return (
    <PaidFeatureOverlay
      locked={!isPaid}
      featureLabel={t(
        "Opening recovery requires OPUS Pro",
        "Пополнувањето слободни термини бара OPUS Pro",
      )}
    >
      {!isPaid && (
        <div
          data-replay-public
          className="flex min-h-80 items-center justify-center border p-8 text-center text-muted-foreground"
        >
          {t(
            "Find bookable openings and invite clients with your approval.",
            "Пронајдете слободни термини и поканете клиенти со ваше одобрение.",
          )}
        </div>
      )}
      {data && (
        <RecoveryDashboard orgId={orgId} data={data} onDateChange={setDate} />
      )}
    </PaidFeatureOverlay>
  );
}
