"use client";

import { Appear } from "@/components/ui/appear";
import { appearStep } from "@/lib/appear";
import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { AlertTriangle, ChevronRight, Rocket } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";

import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { tenantSiteUrl } from "@/lib/tenant-sites";
import { LogoMark } from "../Logo";
import { requirementCopy } from "@/lib/i18n/onboarding";
import { LiveWebsiteCard } from "./LiveWebsiteCard";

function getRequirementLabel(
  code: string,
  fallbackLabel: string,
  t: (en: string, mk: string) => string,
): string {
  return t(fallbackLabel, requirementCopy[code]?.[0] ?? fallbackLabel);
}

export function WebsiteBanner({ orgId }: { orgId: Id<"orgs"> }) {
  const { t } = useDashboardI18n();
  const readiness = useQuery(api.website.getReadiness, { orgId });
  const publish = useMutation(api.website.publish);
  const [isPublishing, setIsPublishing] = useState(false);

  if (!readiness) return null;

  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "opus.mk";
  const websiteUrl = tenantSiteUrl(readiness.slug, rootDomain);
  const isPublished = readiness.websiteStatus === "published";
  const completeCount = readiness.requirements.filter(
    (item) => item.complete,
  ).length;
  const progress = (completeCount / readiness.requirements.length) * 100;
  const incompleteRequirements = readiness.requirements.filter(
    (item) => !item.complete,
  );
  const MAX_VISIBLE_INCOMPLETE = 4;
  const visibleIncomplete =
    incompleteRequirements.length <= MAX_VISIBLE_INCOMPLETE
      ? incompleteRequirements
      : incompleteRequirements.slice(0, 3);
  const remainingCount =
    incompleteRequirements.length - visibleIncomplete.length;

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      await publish({ orgId });
      toast.success(t("Website published", "Веб-страницата е објавена"));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t(
              "Website publishing failed.",
              "Не успеа објавувањето на веб-страницата.",
            ),
      );
    } finally {
      setIsPublishing(false);
    }
  };

  if (isPublished) return <LiveWebsiteCard websiteUrl={websiteUrl} />;

  return (
    <Appear
      delay={90}
      className="flex flex-col gap-4 rounded-[25px] bg-card p-6"
    >
      <div
        data-appear="item"
        style={appearStep(1)}
        className="flex items-center justify-between gap-2"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
            {readiness.websiteStatus === "suspended" ? (
              <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
            ) : readiness.allBlockingMet ? (
              <Rocket className="h-3.5 w-3.5" />
            ) : (
              <LogoMark className="h-3.5 w-3.5 text-brand" />
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span
              data-replay-public
              className="text-xs font-semibold text-foreground truncate leading-tight"
            >
              {t("Studio Website", "Веб-страница на студиото")}
            </span>
            <span className="text-[10px] text-muted-foreground truncate leading-tight font-mono">
              {readiness.slug}.{rootDomain}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-6 px-2 text-[10px]"
          >
            <Link data-replay-public href="/onboarding?step=review">
              {t("Setup", "Постави")}
            </Link>
          </Button>
          {readiness.allBlockingMet && (
            <Button
              data-replay-public
              size="sm"
              onClick={handlePublish}
              disabled={isPublishing}
              className="h-6 px-2 text-[10px]"
            >
              {isPublishing ? (
                <Spinner className="h-3 w-3" />
              ) : (
                t("Publish", "Објави")
              )}
            </Button>
          )}
        </div>
      </div>

      <div
        data-appear="item"
        style={appearStep(2)}
        className="flex flex-col gap-1.5 pt-0.5"
      >
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span data-replay-public className="font-medium">
            {t("Readiness", "Подготвеност")}
          </span>
          <span data-replay-public className="font-mono">
            {completeCount}/{readiness.requirements.length}
          </span>
        </div>
        <Progress value={progress} className="h-1" />
      </div>

      {incompleteRequirements.length > 0 && (
        <div className="space-y-1 pt-1 border-t border-border/40">
          <div
            data-appear="item"
            style={appearStep(3)}
            className="flex items-center justify-between text-[10px] text-muted-foreground/80 pb-0.5"
          >
            <span
              data-replay-public
              className="font-medium uppercase tracking-wider text-[9px]"
            >
              {t("To complete", "За завршување")}
            </span>
            <Link
              data-replay-public
              href="/onboarding?step=review"
              className="text-[10px] text-primary hover:underline"
            >
              {t("Checklist", "Листа за проверка")}
            </Link>
          </div>
          <div className="flex flex-col gap-0.5">
            {visibleIncomplete.map((req, index) => (
              <Link
                key={req.code}
                data-appear="item"
                style={appearStep(3 + index)}
                href={req.actionHref}
                className="group flex items-center justify-between gap-1.5 rounded-md px-1.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-secondary/80 hover:text-foreground"
              >
                <div className="flex items-center gap-1.5 min-w-0 truncate">
                  <span className="size-1.5 rounded-full bg-amber-500/90 shrink-0 group-hover:bg-primary transition-colors" />
                  <span data-replay-public className="truncate">
                    {getRequirementLabel(req.code, req.label, t)}
                  </span>
                </div>
                <ChevronRight className="h-3 w-3 text-muted-foreground/50 group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
              </Link>
            ))}
            {remainingCount > 0 && (
              <Link
                href="/onboarding?step=review"
                className="px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-primary transition-colors block text-left"
              >
                +{remainingCount}{" "}
                {t("more in setup →", "уште во поставување →")}
              </Link>
            )}
          </div>
        </div>
      )}
    </Appear>
  );
}
