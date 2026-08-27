// Internal queries and mutations called by the "use node" action in
// embeddings.ts. Convex requires actions to live in their own file
// when they import Node-only modules; this file holds the DB-side
// counterparts.

import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";

const ENTITY_TYPE = v.union(
  v.literal("org"),
  v.literal("service"),
  v.literal("reputation"),
);

export const getOrg = internalQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, { orgId }): Promise<Doc<"orgs"> | null> => {
    return await ctx.db.get(orgId);
  },
});

export const getService = internalQuery({
  args: { serviceId: v.id("services") },
  handler: async (
    ctx,
    { serviceId },
  ): Promise<{ service: Doc<"services">; org: Doc<"orgs"> } | null> => {
    const service = await ctx.db.get(serviceId);
    if (!service) return null;
    const org = await ctx.db.get(service.orgId);
    if (!org) return null;
    return { service, org };
  },
});

// Up to 12 most recent published reviews for one org.
export const getRecentPublishedReviewsForOrg = internalQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, { orgId }): Promise<Doc<"reviews">[]> => {
    const all = await ctx.db
      .query("reviews")
      .withIndex("by_org_published", (q) =>
        q.eq("orgId", orgId).eq("isPublished", true),
      )
      .order("desc")
      .take(12);
    return all.filter((r) => !r.isDeleted);
  },
});

export const findEmbeddingByEntity = internalQuery({
  args: { entityType: ENTITY_TYPE, entityId: v.string() },
  handler: async (
    ctx,
    { entityType, entityId },
  ): Promise<Doc<"marketplace_embeddings"> | null> => {
    return await ctx.db
      .query("marketplace_embeddings")
      .withIndex("by_entity", (q) =>
        q.eq("entityType", entityType).eq("entityId", entityId),
      )
      .unique();
  },
});

// Upsert by (entityType, entityId). Skip-if-unchanged is decided in
// the action by comparing sourceHash before deciding to embed.
export const upsertEmbedding = internalMutation({
  args: {
    entityType: ENTITY_TYPE,
    entityId: v.string(),
    orgId: v.id("orgs"),
    text: v.string(),
    sourceHash: v.string(),
    embedding: v.array(v.float64()),
    city: v.optional(v.string()),
    industry: v.union(
      v.literal("beauty_wellness"),
      v.literal("hospitality"),
    ),
    isPublished: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("marketplace_embeddings")
      .withIndex("by_entity", (q) =>
        q.eq("entityType", args.entityType).eq("entityId", args.entityId),
      )
      .unique();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        orgId: args.orgId,
        text: args.text,
        sourceHash: args.sourceHash,
        embedding: args.embedding,
        city: args.city,
        industry: args.industry,
        isPublished: args.isPublished,
        isDeleted: false,
        deletedAt: undefined,
        updatedAt: now,
      });
      return existing._id;
    }
    return await ctx.db.insert("marketplace_embeddings", {
      ...args,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Embeddings are derived data, but still follow the repository-wide soft-delete
// policy so a reset never physically destroys production records.
export const deleteEmbeddingByEntity = internalMutation({
  args: { entityType: ENTITY_TYPE, entityId: v.string() },
  handler: async (ctx, { entityType, entityId }) => {
    const existing = await ctx.db
      .query("marketplace_embeddings")
      .withIndex("by_entity", (q) =>
        q.eq("entityType", entityType).eq("entityId", entityId),
      )
      .unique();
    if (existing && !existing.isDeleted) {
      const now = Date.now();
      await ctx.db.patch(existing._id, {
        isPublished: false,
        isDeleted: true,
        deletedAt: now,
        updatedAt: now,
      });
    }
  },
});

// Mark publish-state changes on the existing row without re-embedding.
// Used when an org is unpublished/republished — the chunk is unchanged.
export const setEmbeddingPublished = internalMutation({
  args: {
    entityType: ENTITY_TYPE,
    entityId: v.string(),
    isPublished: v.boolean(),
  },
  handler: async (ctx, { entityType, entityId, isPublished }) => {
    const existing = await ctx.db
      .query("marketplace_embeddings")
      .withIndex("by_entity", (q) =>
        q.eq("entityType", entityType).eq("entityId", entityId),
      )
      .unique();
    if (existing && !existing.isDeleted && existing.isPublished !== isPublished) {
      await ctx.db.patch(existing._id, { isPublished, updatedAt: Date.now() });
    }
  },
});

// Pagination helpers for backfillAll.
export const listAllOrgIds = internalQuery({
  args: {},
  handler: async (ctx): Promise<Id<"orgs">[]> => {
    const orgs = await ctx.db.query("orgs").collect();
    return orgs.filter((o) => !o.isDeleted).map((o) => o._id);
  },
});

export const listAllServiceIds = internalQuery({
  args: {},
  handler: async (ctx): Promise<Id<"services">[]> => {
    const services = await ctx.db.query("services").collect();
    return services
      .filter((s) => !s.isDeleted && s.isOpusVisible && s.isActive)
      .map((s) => s._id);
  },
});

// Orgs that have at least one published review → eligible for a reputation snippet.
export const listOrgIdsWithReviews = internalQuery({
  args: {},
  handler: async (ctx): Promise<Id<"orgs">[]> => {
    const orgs = await ctx.db.query("orgs").collect();
    const result: Id<"orgs">[] = [];
    for (const org of orgs) {
      if (org.isDeleted) continue;
      if (org.reviewCount <= 0) continue;
      result.push(org._id);
    }
    return result;
  },
});
