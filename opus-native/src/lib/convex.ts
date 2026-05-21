import { ConvexReactClient } from 'convex/react';

import { getConvexUrl } from '@/lib/convex-url';

export const convexUrl = getConvexUrl();

export const convex = new ConvexReactClient(convexUrl, {
  unsavedChangesWarning: false,
});
