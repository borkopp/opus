import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { DiscoverLayout } from '@/constants/discover';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

function SkeletonSection() {
  const theme = useTheme();

  return (
    <View style={styles.section}>
      <View
        style={[styles.titleBar, { backgroundColor: theme.backgroundElement }]}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={[
              styles.card,
              { backgroundColor: theme.backgroundElement },
            ]}
          />
        ))}
      </ScrollView>
    </View>
  );
}

export function DiscoverSkeleton() {
  return (
    <View style={styles.root}>
      <SkeletonSection />
      <SkeletonSection />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 28, paddingTop: Spacing.two },
  section: { gap: Spacing.three },
  titleBar: {
    height: 24,
    width: 120,
    borderRadius: 6,
    marginHorizontal: Spacing.three,
  },
  row: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
  },
  card: {
    width: DiscoverLayout.coverCardWidth,
    height: DiscoverLayout.coverCardHeight,
    borderRadius: 16,
  },
});
