import { SymbolView } from 'expo-symbols';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

type Props = {
  isSearchActive: boolean;
  hasCategoryFilter: boolean;
};

export function DiscoverEmptyState({ isSearchActive, hasCategoryFilter }: Props) {
  const theme = useTheme();

  const title = 'No Results';
  const description = isSearchActive
    ? 'Try a different search.'
    : hasCategoryFilter
      ? 'No businesses match this category in your area yet.'
      : 'No published businesses in this area yet.';

  return (
    <View style={styles.root}>
      <SymbolView
        name={{ ios: 'building.2', android: 'business', web: 'business' }}
        size={40}
        tintColor={theme.textSecondary}
      />
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.description, { color: theme.textSecondary }]}>
        {description}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.six,
    gap: Spacing.two,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  description: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});
