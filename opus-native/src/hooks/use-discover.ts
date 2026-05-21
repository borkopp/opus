import { useQuery } from 'convex/react';
import { useMemo, useState } from 'react';

import { DEFAULT_DISCOVER_CITY } from '@/constants/discover';
import { buildDiscoverFeed } from '@/lib/discover/feed';
import type { PublishedListing } from '@/lib/discover/types';
import { api } from '@/lib/convex-api';
import { useLocation } from '@/context/location-context';

export function useDiscover() {
  const location = useLocation();
  const city = location.status === 'ready' ? location.city : DEFAULT_DISCOVER_CITY;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();

  const trimmedQuery = searchQuery.trim();
  const isSearchActive = trimmedQuery.length >= 2;

  const listPublished = useQuery(
    api.public.listPublished,
    !isSearchActive ? { city } : 'skip',
  );

  const searchPublished = useQuery(
    api.public.searchPublished,
    isSearchActive ? { query: trimmedQuery, city } : 'skip',
  );

  const rawListings: PublishedListing[] | undefined = isSearchActive
    ? searchPublished
    : listPublished?.items;

  const isLoading = rawListings === undefined;

  const availableCategoryIds = useMemo(() => {
    const source = isSearchActive ? rawListings : listPublished?.items;
    if (!source) return new Set<string>();
    return new Set(
      source.map((item) => item.beautyCategory).filter((id): id is string => !!id),
    );
  }, [isSearchActive, rawListings, listPublished?.items]);

  const filteredListings = useMemo(() => {
    if (!rawListings) return [];
    if (!selectedCategory) return rawListings;
    return rawListings.filter((item) => item.beautyCategory === selectedCategory);
  }, [rawListings, selectedCategory]);

  const feed = useMemo(
    () => buildDiscoverFeed(filteredListings, isSearchActive),
    [filteredListings, isSearchActive],
  );

  const hasResults = feed.featured.length > 0 || feed.nearYou.length > 0;

  return {
    city,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    isSearchActive,
    isLoading,
    rawListings,
    availableCategoryIds,
    feed,
    hasResults,
  };
}
