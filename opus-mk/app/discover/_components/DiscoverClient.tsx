"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useMemo, useEffect, useRef } from "react";
import { useUserLocation } from "@/hooks/use-user-location";
import { useResolveCity } from "@/hooks/use-resolve-city";
import { calcDistanceMeters } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";

import { DiscoverHeader } from "./DiscoverHeader";
import { AiSearchBar } from "./AiSearchBar";
import { SuggestionChips } from "./SuggestionChips";
import { CategoryRail } from "./CategoryRail";
import { FeaturedCarousel } from "./FeaturedCarousel";
import { NearYouList } from "./NearYouList";
import { EmptyState } from "./EmptyState";
import { rankOrgs } from "@/lib/rank";
import { isOpenNow } from "@/lib/opening-hours";
import { BeautyCategory } from "@/lib/beauty-categories";

function getDayPeriod(): string {
  const now = new Date();
  const h = now.getHours();
  const day = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][
    now.getDay()
  ];
  if (h < 12) return `${day} morning`;
  if (h < 17) return `${day} afternoon`;
  return `${day} evening`;
}

export function DiscoverClient() {
  const { label: dayLabel } = { label: getDayPeriod() };
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<BeautyCategory | undefined>();
  const { coords } = useUserLocation();
  const { city, displayCity } = useResolveCity();
  const resolvedCity = displayCity || city || undefined;
  const [gridVisible, setGridVisible] = useState(true);
  const prevCoordsRef = useRef<typeof coords>(null);

  const listings = useQuery(
    api.public.listPublished,
    resolvedCity ? { industry: "beauty_wellness", city: resolvedCity } : "skip"
  );

  const searchResults = useQuery(
    api.public.searchPublished,
    searchQuery.length >= 2 && resolvedCity ? { query: searchQuery, city: resolvedCity } : "skip"
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

  const isSearchActive = searchQuery.length >= 2;
  const rawItems = isSearchActive ? searchResults : listings?.items;
  const isLoading = rawItems === undefined;

  // Derive available categories from ALL listings (even if a category is selected, we want to know what else exists)
  const availableCategoryIds = useMemo(() => {
    if (!listings?.items) return new Set<string>();
    return new Set(listings.items.map((item: any) => item.beautyCategory).filter(Boolean));
  }, [listings?.items]);

  // Compute ranking and separation of featured vs feed
  const { featuredOrgs, feedOrgs } = useMemo(() => {
    if (!rawItems) return { featuredOrgs: [], feedOrgs: [] };

    // Annotate items with distance if we have coords
    const annotatedOrgs = rawItems
      .filter((org: any) => {
        if (selectedCategory && org.beautyCategory !== selectedCategory) return false;
        return true;
      })
      .map((org: any) => {
      const distanceMeters = coords && org.coordinates
        ? calcDistanceMeters(coords.lat, coords.lng, org.coordinates.lat, org.coordinates.lng)
        : Infinity;
      return { ...org, _distanceMeters: distanceMeters };
    });

    // Rank all items
    const rankedOrgs = rankOrgs(
      annotatedOrgs,
      {
        coords,
        query: isSearchActive ? searchQuery : undefined,
        selectedCategory,
        industry: "beauty_wellness",
      },
      (org) => isOpenNow(org.openingHours).isOpen
    );

    if (isSearchActive) {
      // In search mode, no featured carousel, just return ranked results
      return { featuredOrgs: [], feedOrgs: rankedOrgs };
    }

    // Default mode: pull out featured/open-now
    const featuredCandidates = rankedOrgs.filter(org => org.isFeatured);

    // Top up with open-now if we have < 3 featured
    const topUpCandidates = rankedOrgs.filter(org =>
      !org.isFeatured && isOpenNow(org.openingHours).isOpen && !featuredCandidates.find(f => f._id === org._id)
    );

    let finalFeatured = [...featuredCandidates];
    if (finalFeatured.length < 3) {
      finalFeatured = [...finalFeatured, ...topUpCandidates].slice(0, 5);
    } else {
      finalFeatured = finalFeatured.slice(0, 5);
    }

    const featuredIds = new Set(finalFeatured.map(o => o._id));
    const mainFeed = rankedOrgs.filter(org => !featuredIds.has(org._id));

    return {
      featuredOrgs: finalFeatured,
      feedOrgs: mainFeed
    };
  }, [rawItems, coords, isSearchActive, searchQuery, selectedCategory]);

  return (
    <div className="dark min-h-screen bg-black flex flex-col">
      <DiscoverHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto px-0 md:px-8 pt-6 pb-28 md:pb-32">
        {/* Search Header Area */}
        <div className="px-4 md:px-0 mb-10">
          <p
            className="text-[11px] font-bold font-sans tracking-[0.18em] uppercase mb-3"
            style={{ color: "rgba(225,125,97,0.9)" }}
          >
            {dayLabel}
          </p>
          <h1 className="text-3xl md:text-4xl font-display font-semibold tracking-tight text-white mb-8">
            Where to{" "}
            <span
              style={{
                fontFamily: "var(--font-instrument-serif)",
                fontStyle: "italic",
                fontWeight: 400,
                color: "var(--accent)",
              }}
            >
              tonight?
            </span>
          </h1>
          <div className="space-y-4">
            <AiSearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
            
            {!isSearchActive && (
              <CategoryRail 
                selectedCategory={selectedCategory} 
                onSelect={setSelectedCategory}
                availableCategoryIds={availableCategoryIds}
              />
            )}
          </div>
        </div>

        {/* Content Area */}
        <div
          className="transition-opacity duration-150"
          style={{ opacity: gridVisible ? 1 : 0 }}
        >
          {isLoading ? (
            <div className="space-y-8 px-4 md:px-0">
              {/* Featured Skeleton */}
              {!isSearchActive && (
                <div className="flex gap-4 overflow-hidden">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="w-[220px] h-[275px] rounded-2xl flex-none bg-white/5" />
                  ))}
                </div>
              )}
              {/* List Skeleton */}
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-[98px] rounded-2xl w-full bg-white/5" />
                ))}
              </div>
            </div>
          ) : feedOrgs.length > 0 || featuredOrgs.length > 0 ? (
            <div className="space-y-12">
              {!isSearchActive && <FeaturedCarousel orgs={featuredOrgs} />}

              <div className="px-4 md:px-0">
                <NearYouList
                  orgs={feedOrgs}
                  coords={coords}
                  isSearchActive={isSearchActive}
                  searchQuery={searchQuery}
                />
              </div>
            </div>
          ) : (
            <div className="px-4 md:px-0 mt-8">
              <EmptyState
                searchQuery={searchQuery}
                hasCategory={!!selectedCategory}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
