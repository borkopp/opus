import Image from "next/image";
import Link from "next/link";
import { IconStarFilled, IconSparkles } from "@tabler/icons-react";
import { getVenueLabel } from "@/lib/venue-label";

function OpenBadge({ isOpen }: { isOpen: boolean }) {
  if (isOpen) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-success/20 backdrop-blur-md border border-success/30">
        <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
        <span className="text-[10px] font-semibold text-background tracking-wide uppercase">Open</span>
      </div>
    );
  }
  return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-danger/20 backdrop-blur-md border border-background/15">
      <div className="w-1.5 h-1.5 rounded-full bg-danger/80" />
      <span className="text-[10px] font-semibold text-background/80 tracking-wide uppercase">Closed</span>
    </div>
  );
}

export function BusinessGridCard({
  org,
  distanceLabel,
  isOpenNow,
  href,
}: {
  org: any;
  distanceLabel?: string;
  isOpenNow?: boolean;
  href: string;
}) {
  const categoryLabel = getVenueLabel(org);
  const hasImage = !!org.coverImageUrl;

  return (
    <Link href={href} className="group block h-full">
      <div className="relative aspect-3/2 rounded-2xl overflow-hidden transition-transform duration-150 active:scale-[0.98]">
        {/* Background */}
        {hasImage ? (
          <Image
            src={org.coverImageUrl}
            alt={org.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
          />
        ) : org.logoUrl ? (
          <>
            <div className="absolute inset-0 bg-linear-to-br from-secondary/80 to-secondary" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-card overflow-hidden relative shadow-sm">
                <Image src={org.logoUrl} alt={org.name} fill className="object-cover" sizes="64px" />
              </div>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 bg-linear-to-br from-secondary/80 to-secondary" />
        )}

        {/* Gradient overlay — bottom fade for text legibility */}
        <div className="absolute inset-0 bg-linear-to-t from-ink-surface/80 via-ink-surface/20 to-transparent" />

        {/* Top badges */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
          <OpenBadge isOpen={!!isOpenNow} />
          <div className="flex items-center gap-1.5">
            {org.isFeatured && (
              <div className="p-1.5 rounded-full bg-ink-surface/40 backdrop-blur-md border border-primary-foreground/10">
                <IconSparkles size={12} className="text-rating" />
              </div>
            )}
            {org.averageRating > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-ink-surface/40 backdrop-blur-md border border-primary-foreground/10">
                <IconStarFilled size={10} className="text-rating" />
                <span className="text-[11px] font-semibold text-primary-foreground">{org.averageRating.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-[15px] font-bold text-primary-foreground leading-tight truncate">{org.name}</h3>
              <p className="text-[12px] text-primary-foreground/60 mt-0.5 truncate">{categoryLabel}</p>
            </div>
            <div className="flex flex-col items-end gap-0.5 shrink-0">
              {distanceLabel && (
                <span className="text-[11px] text-primary-foreground/50">{distanceLabel}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
