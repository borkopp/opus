import Image from "next/image";
import Link from "next/link";
import { IconMapPin, IconStarFilled, IconSparkles } from "@tabler/icons-react";
import { CATEGORIES } from "@/lib/beauty-categories";

export function BusinessGridCard({ 
  org, 
  distanceLabel, 
  isOpenNow, 
  href 
}: { 
  org: any; 
  distanceLabel?: string; 
  isOpenNow?: boolean; 
  href: string;
}) {
  const categoryLabel = CATEGORIES.find(c => c.id === org.beautyCategory)?.label || org.beautyCategory || "Beauty";

  return (
    <Link href={href} className="group block h-full">
      <div className="flex flex-col transition-all duration-150 active:scale-[0.98] h-full overflow-hidden">
        {/* Cover Image */}
        <div className="w-full aspect-[3/2] relative bg-secondary rounded-2xl border border-white/5 overflow-hidden">
          {org.coverImageUrl ? (
            <Image
              src={org.coverImageUrl}
              alt={org.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
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

          {/* Badges Overlay */}
          <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
            {isOpenNow ? (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
                <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                <span className="text-[10px] font-medium text-white tracking-wide uppercase">Open</span>
              </div>
            ) : <div />}
            
            {org.averageRating > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
                <IconStarFilled size={10} className="text-rating" />
                <span className="text-[11px] font-medium text-white">{org.averageRating.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Info Content */}
        <div className="p-4 flex flex-col flex-grow">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-semibold truncate group-hover:text-foreground/80 transition-colors">{org.name}</h3>
            {org.isFeatured && (
              <IconSparkles size={14} className="text-rating shrink-0" />
            )}
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground truncate mb-2">
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
          
          <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground pt-2">
             <div className="flex items-center gap-3">
                {org.reviewCount > 0 && (
                  <span className="text-muted-foreground">({org.reviewCount} reviews)</span>
                )}
             </div>
             {org.priceRange && (
               <div className="font-medium shrink-0 ml-2 text-foreground/80">
                 {org.priceRange === "budget" ? "€" : org.priceRange === "mid" ? "€€" : "€€€"}
               </div>
             )}
          </div>
        </div>
      </div>
    </Link>
  );
}
