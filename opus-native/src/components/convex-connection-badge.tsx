import { useQuery } from 'convex/react';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { api } from '@/lib/convex-api';
import { convexUrl } from '@/lib/convex';
import { Spacing } from '@/constants/theme';

/** Dev-only indicator that Convex is wired up (public:listPublished). */
export function ConvexConnectionBadge() {
  const feed = useQuery(api.public.listPublished, {
    paginationOpts: { numItems: 1, cursor: null },
  });

  let label: string;
  if (feed === undefined) {
    label = 'Convex: connecting…';
  } else if (feed === null) {
    label = 'Convex: error';
  } else {
    const count = feed.items.length;
    label = `Convex: ${count > 0 ? 'connected' : 'connected (no listings)'}`;
  }

  return (
    <ThemedView type="backgroundElement" style={styles.badge}>
      <ThemedText type="small">{label}</ThemedText>
      {feed === undefined ? (
        <ThemedText type="small" themeColor="textSecondary">
          {convexUrl}
        </ThemedText>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'stretch',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
});
