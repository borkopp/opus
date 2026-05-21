import { NativeTabs } from 'expo-router/unstable-native-tabs';
import React from 'react';
import { useColorScheme } from 'react-native';

import { TabIcons } from '@/constants/tabs';
import { Colors } from '@/constants/theme';
import { DiscoverColors } from '@/constants/discover';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={DiscoverColors.accent}
      iconColor={{
        default: colors.textSecondary,
        selected: DiscoverColors.accent,
      }}
      labelStyle={{ selected: { color: colors.text } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Ask</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={TabIcons.ask.sf}
          md={TabIcons.ask.md}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="explore">
        <NativeTabs.Trigger.Label>Discover</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={TabIcons.discover.sf}
          md={TabIcons.discover.md}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
