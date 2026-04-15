"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Logo } from "@/components/Logo";
import { HeaderAuth } from "@/components/HeaderAuth";
import { useState, useMemo, useEffect, useRef } from "react";
import { useUserLocation } from "@/hooks/use-user-location";
import { calcDistanceMeters, formatDistance } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";
import Link from "next/link";
import {
  IconSearch,
  IconMapPin,
  IconStarFilled,
  IconSparkles,
  IconScissors,
  IconFlame,
  IconLeaf,
  IconUser,
  IconHeart,
  IconEye,
  IconMassage,
  IconYoga,
  IconRun,
  IconBrush,
  IconHandSanitizer,
} from "@tabler/icons-react";

// ─── Beauty category config ──────────────────────────
type BeautyCategory =
  | "barbershop" | "hair_salon" | "nail_salon" | "spa" | "beauty_salon"
  | "lash_studio" | "brow_bar" | "tattoo_studio" | "massage_therapy"
  | "wellness_center" | "personal_trainer";

const CATEGORIES: { id: BeautyCategory; label: string; icon: React.ReactNode }[] = [
  { id: "barbershop",       label: "Barbershop",       icon: <IconScissors size={20} /> },
  { id: "hair_salon",       label: "Hair Salon",       icon: <IconBrush size={20} /> },
  { id: "nail_salon",       label: "Nail Salon",       icon: <IconHandSanitizer size={20} /> },
  { id: "spa",              label: "Spa",              icon: <IconLeaf size={20} /> },
  { id: "beauty_salon",     label: "Beauty Salon",     icon: <IconHeart size={20} /> },
  { id: "lash_studio",      label: "Lash Studio",      icon: <IconEye size={20} /> },
  { id: "brow_bar",         label: "Brow Bar",         icon: <IconUser size={20} /> },
  { id: "tattoo_studio",    label: "Tattoo Studio",    icon: <IconFlame size={20} /> },
  { id: "massage_therapy",  label: "Massage Therapy",  icon: <IconMassage size={20} /> },
  { id: "wellness_center",  label: "Wellness Center",  icon: <IconYoga size={20} /> },
  { id: "personal_trainer", label: "Personal Trainer", icon: <IconRun size={20} /> },
];

export default function DiscoverPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<BeautyCategory | undefined>();
  const { coords } = useUserLocation();
  const [gridVisible, setGridVisible] = useState(true);
  const prevCoordsRef = useRef<typeof coords>(null);

  const listings = useQuery(api.public.listPublished, {
    industry: "beauty_wellness",
    beautyCategory: selectedCategory,
  });

  const searchResults = useQuery(
    api.public.searchPublished,
    searchQuery.length >= 2 ? { query: searchQuery } : "skip"
  );

  useEffect(() => {
    if (coords && !prevCoordsRef.current) {
      setGridVisible(false);
      const t = setTimeout(() => setGridVisible(true), 180);
      prevCoordsRef.current = coords;
      return () => clearTimeout(t);
    }
    prevCoordsRef.current = coords;
  }, [coords]);

  const rawItems = searchQuery.length >= 2 ? searchResults : listings?.items;

  const displayItems = useMemo(() => {
    if (!rawItems || !coords) return rawItems;
    return [...rawItems].sort((a, b) => {
      const da = a.coordinates
        ? calcDistanceMeters(coords.lat, coords.lng, a.coordinates.lat, a.coordinates.lng)
        : Infinity;
      const db = b.coordinates
        ? calcDistanceMeters(coords.lat, coords.lng, b.coordinates.lat, b.coordinates.lng)
        : Infinity;
      return da - db;
    });
  }, [rawItems, coords]);
  const isLoading = displayItems === undefined;

  const activeCategory = CATEGORIES.find((c) => c.id === selectedCategory);

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Logo className="text-xl" />
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <IconMapPin size={14} aria-hidden="true" />
              <span>Skopje</span>
            </div>
            <HeaderAuth />
          </div>
        </div>
      </header>

      {/* ── Hero search ── */}
      <div className="max-w-6xl mx-auto px-4 pt-8 pb-3">
        <div className="relative">
          <IconSearch
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50"
            aria-hidden="true"
          />
          <label htmlFor="discover-search" className="sr-only">
            Search salons, barbers, spas
          </label>
          <Input
            id="discover-search"
            placeholder="Search salons, barbers, spas…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoComplete="off"
            className="pl-10 h-12 rounded-2xl bg-card border-border/60 text-base placeholder:text-muted-foreground/40"
          />
        </div>
      </div>

      {/* ── Category row: carousel on mobile, pill strip on desktop ── */}
      {!searchQuery && (
        <div className="max-w-6xl mx-auto px-4 pb-5">
          {/* Mobile: horizontal scroll */}
          <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none md:hidden" role="group" aria-label="Filter by category">
            <button
              onClick={() => setSelectedCategory(undefined)}
              aria-pressed={!selectedCategory}
              className={`flex-none flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium border transition-[border-color,background-color,color] duration-150 whitespace-nowrap ${
                !selectedCategory
                  ? "bg-foreground text-background border-foreground"
                  : "bg-card border-border/50 text-muted-foreground hover:border-border"
              }`}
            >
              All
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() =>
                  setSelectedCategory(selectedCategory === cat.id ? undefined : cat.id)
                }
                aria-pressed={selectedCategory === cat.id}
                className={`flex-none flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium border transition-[border-color,background-color,color] duration-150 whitespace-nowrap ${
                  selectedCategory === cat.id
                    ? "bg-foreground text-background border-foreground"
                    : "bg-card border-border/50 text-muted-foreground hover:border-border"
                }`}
              >
                {cat.icon}
                {cat.label}
              </button>
            ))}
          </div>

          {/* Desktop: flex-wrap text pill strip — no icon tiles */}
          <div className="hidden md:flex flex-wrap gap-2" role="group" aria-label="Filter by category">
            <button
              onClick={() => setSelectedCategory(undefined)}
              aria-pressed={!selectedCategory}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium border transition-[border-color,background-color,color] duration-150 ${
                !selectedCategory
                  ? "bg-foreground text-background border-foreground"
                  : "bg-card border-border/50 text-muted-foreground hover:border-border"
              }`}
            >
              <span aria-hidden="true" className="text-xs">✦</span>
              All
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() =>
                  setSelectedCategory(selectedCategory === cat.id ? undefined : cat.id)
                }
                aria-pressed={selectedCategory === cat.id}
                className={`px-3.5 py-2 rounded-full text-sm font-medium border transition-[border-color,background-color,color] duration-150 ${
                  selectedCategory === cat.id
                    ? "bg-foreground text-background border-foreground"
                    : "bg-card border-border/50 text-muted-foreground hover:border-border"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Section heading ── */}
      <main className="max-w-6xl mx-auto px-4 pt-2 pb-12">
        {!searchQuery && (
          <h2 className="text-lg font-semibold mb-6">
            {activeCategory ? activeCategory.label : "All Beauty & Wellness"}
          </h2>
        )}

        {isLoading ? (
          /* Loading skeletons — list on mobile, grid on desktop */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        ) : displayItems && displayItems.length > 0 ? (
          /* Results — list on mobile, grid on desktop */
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 transition-opacity duration-150"
            style={{ opacity: gridVisible ? 1 : 0 }}
          >
            {displayItems.map((org) => (
              <Link key={org._id} href={`/${org.slug}`} className="group block">
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border/40 transition-[border-color,box-shadow,transform] duration-150 hover:border-border hover:shadow-sm active:scale-[0.98] h-full">
                  {/* Logo */}
                  <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center shrink-0 overflow-hidden relative">
                    {org.logoUrl ? (
                      <Image
                        src={org.logoUrl}
                        alt={org.name}
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    ) : (
                      <span className="text-lg font-semibold text-muted-foreground">
                        {org.name.charAt(0)}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold truncate">{org.name}</h3>
                      {("isFeatured" in org) && (org as { isFeatured?: boolean }).isFeatured && (
                        <IconSparkles size={14} className="text-rating shrink-0" />
                      )}
                    </div>
                    {org.tagline && (
                      <p className="text-sm text-muted-foreground truncate mt-0.5">
                        {org.tagline}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5">
                      {org.averageRating > 0 && (
                        <div className="flex items-center gap-1 text-xs">
                          <IconStarFilled size={12} className="text-rating" aria-hidden="true" />
                          <span className="font-medium">{org.averageRating.toFixed(1)}</span>
                          <span className="text-muted-foreground">({org.reviewCount})</span>
                        </div>
                      )}
                      {org.city && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <IconMapPin size={12} aria-hidden="true" />
                          <span>{org.city}</span>
                        </div>
                      )}
                      {coords && org.coordinates && (
                        <div className="text-xs text-muted-foreground">
                          {formatDistance(
                            calcDistanceMeters(
                              coords.lat,
                              coords.lng,
                              org.coordinates.lat,
                              org.coordinates.lng,
                            ),
                          )}{" "}
                          away
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="text-muted-foreground/30 group-hover:text-muted-foreground transition-colors shrink-0">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path
                        d="M7.5 5L12.5 10L7.5 15"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
              <IconSearch size={24} className="text-muted-foreground/40" />
            </div>
            <p className="text-muted-foreground font-medium">No businesses found</p>
            <p className="text-sm text-muted-foreground/60 mt-1">
              {searchQuery
                ? "Try a different search term"
                : selectedCategory
                ? "No listings in this category yet"
                : "Check back later"}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
