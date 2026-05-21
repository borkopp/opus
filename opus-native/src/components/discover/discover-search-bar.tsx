import { SymbolView } from 'expo-symbols';
import React from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
};

export function DiscoverSearchBar({ value, onChangeText }: Props) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.backgroundSelected,
        },
      ]}
    >
      <SymbolView
        name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
        size={18}
        tintColor={theme.textSecondary}
      />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Search salons, restaurants…"
        placeholderTextColor={theme.textSecondary}
        style={[styles.input, { color: theme.text }]}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginHorizontal: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
});
