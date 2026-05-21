import { router } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryRail } from '@/components/discover/category-rail';
import { DiscoverEmptyState } from '@/components/discover/discover-empty-state';
import { DiscoverSearchBar } from '@/components/discover/discover-search-bar';
import { DiscoverSkeleton } from '@/components/discover/discover-skeleton';
import { HorizontalListingSection } from '@/components/discover/horizontal-listing-section';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useDiscover } from '@/hooks/use-discover';
import { useTheme } from '@/hooks/use-theme';
import type { PublishedListing } from '@/lib/discover/types';

export default function DiscoverScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const {
    city,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    isSearchActive,
    isLoading,
    availableCategoryIds,
    feed,
    hasResults,
  } = useDiscover();

  const bottomInset = insets.bottom + BottomTabInset + Spacing.three;

  const handleListingPress = (listing: PublishedListing) => {
    router.push(`/business/${listing.slug}`);
  };

  const nearYouTitle = isSearchActive
    ? `Results for "${searchQuery.trim()}"`
    : 'Near You';

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + Spacing.two, paddingBottom: bottomInset },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.navTitle, { color: theme.text }]}>Discover</Text>

        <DiscoverSearchBar value={searchQuery} onChangeText={setSearchQuery} />

        {!isSearchActive && (
          <View style={styles.categoryRail}>
            <CategoryRail
              availableCategoryIds={availableCategoryIds}
              selectedCategory={selectedCategory}
              onSelect={setSelectedCategory}
            />
          </View>
        )}

        <View style={styles.content}>
          {isLoading && !hasResults ? (
            <DiscoverSkeleton />
          ) : !hasResults ? (
            <DiscoverEmptyState
              isSearchActive={isSearchActive}
              hasCategoryFilter={selectedCategory != null}
            />
          ) : (
            <View style={styles.sections}>
              {!isSearchActive && feed.featured.length > 0 && (
                <HorizontalListingSection
                  title="Featured"
                  listings={feed.featured}
                  onListingPress={handleListingPress}
                />
              )}
              <HorizontalListingSection
                title={nearYouTitle}
                listings={feed.nearYou}
                onListingPress={handleListingPress}
                variant="tile"
              />
            </View>
          )}
        </View>

        {!isLoading && hasResults && (
          <Text style={[styles.cityHint, { color: theme.textSecondary }]}>
            Showing listings in {city}
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  navTitle: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.5,
    paddingHorizontal: Spacing.three,
    marginBottom: Spacing.three,
  },
  categoryRail: {
    marginTop: Spacing.three,
    marginBottom: Spacing.one,
  },
  content: {
    marginTop: Spacing.three,
  },
  sections: { gap: 28 },
  cityHint: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: Spacing.four,
    paddingHorizontal: Spacing.three,
  },
});
