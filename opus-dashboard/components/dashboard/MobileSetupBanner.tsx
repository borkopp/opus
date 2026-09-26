"use client";
import Link from "next/link";
import { useQuery } from "convex/react";
import { ArrowRight } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { nextWebsiteAction } from "@/lib/website-launch";
export function MobileSetupBanner({ orgId }: { orgId: Id<"orgs"> }) {
  const { t } = useDashboardI18n();
  const readiness = useQuery(api.website.getReadiness, { orgId });
  if (!readiness || readiness.websiteStatus === "published") return null;
  const next = nextWebsiteAction(readiness.requirements);
  return (
    <Link
      href={next.href}
      className="dashboard-setup-banner mb-4 flex min-h-12 shrink-0 items-center gap-3 rounded-2xl bg-warning/10 px-4 py-3 text-sm text-warning md:hidden"
    >
      <span data-replay-public className="min-w-0 flex-1">
        {t(next.label[0], next.label[1])}
      </span>
      <ArrowRight className="size-4 shrink-0" />
    </Link>
  );
}
