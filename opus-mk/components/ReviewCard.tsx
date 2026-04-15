"use client";

import { IconStarFilled } from "@tabler/icons-react";
import Image from "next/image";

// ─────────────────────────────────────────────────────
// ReviewCard
// Reusable display card for published reviews.
// Used on the business profile page reviews section.
// ─────────────────────────────────────────────────────

interface ReviewCardProps {
  reviewerName: string;
  reviewerAvatarUrl?: string;
  rating: number;
  body?: string;
  createdAt: number;
  reply?: string;
  repliedAt?: number;
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

export function ReviewCard({
  reviewerName,
  reviewerAvatarUrl,
  rating,
  body,
  createdAt,
  reply,
  repliedAt,
}: ReviewCardProps) {
  return (
    <div className="p-4 rounded-2xl bg-card border border-border/40 transition-all duration-200 hover:border-border/60">
      {/* Reviewer header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center shrink-0 overflow-hidden relative">
          {reviewerAvatarUrl ? (
            <Image
              src={reviewerAvatarUrl}
              alt={reviewerName}
              fill
              className="object-cover"
              sizes="36px"
            />
          ) : (
            <span className="text-sm font-semibold text-muted-foreground">
              {reviewerName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{reviewerName}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <IconStarFilled
                  key={star}
                  size={12}
                  className={
                    star <= rating
                      ? "text-rating"
                      : "text-border/60"
                  }
                  aria-hidden="true"
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground/70">
              {timeAgo(createdAt)}
            </span>
          </div>
        </div>
      </div>

      {/* Review body */}
      {body && (
        <p className="text-sm text-foreground/85 leading-relaxed">{body}</p>
      )}

      {/* Owner reply */}
      {reply && (
        <div className="mt-3 pl-4 border-l-2 border-primary/20">
          <p className="text-xs font-semibold text-muted-foreground mb-1">
            Owner response
            {repliedAt && (
              <span className="font-normal text-muted-foreground/60">
                {" "}
                · {timeAgo(repliedAt)}
              </span>
            )}
          </p>
          <p className="text-sm text-foreground/80 leading-relaxed">{reply}</p>
        </div>
      )}
    </div>
  );
}
