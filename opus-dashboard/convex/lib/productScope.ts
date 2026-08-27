import type { Doc } from "../_generated/dataModel";

export const ACTIVE_INDUSTRY = "beauty_wellness" as const;

export function isActiveIndustry(
  industry: Doc<"orgs">["industry"] | null | undefined,
): boolean {
  return industry === ACTIVE_INDUSTRY;
}
