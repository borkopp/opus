import { anyApi } from 'convex/server';

import type { api as Api } from '@opus/convex-generated/api';

/** Typed function references — codegen lives in opus-dashboard/convex. */
export const api = anyApi as typeof Api;

export type { Id, Doc } from '@opus/convex-generated/dataModel';
