import Image from "next/image";
import Link from "next/link";
import { IconStarFilled, IconSparkles } from "@tabler/icons-react";
import { getVenueLabel } from "@/lib/venue-label";

export function BusinessRow({
  org,
  distanceLabel,
  isOpenNow,
  aiMatch,
  href,
}: {
  org: any;
  distanceLabel?: string;
  isOpenNow?: boolean;
  aiMatch?: boolean;
  href: string;
}) {
  const categoryLabel = getVenueLabel(org);
  const thumbnail = org.logoUrl || org.coverImageUrl || null;

  return (
    <Link href={href} className="group block">
      <div className="flex items-center gap-4 py-4 border-b border-primary-foreground/5 transition-all duration-150 active:scale-[0.98]">
        {/* Thumbnail — only when an image is available */}
        {thumbnail && (
          <div className="w-16 h-16 rounded-xl bg-secondary shrink-0 overflow-hidden relative border border-border/50">
            <Image
              src={thumbnail}
              alt={org.name}
              fill
              className="object-cover"
              sizes="64px"
            />
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-semibold truncate group-hover:text-foreground/80 transition-colors">
              {org.name}
            </h3>
            {aiMatch && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-(--accent-soft)/10 border border-(--accent-soft)/20 text-accent-soft shrink-0">
                <IconSparkles size={10} />
                <span className="text-[10px] font-medium uppercase tracking-wider">AI Pick</span>
              </div>
            )}
          </div>

          <p className="text-sm text-muted-foreground truncate mt-0.5">
            {categoryLabel}
            {distanceLabel && (
              <span className="text-muted-foreground/50"> · {distanceLabel}</span>
            )}
          </p>

          <div className="flex items-center gap-3 mt-1.5">
            {org.averageRating > 0 && (
              <div className="flex items-center gap-1 text-xs">
                <IconStarFilled size={12} className="text-rating" aria-hidden="true" />
                <span className="font-medium text-foreground">{org.averageRating.toFixed(1)}</span>
                <span className="text-muted-foreground">({org.reviewCount})</span>
              </div>
            )}

            {isOpenNow ? (
              <div className="flex items-center gap-1 text-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-success" />
                <span className="font-medium text-success">Open</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-danger/70" />
                <span className="font-medium text-danger">Closed</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
