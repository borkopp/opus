"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  IconCircleCheck,
  IconCircle,
  IconRocket,
  IconAlertTriangle,
  IconBuildingStore,
  IconCamera,
  IconUsers,
  IconCalendar,
  IconCreditCard,
  IconMapPin,
  IconPhoto,
  IconPencil,
  IconFileText,
  IconList,
  IconPhone,
  IconBadge,
  IconSparkles,
} from "@tabler/icons-react";

// ────────────────────────────────────────────────────────────────
// LISTING CHECKLIST ITEM CONFIG
// ────────────────────────────────────────────────────────────────

interface ChecklistItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  /** Settings tab value the user should land on to fix this */
  settingsTab?: string;
  /** If provided, link the user here instead of settings */
  href?: string;
}

const BLOCKING_ITEMS: ChecklistItem[] = [
  {
    key: "businessName",
    label: "Business name set",
    icon: <IconBuildingStore size={16} stroke={1.5} />,
    settingsTab: "branding",
  },
  {
    key: "logoUploaded",
    label: "Logo uploaded",
    icon: <IconCamera size={16} stroke={1.5} />,
    settingsTab: "branding",
  },
  {
    key: "activeService",
    label: "At least one active service",
    icon: <IconList size={16} stroke={1.5} />,
    href: "/beauty/services",
  },
  {
    key: "activeStaff",
    label: "At least one active staff member",
    icon: <IconUsers size={16} stroke={1.5} />,
    href: "/beauty/staff",
  },
  {
    key: "availabilitySet",
    label: "Availability configured",
    icon: <IconCalendar size={16} stroke={1.5} />,
    href: "/beauty/staff",
  },
  {
    key: "locationSet",
    label: "City or address set",
    icon: <IconMapPin size={16} stroke={1.5} />,
    settingsTab: "branding",
  },
];

const RECOMMENDED_ITEMS: ChecklistItem[] = [
  {
    key: "coverPhoto",
    label: "Cover photo uploaded",
    icon: <IconPhoto size={16} stroke={1.5} />,
    settingsTab: "branding",
  },
  {
    key: "tagline",
    label: "Tagline filled in",
    icon: <IconPencil size={16} stroke={1.5} />,
    settingsTab: "branding",
  },
  {
    key: "bio",
    label: "Bio written",
    icon: <IconFileText size={16} stroke={1.5} />,
    settingsTab: "branding",
  },
  {
    key: "threeServices",
    label: "At least 3 services",
    icon: <IconList size={16} stroke={1.5} />,
    href: "/beauty/services",
  },
  {
    key: "phoneSet",
    label: "Phone number set",
    icon: <IconPhone size={16} stroke={1.5} />,
    settingsTab: "branding",
  },
  {
    key: "paymentConnected",
    label: "Payment account connected",
    icon: <IconCreditCard size={16} stroke={1.5} />,
    settingsTab: "deposits",
  },
];

// ────────────────────────────────────────────────────────────────
// LISTING BANNER COMPONENT
// ────────────────────────────────────────────────────────────────

export function ListingBanner({ orgId }: { orgId: Id<"orgs"> }) {
  const readiness = useQuery(api.listing.getListingReadiness, { orgId });
  const publishOrg = useMutation(api.listing.publishOrg);
  const [isPublishing, setIsPublishing] = useState(false);

  if (readiness === undefined) return null; // Loading
  if (readiness === null) return null; // Org not found

  // If published → don't show the banner
  if (readiness.listingStatus === "published") return null;

  const isSuspended = readiness.listingStatus === "suspended";

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      await publishOrg({ orgId });
      toast.success("🎉 Your business is now live on opus.mk!");
    } catch (error: any) {
      toast.error(error.message || "Failed to publish");
    }
    setIsPublishing(false);
  };

  // ── Determine incomplete blocking items ──
  const incompleteBlocking = BLOCKING_ITEMS.filter(
    (item) => !(readiness.blocking as Record<string, boolean>)[item.key],
  );
  const completeBlocking = BLOCKING_ITEMS.filter(
    (item) => (readiness.blocking as Record<string, boolean>)[item.key],
  );

  return (
    <div
      className={cn(
        "relative w-full rounded-2xl border overflow-hidden transition-all duration-500",
        isSuspended
          ? "border-amber-500/40 bg-gradient-to-br from-amber-500/5 via-background to-amber-500/5"
          : readiness.allBlockingMet
            ? "border-emerald-500/40 bg-gradient-to-br from-emerald-500/5 via-background to-emerald-500/5"
            : "border-border/60 bg-gradient-to-br from-primary/3 via-background to-primary/3",
      )}
    >
      {/* Decorative gradient orb */}
      <div
        className={cn(
          "absolute -top-20 -right-20 w-60 h-60 rounded-full blur-3xl opacity-20 pointer-events-none",
          isSuspended
            ? "bg-amber-500"
            : readiness.allBlockingMet
              ? "bg-emerald-500"
              : "bg-primary",
        )}
      />

      <div className="relative z-10 p-7 lg:p-10">
        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex items-center justify-center w-10 h-10 rounded-xl shrink-0",
                isSuspended
                  ? "bg-amber-500/15 text-amber-500"
                  : readiness.allBlockingMet
                    ? "bg-emerald-500/15 text-emerald-500"
                    : "bg-primary/10 text-primary",
              )}
            >
              {isSuspended ? (
                <IconAlertTriangle size={20} stroke={2} />
              ) : readiness.allBlockingMet ? (
                <IconRocket size={20} stroke={2} />
              ) : (
                <IconSparkles size={20} stroke={2} />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold tracking-tight">
                {isSuspended
                  ? "Listing Suspended"
                  : readiness.allBlockingMet
                    ? "Ready to Go Live!"
                    : "Get Listed on opus.mk"}
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                {isSuspended
                  ? "Your listing was taken offline because a requirement is no longer met."
                  : readiness.allBlockingMet
                    ? "All requirements are met. Publish your business to start getting discovered."
                    : `Complete the items below to publish your business (${completeBlocking.length}/${BLOCKING_ITEMS.length} done)`}
              </p>
            </div>
          </div>

          {readiness.allBlockingMet && (
            <Button
              onClick={handlePublish}
              disabled={isPublishing}
              className="rounded-full px-6 py-5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 gap-2 transition-all hover:shadow-xl hover:shadow-emerald-500/30 shrink-0"
            >
              <IconRocket size={18} />
              {isPublishing ? "Publishing..." : "Publish to opus.mk"}
            </Button>
          )}
        </div>

        {/* ── Checklist — only shown when NOT all blocking met OR when suspended ── */}
        {(!readiness.allBlockingMet || isSuspended) && (
          <div className="space-y-5">
            {/* Blocking items */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Required
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {BLOCKING_ITEMS.map((item) => {
                  const done = (readiness.blocking as Record<string, boolean>)[
                    item.key
                  ];
                  const href =
                    item.href ||
                    (item.settingsTab
                      ? `/settings?tab=${item.settingsTab}`
                      : undefined);
                  return (
                    <a
                      key={item.key}
                      href={!done ? href : undefined}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-xl border transition-all group",
                        done
                          ? "border-emerald-500/20 bg-emerald-500/5"
                          : "border-border/60 bg-card hover:border-primary/40 hover:bg-primary/5 cursor-pointer",
                      )}
                    >
                      {done ? (
                        <IconCircleCheck
                          size={18}
                          stroke={2}
                          className="text-emerald-500 shrink-0"
                        />
                      ) : (
                        <IconCircle
                          size={18}
                          stroke={1.5}
                          className="text-muted-foreground/40 shrink-0 group-hover:text-primary/60"
                        />
                      )}
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={cn(
                            "opacity-60 shrink-0",
                            done
                              ? "text-emerald-500"
                              : "text-muted-foreground group-hover:text-primary",
                          )}
                        >
                          {item.icon}
                        </span>
                        <span
                          className={cn(
                            "text-sm font-medium truncate",
                            done
                              ? "text-emerald-700 dark:text-emerald-400"
                              : "text-foreground",
                          )}
                        >
                          {item.label}
                        </span>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>

            {/* Recommended items — collapsed briefly */}
            {!isSuspended && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Recommended ({readiness.recommendedCount}/
                  {readiness.recommendedTotal})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {RECOMMENDED_ITEMS.map((item) => {
                    const done = (
                      readiness.recommended as Record<string, boolean>
                    )[item.key];
                    const href =
                      item.href ||
                      (item.settingsTab
                        ? `/settings?tab=${item.settingsTab}`
                        : undefined);
                    return (
                      <a
                        key={item.key}
                        href={!done ? href : undefined}
                        className={cn(
                          "flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all group",
                          done
                            ? "border-emerald-500/10 bg-emerald-500/3"
                            : "border-border/40 bg-card/50 hover:border-primary/30 cursor-pointer",
                        )}
                      >
                        {done ? (
                          <IconCircleCheck
                            size={16}
                            stroke={2}
                            className="text-emerald-500/70 shrink-0"
                          />
                        ) : (
                          <IconCircle
                            size={16}
                            stroke={1.5}
                            className="text-muted-foreground/30 shrink-0"
                          />
                        )}
                        <span
                          className={cn(
                            "text-sm truncate",
                            done
                              ? "text-emerald-600/70 dark:text-emerald-400/70"
                              : "text-muted-foreground",
                          )}
                        >
                          {item.label}
                        </span>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// LISTED BADGE — small pill shown in settings header when published
// ────────────────────────────────────────────────────────────────

export function ListedBadge({ orgId }: { orgId: Id<"orgs"> }) {
  const readiness = useQuery(api.listing.getListingReadiness, { orgId });

  if (readiness === undefined || readiness === null) return null;
  if (readiness.listingStatus !== "published") return null;

  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
      <IconBadge size={14} stroke={2} />
      Listed on opus.mk
    </div>
  );
}
