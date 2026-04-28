// DB-side helpers for the retrieve action. Kept in their own file
// because retrieve.ts is "use node" (uses OpenAI SDK + crypto), and
// "use node" files cannot define queries or mutations.

import { v } from "convex/values";
import { internalQuery } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";

export const getOrgsByIds = internalQuery({
  args: { orgIds: v.array(v.id("orgs")) },
  handler: async (ctx, { orgIds }): Promise<Array<Doc<"orgs">>> => {
    const docs = await Promise.all(orgIds.map((id) => ctx.db.get(id)));
    return docs.filter((d): d is Doc<"orgs"> => d !== null && !d.isDeleted);
  },
});

export const getEmbeddingsByIds = internalQuery({
  args: { ids: v.array(v.id("marketplace_embeddings")) },
  handler: async (ctx, { ids }): Promise<Array<Doc<"marketplace_embeddings">>> => {
    const docs = await Promise.all(ids.map((id) => ctx.db.get(id)));
    return docs.filter((d): d is Doc<"marketplace_embeddings"> => d !== null);
  },
});

export const getAvailableCategories = internalQuery({
  args: { city: v.optional(v.string()) },
  handler: async (ctx, args): Promise<string[]> => {
    const allPublished = await ctx.db
      .query("orgs")
      .withIndex("by_listing_status", (q) => q.eq("listingStatus", "published"))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    const cityOrgs = args.city
      ? allPublished.filter((o) => o.city?.toLowerCase() === args.city!.toLowerCase())
      : allPublished;

    const categoriesSet = new Set(
      cityOrgs
        .map((o) => o.beautyCategory || o.industry)
        .filter(Boolean)
    );
    return Array.from(categoriesSet) as string[];
  },
});
