"use client";

import Link from "next/link";
import { IconStarFilled, IconChevronRight } from "@tabler/icons-react";

export type Recommendation = {
  orgId: string;
  slug: string;
  reason: string;
  venueType?: string;
  cuisine?: string[];
  availabilityHint?: string;
  name?: string;
  logoUrl?: string;
  averageRating?: number;
  reviewCount?: number;
  city?: string;
  distanceM?: number;
  isOpenNow?: boolean;
  closesAt?: string | null;
  opensAt?: string | null;
  bookingUrl?: string;
};

function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)}m`;
  return `${(m / 1000).toFixed(1)}km`;
}

// Returns minutes remaining until closesAt (HH:MM), accounting for overnight spans.
function minutesUntilClose(closesAt: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Belgrade",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date());
  const h = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  const m = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
  const nowMins = h * 60 + m;

  const [ch, cm] = closesAt.split(":").map(Number);
  const closeMins = ch * 60 + cm;

  const diff = closeMins > nowMins ? closeMins - nowMins : closeMins + 1440 - nowMins;
  return diff;
}

function formatCloseTime(closesAt: string): string {
  const [h, m] = closesAt.split(":").map(Number);
  const period = h >= 12 ? "pm" : "am";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${h12}${period}` : `${h12}:${m.toString().padStart(2, "0")}${period}`;
}

export function BusinessCard({ rec }: { rec: Recommendation }) {
  const displayName = rec.name ?? rec.slug;

  const minsLeft = rec.isOpenNow && rec.closesAt ? minutesUntilClose(rec.closesAt) : null;
  const closingSoon = minsLeft !== null && minsLeft <= 60;

  return (
    <Link
      href={`/${rec.slug}`}
      className="group flex gap-0 rounded-2xl overflow-hidden border border-border/40 hover:border-border hover:shadow-sm transition-[border-color,box-shadow] duration-150 active:scale-[0.98] bg-card"
    >
      {/* Open/closed accent bar */}
      <div
        className={`w-1 shrink-0 ${
          closingSoon
            ? "bg-amber-500/70"
            : rec.isOpenNow
            ? "bg-emerald-500/60"
            : "bg-red-500/30"
        }`}
      />

      {/* Body */}
      <div className="flex-1 min-w-0 px-3.5 py-3">
        {/* Name + status row */}
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-[14px] truncate">{displayName}</span>
          <div className="flex items-center gap-2 shrink-0">
            {rec.isOpenNow !== undefined && (
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  closingSoon
                    ? "bg-amber-500/15 text-amber-400"
                    : rec.isOpenNow
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "bg-red-500/10 text-red-400/80"
                }`}
              >
                {rec.isOpenNow ? "Open" : "Closed"}
              </span>
            )}
            <IconChevronRight
              size={14}
              className="text-muted-foreground/30 group-hover:text-muted-foreground transition-colors"
            />
          </div>
        </div>

        {/* Venue type + cuisine chips */}
        {(rec.venueType || rec.cuisine?.length) && (
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {rec.venueType && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-secondary text-muted-foreground capitalize">
                {rec.venueType}
              </span>
            )}
            {rec.cuisine?.slice(0, 3).map((c) => (
              <span key={c} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-secondary text-muted-foreground capitalize">
                {c}
              </span>
            ))}
          </div>
        )}

        {/* Reason — only when there's actual descriptive text */}
        {rec.reason && (
          <p className="text-[12px] text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
            {rec.reason}
          </p>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          {rec.averageRating != null && rec.averageRating > 0 && (
            <div className="flex items-center gap-1 text-[11px]">
              <IconStarFilled size={10} className="text-yellow-500" />
              <span className="font-semibold">{rec.averageRating.toFixed(1)}</span>
              {rec.reviewCount != null && (
                <span className="text-muted-foreground">({rec.reviewCount})</span>
              )}
            </div>
          )}

          {rec.distanceM != null && (
            <span className="text-[11px] text-muted-foreground">
              {formatDistance(rec.distanceM)} away
            </span>
          )}

          {rec.isOpenNow && rec.closesAt && (
            <span
              className={`text-[11px] font-medium ${
                closingSoon ? "text-amber-400" : "text-muted-foreground"
              }`}
            >
              Closes {formatCloseTime(rec.closesAt)}
              {closingSoon && minsLeft != null && ` · ${minsLeft}m`}
            </span>
          )}

          {!rec.isOpenNow && rec.opensAt && (
            <span className="text-[11px] text-muted-foreground">
              Opens {rec.opensAt}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
