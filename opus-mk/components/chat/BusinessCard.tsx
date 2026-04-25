"use client";

import Link from "next/link";
import {
  IconStarFilled,
  IconMapPin,
  IconClock,
  IconChevronRight,
} from "@tabler/icons-react";

export type Recommendation = {
  orgId: string;
  slug: string;
  reason: string;
  availabilityHint?: string;
  name?: string;
  logoUrl?: string;
  averageRating?: number;
  reviewCount?: number;
  city?: string;
  distanceM?: number;
  isOpenNow?: boolean;
};

function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)}m`;
  return `${(m / 1000).toFixed(1)}km`;
}

export function BusinessCard({ rec }: { rec: Recommendation }) {
  const displayName = rec.name ?? rec.slug;
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <Link
      href={`/${rec.slug}`}
      className="group flex items-start gap-3 p-3.5 rounded-2xl bg-card border border-border/40 hover:border-border hover:shadow-sm transition-[border-color,box-shadow] duration-150 active:scale-[0.98]"
    >
      {/* Avatar */}
      <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center shrink-0 overflow-hidden text-sm font-semibold text-muted-foreground">
        {rec.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={rec.logoUrl} alt={displayName} className="w-full h-full object-cover" />
        ) : (
          initial
        )}
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-sm truncate">{displayName}</span>
          {rec.isOpenNow !== undefined && (
            <span
              className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${
                rec.isOpenNow
                  ? "bg-green-500/10 text-green-600 dark:text-green-400"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {rec.isOpenNow ? "Open" : "Closed"}
            </span>
          )}
        </div>

        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{rec.reason}</p>

        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          {rec.averageRating != null && rec.averageRating > 0 && (
            <div className="flex items-center gap-1 text-xs">
              <IconStarFilled size={11} className="text-yellow-500" />
              <span className="font-medium">{rec.averageRating.toFixed(1)}</span>
              {rec.reviewCount != null && (
                <span className="text-muted-foreground">({rec.reviewCount})</span>
              )}
            </div>
          )}
          {rec.city && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <IconMapPin size={11} />
              <span>{rec.city}</span>
            </div>
          )}
          {rec.distanceM != null && (
            <span className="text-xs text-muted-foreground">
              {formatDistance(rec.distanceM)} away
            </span>
          )}
        </div>

        {rec.availabilityHint && (
          <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
            <IconClock size={11} />
            <span>{rec.availabilityHint}</span>
          </div>
        )}
      </div>

      <IconChevronRight
        size={16}
        className="text-muted-foreground/30 group-hover:text-muted-foreground transition-colors shrink-0 mt-0.5"
      />
    </Link>
  );
}
