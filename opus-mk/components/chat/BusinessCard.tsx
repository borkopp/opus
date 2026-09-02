"use client";

import Image from "next/image";
import Link from "next/link";
import {
  IconStarFilled,
  IconMapPin,
  IconClock,
  IconArrowRight,
} from "@tabler/icons-react";

export type Recommendation = {
  orgId: string;
  slug: string;
  name?: string;
  reason?: string;
  availabilityHint?: string;
  availableSlot?: string;
  coverImageUrl?: string;
  logoUrl?: string;
  averageRating?: number;
  reviewCount?: number;
  city?: string;
  neighborhood?: string;
  services?: Array<{ name: string; price: string }>;
  distanceM?: number;
  isOpenNow?: boolean;
  closesAt?: string | null;
  opensAt?: string | null;
  bookingUrl?: string;
  tags?: string[];
};

function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)}m`;
  return `${(m / 1000).toFixed(1)}km`;
}

export function BusinessCard({ rec }: { rec: Recommendation }) {
  const displayName = rec.name ?? rec.slug;
  const locationLabel =
    [rec.neighborhood, rec.city].filter(Boolean).join(", ") ||
    rec.city ||
    "Skopje";
  const targetUrl = rec.bookingUrl || `/${rec.slug}`;

  return (
    <div className="group rounded-2xl bg-card border border-border/50 hover:border-primary/50 transition-all duration-200 shadow-sm hover:shadow-lg overflow-hidden">
      <div className="p-3.5 sm:p-4 flex flex-col gap-3">
        {/* Top row: Image + Info */}
        <div className="flex gap-3.5 items-start">
          {/* Cover Thumbnail */}
          <div className="relative w-20 h-20 sm:w-22 sm:h-22 rounded-xl overflow-hidden bg-secondary shrink-0 border border-border/40">
            {rec.coverImageUrl ? (
              <Image
                src={rec.coverImageUrl}
                alt={displayName}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 640px) 80px, 96px"
              />
            ) : rec.logoUrl ? (
              <Image
                src={rec.logoUrl}
                alt={displayName}
                fill
                className="object-cover"
                sizes="80px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-bold text-lg text-primary bg-primary/10">
                {displayName.charAt(0)}
              </div>
            )}
          </div>

          {/* Core Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <Link href={targetUrl} className="block min-w-0">
                <h3 className="font-bold text-[15px] sm:text-[16px] text-foreground hover:text-primary transition-colors truncate">
                  {displayName}
                </h3>
              </Link>

              {rec.averageRating != null && rec.averageRating > 0 && (
                <div className="flex items-center gap-1 shrink-0 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                  <IconStarFilled size={11} className="text-[#f2b08c]" />
                  <span className="text-xs font-bold text-foreground">
                    {rec.averageRating.toFixed(1)}
                  </span>
                  {rec.reviewCount != null && (
                    <span className="text-[10px] text-muted-foreground">
                      ({rec.reviewCount})
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Location & Distance */}
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground truncate">
              <div className="flex items-center gap-1 truncate">
                <IconMapPin size={13} className="shrink-0 text-muted-foreground/70" />
                <span className="truncate">{locationLabel}</span>
              </div>
              {rec.distanceM != null && (
                <span className="shrink-0">• {formatDistance(rec.distanceM)}</span>
              )}
            </div>

            {/* Availability / Slot Pill */}
            {(rec.availableSlot || rec.availabilityHint) && (
              <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                <IconClock size={13} className="shrink-0 animate-pulse" />
                <span>{rec.availableSlot || rec.availabilityHint}</span>
              </div>
            )}
          </div>
        </div>

        {/* Reason / Context */}
        {rec.reason && (
          <p className="text-xs text-foreground/85 leading-relaxed bg-secondary/60 rounded-xl p-2.5 border border-border/30">
            {rec.reason}
          </p>
        )}

        {/* Popular Services Chips */}
        {rec.services && rec.services.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {rec.services.map((svc, idx) => (
              <span
                key={idx}
                className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-secondary text-foreground/85 border border-border/40"
              >
                {svc.name} · <strong className="text-primary">{svc.price}</strong>
              </span>
            ))}
          </div>
        )}

        {/* Action Footer */}
        <div className="pt-2 border-t border-border/30 flex items-center justify-between gap-3">
          <div className="text-[11px] text-muted-foreground">
            {rec.isOpenNow ? (
              <span className="text-emerald-500 font-medium">● Open now</span>
            ) : rec.closesAt ? (
              <span>Closes {rec.closesAt}</span>
            ) : (
              <span>Instant Confirmation</span>
            )}
          </div>

          <Link
            href={targetUrl}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 active:scale-95 transition-all shadow-sm"
          >
            <span>Book Appointment</span>
            <IconArrowRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  );
}

