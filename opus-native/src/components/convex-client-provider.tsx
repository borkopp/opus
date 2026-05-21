import { ConvexProvider } from 'convex/react';
import { ReactNode } from 'react';

import { convex } from '@/lib/convex';

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
