"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { AlertTriangle, Check, ExternalLink, Rocket, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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

function message(error: unknown): string {
  return error instanceof Error ? error.message : "Publishing failed.";
}

export function ListingBanner({ orgId }: { orgId: Id<"orgs"> }) {
  const readiness = useQuery(api.listing.getListingReadiness, { orgId });
  const publish = useMutation(api.listing.publishOrg);
  const [isPublishing, setIsPublishing] = useState(false);

  if (!readiness || readiness.listingStatus === "published") return null;

  const completeCount = readiness.requirements.filter(
    (item) => item.complete,
  ).length;
  const incomplete = readiness.requirements.filter((item) => !item.complete);
  const progress = (completeCount / readiness.requirements.length) * 100;

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      await publish({ orgId });
      toast.success("Published on opus.mk");
    } catch (error) {
      toast.error(message(error));
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <Card className="border">
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            {readiness.listingStatus === "suspended" ? (
              <AlertTriangle />
            ) : readiness.allBlockingMet ? (
              <Rocket />
            ) : (
              <Sparkles />
            )}
          </div>
          <div className="flex flex-col gap-1">
            <CardTitle>
              {readiness.listingStatus === "suspended"
                ? "Your opus.mk listing is paused"
                : readiness.allBlockingMet
                  ? "Ready to publish"
                  : "Finish your opus.mk listing"}
            </CardTitle>
            <CardDescription>
              {readiness.listingStatus === "suspended"
                ? "Repair the missing requirement and the engine will restore your listing."
                : "Your dashboard remains available while you finish the booking setup."}
            </CardDescription>
          </div>
        </div>
        <CardAction className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/onboarding?step=review">
              Preview
              <ExternalLink data-icon="inline-end" />
            </Link>
          </Button>
          {readiness.allBlockingMet && (
            <Button
              size="sm"
              variant="terracotta"
              onClick={handlePublish}
              disabled={isPublishing}
            >
              {isPublishing && <Spinner />}
              Publish
            </Button>
          )}
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pb-5">
        <div className="flex items-center gap-3">
          <Progress value={progress} className="flex-1" />
          <span className="text-xs font-medium text-muted-foreground">
            {completeCount}/{readiness.requirements.length}
          </span>
        </div>

        {readiness.listingStatus === "suspended" && (
          <Alert>
            <AlertTriangle />
            <AlertTitle>Customers cannot see or book this listing</AlertTitle>
            <AlertDescription>
              The listing will return automatically when every requirement is
              valid again.
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
    </Card>
  );
}

export function ListedBadge({ orgId }: { orgId: Id<"orgs"> }) {
  const readiness = useQuery(api.listing.getListingReadiness, { orgId });
  if (readiness?.listingStatus !== "published") return null;

  return (
    <Badge variant="secondary">
      <Check />
      Listed on opus.mk
    </Badge>
  );
}
