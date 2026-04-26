import Image from "next/image";
import Link from "next/link";
import { IconMapPin, IconStarFilled, IconSparkles } from "@tabler/icons-react";
import { CATEGORIES } from "@/lib/beauty-categories";

export function BusinessRow({ 
  org, 
  distanceLabel, 
  isOpenNow, 
  aiMatch, 
  href 
}: { 
  org: any; 
  distanceLabel?: string; 
  isOpenNow?: boolean; 
  aiMatch?: boolean; 
  href: string;
}) {
  const categoryLabel = CATEGORIES.find(c => c.id === org.beautyCategory)?.label || org.beautyCategory || "Beauty";

  return (
    <Link href={href} className="group block">
      <div className="flex items-center gap-4 py-4 border-b border-white/5 transition-all duration-150 active:scale-[0.98] h-full">
        {/* Logo or Cover fallback */}
        <div className="w-16 h-16 rounded-xl bg-secondary flex items-center justify-center shrink-0 overflow-hidden relative border border-border/50">
          {org.logoUrl ? (
            <Image
              src={org.logoUrl}
              alt={org.name}
              fill
              className="object-cover"
              sizes="64px"
            />
          ) : (
            <span className="text-xl font-bold text-muted-foreground">
              {org.name.charAt(0)}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-semibold truncate group-hover:text-foreground/80 transition-colors">{org.name}</h3>
            {aiMatch && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[var(--accent-soft)]/10 border border-[var(--accent-soft)]/20 text-[var(--accent-soft)] shrink-0">
                <IconSparkles size={10} />
                <span className="text-[10px] font-medium uppercase tracking-wider">AI Pick</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground truncate mt-0.5">
            <span className="truncate">{categoryLabel}</span>
            <span className="text-muted-foreground/30">•</span>
            <div className="flex items-center gap-1 truncate">
              {org.city && <span className="truncate">{org.city}</span>}
              {distanceLabel && (
                <span className="text-muted-foreground/50 shrink-0">
                  • {distanceLabel}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3 mt-1.5">
            {org.averageRating > 0 && (
              <div className="flex items-center gap-1 text-xs">
                <IconStarFilled size={12} className="text-rating" aria-hidden="true" />
                <span className="font-medium text-foreground">{org.averageRating.toFixed(1)}</span>
                <span className="text-muted-foreground">({org.reviewCount})</span>
              </div>
            )}
            
            {isOpenNow && (
              <div className="flex items-center gap-1 text-success text-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-success" />
                <span className="font-medium">Open</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
