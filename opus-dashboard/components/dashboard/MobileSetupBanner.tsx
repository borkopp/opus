"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";

export function MobileSetupBanner({ orgId }: { orgId: Id<"orgs"> }) {
  const { t } = useDashboardI18n();
  const readiness = useQuery(api.website.getReadiness, { orgId });
  if (!readiness) return null;
  const remaining = readiness.requirements.filter(
    (item) => !item.complete,
  ).length;
  if (remaining === 0 && readiness.websiteStatus === "published") return null;

  return (
    <Link
      href="/onboarding?step=review"
      className="dashboard-setup-banner mb-4 flex min-h-12 shrink-0 items-center gap-3 rounded-2xl bg-warning/10 px-4 py-3 text-sm text-warning md:hidden"
    >
      <AlertTriangle className="size-4 shrink-0" />
      <span data-replay-public className="min-w-0 flex-1">
        {remaining > 0
          ? t(
              `Finish studio setup · ${remaining} remaining`,
              `Довршете го поставувањето · ${remaining} ${remaining === 1 ? "чекор" : "чекори"}`,
            )
          : t(
              "Your website is ready to publish",
              "Вашата веб-страница е подготвена за објавување",
            )}
      </span>
      <ArrowRight className="size-4 shrink-0" />
    </Link>
  );
}
