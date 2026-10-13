import { ConvexError } from "convex/values";
import type { Doc } from "../_generated/dataModel";

export const ACTIVE_INDUSTRY = "beauty_wellness" as const;
// Marketplace discovery and its background model work stay dormant until an
// explicit product-scope change. Provider credentials must never enable it.
export const MARKETPLACE_ENABLED = false;

export function requireMarketplaceEnabled() {
  if (!MARKETPLACE_ENABLED) throw new ConvexError("MARKETPLACE_UNAVAILABLE");
}

export function isActiveIndustry(
  industry: Doc<"orgs">["industry"] | null | undefined,
): boolean {
  // Historical name retained for beauty callers. Hospitality has separate
  // reservation APIs; broadening this would expose beauty services and plans.
  return industry === ACTIVE_INDUSTRY;
}
