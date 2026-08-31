import Image from "next/image";
import Link from "next/link";
import { IconMapPin, IconStarFilled, IconSparkles } from "@tabler/icons-react";
import { formatPrice, formatDistance } from "@/lib/format";
import { isOpenNow } from "@/lib/opening-hours";
import { CATEGORIES } from "@/lib/beauty-categories";

export function BusinessCoverCard({ org, onClick }: { org: any; onClick?: () => void }) {
  const { isOpen } = isOpenNow(org.openingHours);

  const categoryLabel = CATEGORIES.find(c => c.id === org.beautyCategory)?.label || org.beautyCategory || "Beauty";

  return (
    <Link href={`/${org.slug}`} onClick={onClick} className="block flex-none group w-[220px] aspect-[4/5] relative rounded-2xl overflow-hidden cursor-pointer shadow-sm">
      {/* Background Image or Gradient Fallback */}
      {org.coverImageUrl ? (
        <Image
          src={org.coverImageUrl}
          alt={org.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="220px"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-secondary/80 to-secondary flex items-center justify-center p-8 transition-transform duration-500 group-hover:scale-105">
          {org.logoUrl ? (
            <div className="w-16 h-16 rounded-2xl bg-card overflow-hidden relative shadow-sm">
              <Image src={org.logoUrl} alt={org.name} fill className="object-cover" sizes="64px" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-card flex items-center justify-center text-xl font-bold text-muted-foreground shadow-sm">
              {org.name.charAt(0)}
            </div>
          )}
        </div>
      )}

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-ink-surface/80 via-ink-surface/20 to-ink-surface/10" />

      {/* Top Elements: Open Dot (left) and Rating (right) */}
      <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
        {isOpen ? (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-ink-surface/40 backdrop-blur-md border border-primary-foreground/10">
            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            <span className="text-[10px] font-medium text-primary-foreground tracking-wide uppercase">Open</span>
          </div>
        ) : <div />}

        {org.averageRating > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-ink-surface/40 backdrop-blur-md border border-primary-foreground/10">
            <IconStarFilled size={10} className="text-rating" />
            <span className="text-[11px] font-medium text-primary-foreground">{org.averageRating.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* Bottom Content */}
      <div className="absolute bottom-0 left-0 right-0 p-4 text-primary-foreground">
        {/* <div className="flex items-center gap-1.5 mb-1 text-rating">
          <IconSparkles size={12} />
          <span className="text-[10px] font-medium tracking-wide uppercase uppercase">Featured</span>
        </div> */}
        <h3 className="font-semibold text-lg leading-tight mb-1 truncate">{org.name}</h3>
        <p className="text-xs text-primary-foreground/80 line-clamp-1 mb-2">{categoryLabel}</p>

        <div className="flex items-center justify-between text-xs text-primary-foreground/70">
          {org.city && (
            <div className="flex items-center gap-1 truncate">
              <IconMapPin size={12} className="shrink-0" />
              <span className="truncate">{org.city}</span>
              {org._distanceMeters !== undefined && org._distanceMeters !== Infinity && (
                <span className="text-primary-foreground/40 shrink-0 ml-1">
                  • {formatDistance(org._distanceMeters)}
                </span>
              )}
            </div>
          )}
          {org.priceRange && (
            <div className="font-medium shrink-0 ml-2">
              {org.priceRange === "budget" ? "€" : org.priceRange === "mid" ? "€€" : "€€€"}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
