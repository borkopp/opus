"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  ChevronRight,
  Copy,
  ExternalLink,
  Globe2,
  Rocket,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { tenantSiteUrl } from "@/lib/tenant-sites";
import { LogoMark } from "../Logo";

function message(error: unknown): string {
  return error instanceof Error ? error.message : "Website publishing failed.";
}

export function WebsiteBanner({
  orgId,
  collapsed = false,
}: {
  orgId: Id<"orgs">;
  collapsed?: boolean;
}) {
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
      toast.success("Website published");
    } catch (error) {
      toast.error(message(error));
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(websiteUrl);
      toast.success("Website link copied");
    } catch {
      toast.error("Could not copy the website link");
    }
  };

  if (collapsed) {
    return (
      <div className="flex justify-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={websiteUrl}
              target="_blank"
              rel="noreferrer"
              className="group relative flex h-10 w-10 items-center justify-center rounded-lg border border-border/40 bg-secondary/50 text-foreground hover:bg-secondary hover:text-primary transition-all active:scale-95"
              aria-label="Open studio website"
            >
              {isPublished ? (
                <Globe2 className="h-4.5 w-4.5 text-primary" />
              ) : readiness.allBlockingMet ? (
                <Rocket className="h-4.5 w-4.5 text-accent-foreground" />
              ) : (
                <Sparkles className="h-4.5 w-4.5 text-muted-foreground" />
              )}
              {isPublished && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-sidebar" />
              )}
            </a>
          </TooltipTrigger>
          <TooltipContent
            side="right"
            sideOffset={10}
            className="flex flex-col gap-1 max-w-xs"
          >
            <p className="font-semibold text-xs leading-tight">
              {isPublished ? "Studio website is live" : "Studio website setup"}
            </p>
            <p className="text-[11px] text-muted-foreground font-mono truncate">
              {readiness.slug}.{rootDomain}
            </p>
            {!isPublished && (
              <p className="text-[10px] text-muted-foreground">
                Readiness: {completeCount}/{readiness.requirements.length}
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/60 bg-secondary/30 p-2.5 space-y-2.5 transition-colors hover:bg-secondary/50">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-background/80 border border-border/40 text-primary">
            {readiness.websiteStatus === "suspended" ? (
              <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
            ) : isPublished ? (
              <Globe2 className="h-3.5 w-3.5" />
            ) : readiness.allBlockingMet ? (
              <Rocket className="h-3.5 w-3.5" />
            ) : (
              <LogoMark className="h-3.5 w-3.5 text-brand-primary" />
            )}
            {isPublished && (
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-1 ring-background" />
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-foreground truncate leading-tight">
              {isPublished ? "Website is live" : "Studio Website"}
            </span>
            <span className="text-[10px] text-muted-foreground truncate leading-tight font-mono">
              {readiness.slug}.{rootDomain}
            </span>
          </div>
        </div>

        {isPublished ? (
          <div className="flex items-center gap-0.5 shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer active:scale-95"
                  aria-label="Copy website link"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={6}>
                Copy link
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={websiteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer active:scale-95"
                  aria-label="Open website"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={6}>
                Open site
              </TooltipContent>
            </Tooltip>
          </div>
        ) : (
          <div className="flex items-center gap-1 shrink-0">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-6 px-2 text-[10px]"
            >
              <Link href="/onboarding?step=review">Setup</Link>
            </Button>
            {readiness.allBlockingMet && (
              <Button
                size="sm"
                onClick={handlePublish}
                disabled={isPublishing}
                className="h-6 px-2 text-[10px]"
              >
                {isPublishing ? <Spinner className="h-3 w-3" /> : "Publish"}
              </Button>
            )}
          </div>
        )}
      </div>

      {!isPublished && (
        <div className="space-y-1.5 pt-0.5">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span className="font-medium">Readiness</span>
            <span className="font-mono">
              {completeCount}/{readiness.requirements.length}
            </span>
          </div>
          <Progress value={progress} className="h-1" />
        </div>
      )}

      {!isPublished && incompleteRequirements.length > 0 && (
        <div className="space-y-1 pt-1 border-t border-border/40">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground/80 pb-0.5">
            <span className="font-medium uppercase tracking-wider text-[9px]">
              To complete
            </span>
            <Link
              href="/onboarding?step=review"
              className="text-[10px] text-primary hover:underline"
            >
              Checklist
            </Link>
          </div>
          <div className="flex flex-col gap-0.5">
            {visibleIncomplete.map((req) => (
              <Link
                key={req.code}
                href={req.actionHref}
                className="group flex items-center justify-between gap-1.5 rounded-md px-1.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-secondary/80 hover:text-foreground"
              >
                <div className="flex items-center gap-1.5 min-w-0 truncate">
                  <span className="size-1.5 rounded-full bg-amber-500/90 shrink-0 group-hover:bg-primary transition-colors" />
                  <span className="truncate">{req.label}</span>
                </div>
                <ChevronRight className="h-3 w-3 text-muted-foreground/50 group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
              </Link>
            ))}
            {remainingCount > 0 && (
              <Link
                href="/onboarding?step=review"
                className="px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-primary transition-colors block text-left"
              >
                +{remainingCount} more in setup &rarr;
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
