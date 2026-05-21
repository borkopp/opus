import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { BEAUTY_CATEGORIES } from '@/lib/discover/beauty-categories';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

type Props = {
  availableCategoryIds: Set<string>;
  selectedCategory: string | undefined;
  onSelect: (category: string | undefined) => void;
};

export function CategoryRail({
  availableCategoryIds,
  selectedCategory,
  onSelect,
}: Props) {
  const theme = useTheme();
  const categories = BEAUTY_CATEGORIES.filter((c) => availableCategoryIds.has(c.id));

  if (categories.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      <CategoryChip
        label="All"
        selected={selectedCategory == null}
        onPress={() => onSelect(undefined)}
        theme={theme}
      />
      {categories.map((cat) => (
        <CategoryChip
          key={cat.id}
          label={cat.label}
          selected={selectedCategory === cat.id}
          onPress={() =>
            onSelect(selectedCategory === cat.id ? undefined : cat.id)
          }
          theme={theme}
        />
      ))}
    </ScrollView>
  );
}

function CategoryChip({
  label,
  selected,
  onPress,
  theme,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? theme.text : theme.backgroundElement,
          borderColor: selected ? theme.text : theme.backgroundSelected,
        },
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Text
        style={[
          styles.chipText,
          { color: selected ? theme.background : theme.text },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
