import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import {
  isTenantSlugRouteable,
  RESERVED_TENANT_SUBDOMAINS,
  slugifyBusinessName,
} from "./tenantSites";

type SlugMutationCtx = Pick<MutationCtx, "db">;

export async function allocateUniqueTenantSlug(
  ctx: SlugMutationCtx,
  name: string,
  currentOrgId?: Id<"orgs">,
): Promise<string> {
  const base = slugifyBusinessName(name) || "business";
  let candidate = base;
  let suffix = 2;

  while (true) {
    const existing = await ctx.db
      .query("orgs")
      .withIndex("by_slug", (q) => q.eq("slug", candidate))
      .collect();
    const isReserved = RESERVED_TENANT_SUBDOMAINS.has(candidate);
    const hasCollision = existing.some((org) => org._id !== currentOrgId);
    if (!isReserved && !hasCollision) return candidate;

    const suffixLabel = `-${suffix}`;
    candidate = `${base.slice(0, 63 - suffixLabel.length)}${suffixLabel}`;
    suffix += 1;
  }
}

export async function ensurePublishableTenantSlug(
  ctx: SlugMutationCtx,
  org: Doc<"orgs">,
): Promise<string> {
  const normalizedSlug = org.slug.trim().toLowerCase();
  if (isTenantSlugRouteable(normalizedSlug)) {
    const matches = await ctx.db
      .query("orgs")
      .withIndex("by_slug", (q) => q.eq("slug", normalizedSlug))
      .collect();
    if (matches.every((match) => match._id === org._id)) {
      return normalizedSlug;
    }
  }

  return await allocateUniqueTenantSlug(ctx, org.name, org._id);
}
