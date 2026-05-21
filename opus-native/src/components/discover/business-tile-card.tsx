import { Image } from "expo-image";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { DiscoverColors } from "@/constants/discover";
import { useLocation } from "@/context/location-context";
import { isOpenNow } from "@/lib/discover/opening-hours";
import { priceRangeSymbol } from "@/lib/discover/feed";
import { haversineKm, fmtDistance } from "@/lib/discover/distance";
import type { PublishedListing } from "@/lib/discover/types";
import { venueLabel } from "@/lib/discover/venue-label";
import { useTheme } from "@/hooks/use-theme";

type Props = {
  listing: PublishedListing;
  onPress?: () => void;
};

const CARD_WIDTH = 300;
const IMAGE_HEIGHT = 160;

export function BusinessTileCard({ listing, onPress }: Props) {
  const theme = useTheme();
  const location = useLocation();
  const open = isOpenNow(listing.openingHours);
  const imageUri = listing.coverImageUrl ?? listing.logoUrl;
  const price = priceRangeSymbol(listing.priceRange);
  const label = venueLabel(listing);

  const distanceLabel =
    location.status === "ready" && listing.coordinates
      ? fmtDistance(
          haversineKm(
            location.coords.lat,
            location.coords.lng,
            listing.coordinates.lat,
            listing.coordinates.lng,
          ),
        )
      : null;

  const statusColor = open ? DiscoverColors.success : "#ef4444";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={listing.name}
    >
      {/* Image */}
      <View style={styles.imageWrap}>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={300}
          />
        ) : (
          <View
            style={[
              StyleSheet.absoluteFill,
              styles.imageFallback,
              { backgroundColor: DiscoverColors.accent + "18" },
            ]}
          >
            <Text style={[styles.initial, { color: DiscoverColors.accent }]}>
              {listing.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        {/* Open/closed dot badge on image */}
        <View style={[styles.dotBadge, { backgroundColor: statusColor }]} />
      </View>

      {/* Text below image */}
      <View style={styles.textBlock}>
        <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
          {listing.name}
        </Text>
        <Text
          style={[styles.sub, { color: theme.textSecondary }]}
          numberOfLines={1}
        >
          {[label, price, distanceLabel].filter(Boolean).join(" · ")}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { width: CARD_WIDTH },
  pressed: { opacity: 0.8 },

  imageWrap: {
    width: CARD_WIDTH,
    height: IMAGE_HEIGHT,
    borderRadius: 16,
    overflow: "hidden",
  },
  imageFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  initial: { fontSize: 32, fontWeight: "700" },

  dotBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 9,
    height: 9,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.15)",
  },

  textBlock: { marginTop: 8, gap: 2 },
  name: { fontSize: 14, fontWeight: "600" },
  sub: { fontSize: 12 },
});
