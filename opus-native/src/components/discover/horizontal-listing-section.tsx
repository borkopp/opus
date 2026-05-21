import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BusinessCoverCard } from '@/components/discover/business-cover-card';
import { BusinessTileCard } from '@/components/discover/business-tile-card';
import type { PublishedListing } from '@/lib/discover/types';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

type Props = {
  title: string;
  listings: PublishedListing[];
  onListingPress?: (listing: PublishedListing) => void;
  variant?: 'cover' | 'tile';
};

export function HorizontalListingSection({
  title,
  listings,
  onListingPress,
  variant = 'cover',
}: Props) {
  const theme = useTheme();

  if (listings.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
      >
        {listings.map((listing) =>
          variant === 'tile' ? (
            <BusinessTileCard
              key={listing._id}
              listing={listing}
              onPress={onListingPress ? () => onListingPress(listing) : undefined}
            />
          ) : (
            <BusinessCoverCard
              key={listing._id}
              listing={listing}
              onPress={onListingPress ? () => onListingPress(listing) : undefined}
            />
          ),
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.three },
  title: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
    paddingHorizontal: Spacing.three,
  },
  scrollContent: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
  },
});
