"use client";
import Link from "next/link";
import { useQuery } from "convex/react";
import { ArrowRight, Globe2 } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Appear } from "@/components/ui/appear";
import { Button } from "@/components/ui/button";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { tenantSiteUrl } from "@/lib/tenant-sites";
import { nextWebsiteAction } from "@/lib/website-launch";
import { LiveWebsiteCard } from "./LiveWebsiteCard";

export function WebsiteBanner({ orgId }: { orgId: Id<"orgs"> }) {
  const { t } = useDashboardI18n();
  const readiness = useQuery(api.website.getReadiness, { orgId });
  if (!readiness) return null;
  const url = tenantSiteUrl(
    readiness.slug,
    process.env.NEXT_PUBLIC_ROOT_DOMAIN || "opus.mk",
  );
  if (readiness.websiteStatus === "published")
    return (
      <LiveWebsiteCard
        websiteUrl={url}
        showEnhancements={
          readiness.recommendedCount < readiness.recommendedTotal
        }
      />
    );
  const next = nextWebsiteAction(readiness.requirements);
  return (
    <Appear
      delay={90}
      className="flex min-w-0 flex-col gap-4 rounded-[25px] bg-card p-5 md:p-6"
    >
      <Globe2 className="size-6 text-primary" />
      <h2 data-replay-public className="text-base font-medium">
        {readiness.allBlockingMet
          ? t(
              "Your booking website is ready",
              "Вашата страница за закажување е подготвена",
            )
          : t(
              "Start accepting online bookings",
              "Започнете со онлајн закажување",
            )}
      </h2>
      <p
        data-replay-public
        className="text-sm leading-relaxed text-muted-foreground"
      >
        {readiness.allBlockingMet
          ? t(
              "Preview your website and publish your booking link.",
              "Прегледајте ја страницата и објавете го линкот за закажување.",
            )
          : t(
              "Complete the next step to get your booking link. Photos and branding can wait.",
              "Завршете го следниот чекор за да го добиете линкот за закажување. Фотографии и лого можете да додадете подоцна.",
            )}
      </p>
      <Button
        asChild
        className="mt-auto min-h-12 h-auto w-full justify-between whitespace-normal text-left"
      >
        <Link data-replay-public href={next.href}>
          {t(next.label[0], next.label[1])}
          <ArrowRight data-icon="inline-end" />
        </Link>
      </Button>
    </Appear>
  );
}
