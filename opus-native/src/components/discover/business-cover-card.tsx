import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DiscoverColors, DiscoverLayout } from '@/constants/discover';
import { isOpenNow } from '@/lib/discover/opening-hours';
import { priceRangeSymbol } from '@/lib/discover/feed';
import type { PublishedListing } from '@/lib/discover/types';
import { venueLabel } from '@/lib/discover/venue-label';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { useLocation } from '@/context/location-context';
import { haversineKm, fmtDistance } from '@/lib/discover/distance';

type Props = {
  listing: PublishedListing;
  onPress?: () => void;
};

export function BusinessCoverCard({ listing, onPress }: Props) {
  const theme = useTheme();
  const location = useLocation();
  const open = isOpenNow(listing.openingHours);
  const coverUri = listing.coverImageUrl ?? listing.logoUrl;
  const price = priceRangeSymbol(listing.priceRange);

  const distanceLabel =
    location.status === 'ready' && listing.coordinates
      ? fmtDistance(
          haversineKm(
            location.coords.lat,
            location.coords.lng,
            listing.coordinates.lat,
            listing.coordinates.lng,
          ),
        )
      : listing.city ?? null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={listing.name}
    >
      <View style={styles.media}>
        {coverUri ? (
          <Image
            source={{ uri: coverUri }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={300}
          />
        ) : (
          <View style={[styles.fallback, { backgroundColor: theme.backgroundElement }]}>
            {listing.logoUrl ? (
              <Image
                source={{ uri: listing.logoUrl }}
                style={styles.logo}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <Text style={[styles.initial, { color: theme.textSecondary }]}>
                {listing.name.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
        )}

        <LinearGradient
          colors={[
            'rgba(0,0,0,0.85)',
            'rgba(0,0,0,0.35)',
            'rgba(0,0,0,0.1)',
            'transparent',
          ]}
          locations={[0, 0.35, 0.55, 1]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 1 }}
          end={{ x: 0.5, y: 0 }}
          pointerEvents="none"
        />

        <View style={styles.overlay}>
          <View style={styles.topRow}>
            {open ? (
              <View style={styles.badge}>
                <View style={styles.openDot} />
                <Text style={styles.badgeText}>Open</Text>
              </View>
            ) : (
              <View />
            )}
            {listing.averageRating != null && listing.averageRating > 0 ? (
              <View style={styles.badge}>
                <SymbolView
                  name={{ ios: 'star.fill', android: 'star', web: 'star' }}
                  size={10}
                  tintColor={DiscoverColors.rating}
                />
                <Text style={styles.badgeText}>
                  {listing.averageRating.toFixed(1)}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.bottom}>
            <Text style={styles.name} numberOfLines={2}>
              {listing.name}
            </Text>
            <Text style={styles.venue} numberOfLines={1}>
              {venueLabel(listing)}
            </Text>
            <View style={styles.metaRow}>
              {distanceLabel ? (
                <View style={styles.cityRow}>
                  <SymbolView
                    name={{
                      ios: 'mappin.and.ellipse',
                      android: 'place',
                      web: 'place',
                    }}
                    size={12}
                    tintColor="rgba(255,255,255,0.75)"
                  />
                  <Text style={styles.metaText} numberOfLines={1}>
                    {distanceLabel}
                  </Text>
                </View>
              ) : (
                <View style={styles.flex} />
              )}
              {price ? <Text style={styles.metaText}>{price}</Text> : null}
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: DiscoverLayout.coverCardWidth,
    height: DiscoverLayout.coverCardHeight,
    borderRadius: 16,
    overflow: 'hidden',
  },
  pressed: { opacity: 0.92 },
  media: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  fallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 12,
  },
  initial: {
    fontSize: 22,
    fontWeight: '700',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    padding: 12,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: DiscoverColors.cardOverlay,
  },
  openDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: DiscoverColors.success,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  bottom: { gap: 4 },
  name: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 22,
  },
  venue: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  cityRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
  },
  flex: { flex: 1 },
});
