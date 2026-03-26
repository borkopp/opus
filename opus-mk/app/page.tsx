"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Logo } from "@/components/Logo";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import {
  IconSearch,
  IconMapPin,
  IconStar,
  IconStarFilled,
  IconSparkles,
} from "@tabler/icons-react";

export default function DiscoverPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState<string | undefined>();

  // Use search when query is present, otherwise list all published
  const listings = useQuery(api.public.listPublished, {
    city: selectedCity,
  });

  const searchResults = useQuery(
    api.public.searchPublished,
    searchQuery.length >= 2 ? { query: searchQuery, city: selectedCity } : "skip"
  );

  const displayItems = searchQuery.length >= 2 ? searchResults : listings?.items;
  const isLoading = displayItems === undefined;

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Logo className="text-xl" />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <IconMapPin size={14} />
            <span>Skopje</span>
          </div>
        </div>
      </header>

      {/* ── Search ── */}
      <div className="max-w-3xl mx-auto px-4 pt-6 pb-4">
        <div className="relative">
          <IconSearch
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50"
          />
          <Input
            placeholder="Search businesses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 rounded-2xl bg-card border-border/60 text-base placeholder:text-muted-foreground/40"
          />
        </div>
      </div>

      {/* ── Listings Grid ── */}
      <main className="max-w-3xl mx-auto px-4 pb-12">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        ) : displayItems && displayItems.length > 0 ? (
          <div className="space-y-3">
            {displayItems.map((org) => (
              <Link
                key={org._id}
                href={`/${org.slug}`}
                className="group block"
              >
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border/40 transition-all hover:border-border hover:shadow-sm active:scale-[0.98]">
                  {/* Logo */}
                  <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center shrink-0 overflow-hidden">
                    {org.logoUrl ? (
                      <img
                        src={org.logoUrl}
                        alt={org.name}
                        className="w-full h-full object-cover"
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
                      <h3 className="text-base font-semibold truncate">
                        {org.name}
                      </h3>
                      {("isFeatured" in org) && (org as any).isFeatured && (
                        <IconSparkles size={14} className="text-amber-500 shrink-0" />
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
                          <IconStarFilled size={12} className="text-amber-500" />
                          <span className="font-medium">{org.averageRating.toFixed(1)}</span>
                          <span className="text-muted-foreground">({org.reviewCount})</span>
                        </div>
                      )}
                      {org.city && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <IconMapPin size={12} />
                          <span>{org.city}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="text-muted-foreground/30 group-hover:text-muted-foreground transition-colors">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M7.5 5L12.5 10L7.5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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
              {searchQuery ? "Try a different search term" : "Check back later"}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
