"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { ArrowRight, ImagePlus, UsersRound, X } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { Button } from "@/components/ui/button";
import { nextWebsiteAction } from "@/lib/website-launch";

export function WebsiteSetupBanner({ orgId }: { orgId: Id<"orgs"> }) {
  const { t } = useDashboardI18n();
  const [dismissed, setDismissed] = useState(false);
  const readiness = useQuery(api.website.getReadiness, { orgId });
  if (!readiness) return null;

  if (readiness.websiteStatus === "published") {
    if (dismissed || readiness.recommendedCount >= readiness.recommendedTotal)
      return null;

    return (
      <div className="dashboard-setup-banner relative mb-4 flex min-h-12 shrink-0 rounded-2xl bg-warning/10 px-4 py-1 text-sm text-warning">
        <details className="min-w-0 flex-1">
          <summary
            data-replay-public
            className="min-h-11 cursor-pointer rounded-lg py-3 pr-14 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {t(
              "Improve your website (optional)",
              "Подобрете ја страницата (незадолжително)",
            )}
          </summary>
          <div className="flex flex-col gap-1 pb-2">
            <Link
              className="flex min-h-11 items-center gap-3 rounded-lg py-3 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              href="/settings?tab=branding"
            >
              <ImagePlus aria-hidden="true" className="size-4 shrink-0" />
              <span data-replay-public className="min-w-0 flex-1">
                {t(
                  "Add photos, a logo, or contact details",
                  "Додајте фотографии, лого или контакт",
                )}
              </span>
              <ArrowRight aria-hidden="true" className="size-4 shrink-0" />
            </Link>
            <Link
              className="flex min-h-11 items-center gap-3 rounded-lg py-3 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              href="/beauty/services"
            >
              <UsersRound aria-hidden="true" className="size-4 shrink-0" />
              <span data-replay-public className="min-w-0 flex-1">
                {t(
                  "Add more services or team members",
                  "Додајте услуги или членови на тимот",
                )}
              </span>
              <ArrowRight aria-hidden="true" className="size-4 shrink-0" />
            </Link>
          </div>
        </details>
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-1 size-11"
          onClick={() => setDismissed(true)}
          aria-label={t("Dismiss suggestions", "Сокриј предлози")}
        >
          <X />
        </Button>
      </div>
    );
  }

  const next = nextWebsiteAction(readiness.requirements);
  return (
    <Link
      href={next.href}
      className="dashboard-setup-banner mb-4 flex min-h-12 shrink-0 items-center gap-3 rounded-2xl bg-warning/10 px-4 py-3 text-sm text-warning focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <span data-replay-public className="min-w-0 flex-1">
        {t(next.label[0], next.label[1])}
      </span>
      <ArrowRight className="size-4 shrink-0" />
    </Link>
  );
}
