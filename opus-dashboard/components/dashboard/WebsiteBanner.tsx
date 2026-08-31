"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  Copy,
  ExternalLink,
  Globe2,
  Rocket,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { widgetTitleClassName } from "@/components/dashboard/WidgetTitle";
import { tenantSiteUrl } from "@/lib/tenant-sites";

function message(error: unknown): string {
  return error instanceof Error ? error.message : "Website publishing failed.";
}

export function WebsiteBanner({ orgId }: { orgId: Id<"orgs"> }) {
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
  const incomplete = readiness.requirements.filter((item) => !item.complete);
  const progress = (completeCount / readiness.requirements.length) * 100;

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

  return (
    <Card className="border">
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            {readiness.websiteStatus === "suspended" ? (
              <AlertTriangle />
            ) : isPublished ? (
              <Globe2 />
            ) : readiness.allBlockingMet ? (
              <Rocket />
            ) : (
              <Sparkles />
            )}
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <CardTitle className={widgetTitleClassName}>
              {readiness.websiteStatus === "suspended"
                ? "Your website is paused"
                : isPublished
                  ? "Your studio website is live"
                  : readiness.allBlockingMet
                    ? "Your website is ready to publish"
                    : "Finish your studio website"}
            </CardTitle>
            <CardDescription className="truncate">
              {isPublished
                ? websiteUrl
                : readiness.websiteStatus === "suspended"
                  ? "Repair the missing requirement and the website will return automatically."
                  : "Complete the booking setup, then publish your own opus.mk address."}
            </CardDescription>
          </div>
        </div>
        <CardAction className="flex gap-2">
          {isPublished ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopy}
              >
                <Copy data-icon="inline-start" />
                Copy
              </Button>
              <Button asChild size="sm">
                <a href={websiteUrl} target="_blank" rel="noreferrer">
                  Open
                  <ExternalLink data-icon="inline-end" />
                </a>
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="outline" size="sm">
                <Link href="/onboarding?step=review">Preview</Link>
              </Button>
              {readiness.allBlockingMet && (
                <Button
                  size="sm"
                  onClick={handlePublish}
                  disabled={isPublishing}
                >
                  {isPublishing && <Spinner data-icon="inline-start" />}
                  Publish website
                </Button>
              )}
            </>
          )}
        </CardAction>
      </CardHeader>

      {!isPublished && (
        <CardContent className="flex flex-col gap-4 pb-5">
          <div className="flex items-center gap-3">
            <Progress value={progress} className="flex-1" />
            <span className="text-xs font-medium text-muted-foreground">
              {completeCount}/{readiness.requirements.length}
            </span>
          </div>

          {readiness.websiteStatus === "suspended" && (
            <Alert>
              <AlertTriangle />
              <AlertTitle>
                Customers cannot open or book this website
              </AlertTitle>
              <AlertDescription>
                The same address will return automatically when every required
                booking detail is valid again.
              </AlertDescription>
            </Alert>
          )}

          {incomplete.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {incomplete.slice(0, 4).map((item) => (
                <Button key={item.code} asChild variant="ghost" size="sm">
                  <Link href={item.actionHref}>{item.label}</Link>
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
