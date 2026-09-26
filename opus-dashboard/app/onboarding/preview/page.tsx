"use client";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Spinner } from "@/components/ui/spinner";
import { PublicSiteFrame } from "@/components/public-site/PublicSiteFrame";
import { StudioWebsite } from "@/components/public-site/StudioWebsite";

export default function WebsitePreviewPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const site = useQuery(
    api.activation.getPreview,
    isAuthenticated ? {} : "skip",
  );
  if (isLoading || (isAuthenticated && site === undefined))
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner />
      </div>
    );
  if (!site) return null;
  // Render the real site without allowing preview links to leave the setup flow.
  return (
    <div inert data-replay-private>
      <PublicSiteFrame site={site}>
        <StudioWebsite site={site} />
      </PublicSiteFrame>
    </div>
  );
}
