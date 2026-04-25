"use node";

// Embeds orgs / services / per-org reputation snippets via OpenAI
// text-embedding-3-small (1536 dims). Uses a SHA-256 sourceHash to
// skip re-embedding when the embeddable text hasn't changed.
//
// Trigger paths:
//   - orgs/services/reviews mutations schedule embedEntity via runAfter(0, ...).
//   - backfillAll seeds the index for existing data on first deployment.
//   - A daily cron regenerates reputation snippets from new reviews.

import OpenAI from "openai";
import { createHash } from "node:crypto";
import { v } from "convex/values";
import { internalAction, ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import {
  buildOrgChunk,
  buildServiceChunk,
  buildReputationChunk,
} from "./sourceText";

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMS = 1536;

const ENTITY_TYPE = v.union(
  v.literal("org"),
  v.literal("service"),
  v.literal("reputation"),
);

function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set in Convex env. Run `npx convex env set OPENAI_API_KEY ...` from opus-dashboard.",
    );
  }
  return new OpenAI({ apiKey });
}

async function embedText(client: OpenAI, text: string): Promise<number[]> {
  const res = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
    dimensions: EMBEDDING_DIMS,
  });
  return res.data[0].embedding;
}

// ── Per-entity helpers ──────────────────────────────────────────────

async function embedOrg(ctx: ActionCtx, orgId: Id<"orgs">) {
  const org = await ctx.runQuery(internal.marketplace.embeddingsHelpers.getOrg, { orgId });
  if (!org || org.isDeleted) {
    await ctx.runMutation(internal.marketplace.embeddingsHelpers.deleteEmbeddingByEntity, {
      entityType: "org",
      entityId: orgId,
    });
    return { skipped: "org-missing" };
  }
  const text = buildOrgChunk(org);
  const sourceHash = sha256(text);

  const existing = await ctx.runQuery(
    internal.marketplace.embeddingsHelpers.findEmbeddingByEntity,
    { entityType: "org", entityId: orgId },
  );
  const isPublished = org.listingStatus === "published";

  if (existing && existing.sourceHash === sourceHash) {
    if (existing.isPublished !== isPublished) {
      await ctx.runMutation(internal.marketplace.embeddingsHelpers.setEmbeddingPublished, {
        entityType: "org",
        entityId: orgId,
        isPublished,
      });
    }
    return { skipped: "hash-match" };
  }

  const client = getOpenAI();
  const embedding = await embedText(client, text);
  await ctx.runMutation(internal.marketplace.embeddingsHelpers.upsertEmbedding, {
    entityType: "org",
    entityId: orgId,
    orgId,
    text,
    sourceHash,
    embedding,
    city: org.city,
    industry: org.industry,
    isPublished,
  });
  return { embedded: true };
}

async function embedService(ctx: ActionCtx, serviceId: Id<"services">) {
  const result = await ctx.runQuery(
    internal.marketplace.embeddingsHelpers.getService,
    { serviceId },
  );
  if (!result) {
    await ctx.runMutation(internal.marketplace.embeddingsHelpers.deleteEmbeddingByEntity, {
      entityType: "service",
      entityId: serviceId,
    });
    return { skipped: "service-missing" };
  }
  const { service, org } = result;

  const visible =
    !service.isDeleted &&
    service.isActive &&
    service.isOpusVisible &&
    !org.isDeleted;
  if (!visible) {
    await ctx.runMutation(internal.marketplace.embeddingsHelpers.deleteEmbeddingByEntity, {
      entityType: "service",
      entityId: serviceId,
    });
    return { skipped: "service-hidden" };
  }

  const text = buildServiceChunk(service, org);
  const sourceHash = sha256(text);

  const existing = await ctx.runQuery(
    internal.marketplace.embeddingsHelpers.findEmbeddingByEntity,
    { entityType: "service", entityId: serviceId },
  );
  const isPublished = org.listingStatus === "published";

  if (existing && existing.sourceHash === sourceHash) {
    if (existing.isPublished !== isPublished) {
      await ctx.runMutation(internal.marketplace.embeddingsHelpers.setEmbeddingPublished, {
        entityType: "service",
        entityId: serviceId,
        isPublished,
      });
    }
    return { skipped: "hash-match" };
  }

  const client = getOpenAI();
  const embedding = await embedText(client, text);
  await ctx.runMutation(internal.marketplace.embeddingsHelpers.upsertEmbedding, {
    entityType: "service",
    entityId: serviceId,
    orgId: org._id,
    text,
    sourceHash,
    embedding,
    city: org.city,
    industry: org.industry,
    isPublished,
  });
  return { embedded: true };
}

async function embedReputation(ctx: ActionCtx, orgId: Id<"orgs">) {
  const org = await ctx.runQuery(internal.marketplace.embeddingsHelpers.getOrg, { orgId });
  if (!org || org.isDeleted || org.reviewCount === 0) {
    await ctx.runMutation(internal.marketplace.embeddingsHelpers.deleteEmbeddingByEntity, {
      entityType: "reputation",
      entityId: orgId,
    });
    return { skipped: "no-reviews" };
  }

  const reviews = await ctx.runQuery(
    internal.marketplace.embeddingsHelpers.getRecentPublishedReviewsForOrg,
    { orgId },
  );
  if (reviews.length === 0) {
    return { skipped: "no-published-reviews" };
  }

  const text = buildReputationChunk(org, reviews);
  const sourceHash = sha256(text);

  const existing = await ctx.runQuery(
    internal.marketplace.embeddingsHelpers.findEmbeddingByEntity,
    { entityType: "reputation", entityId: orgId },
  );
  const isPublished = org.listingStatus === "published";

  if (existing && existing.sourceHash === sourceHash) {
    if (existing.isPublished !== isPublished) {
      await ctx.runMutation(internal.marketplace.embeddingsHelpers.setEmbeddingPublished, {
        entityType: "reputation",
        entityId: orgId,
        isPublished,
      });
    }
    return { skipped: "hash-match" };
  }

  const client = getOpenAI();
  const embedding = await embedText(client, text);
  await ctx.runMutation(internal.marketplace.embeddingsHelpers.upsertEmbedding, {
    entityType: "reputation",
    entityId: orgId,
    orgId,
    text,
    sourceHash,
    embedding,
    city: org.city,
    industry: org.industry,
    isPublished,
  });
  return { embedded: true };
}

// ── Public actions ──────────────────────────────────────────────────

export const embedEntity = internalAction({
  args: {
    entityType: ENTITY_TYPE,
    entityId: v.string(),
  },
  handler: async (ctx, { entityType, entityId }) => {
    if (entityType === "org") {
      return await embedOrg(ctx, entityId as Id<"orgs">);
    }
    if (entityType === "service") {
      return await embedService(ctx, entityId as Id<"services">);
    }
    return await embedReputation(ctx, entityId as Id<"orgs">);
  },
});

// One-shot backfill — schedule embedEntity for every existing org and service.
// Reputation snippets are handled by the daily cron after this seeds.
export const backfillAll = internalAction({
  args: {},
  handler: async (ctx) => {
    const orgIds: Id<"orgs">[] = await ctx.runQuery(
      internal.marketplace.embeddingsHelpers.listAllOrgIds,
    );
    const serviceIds: Id<"services">[] = await ctx.runQuery(
      internal.marketplace.embeddingsHelpers.listAllServiceIds,
    );

    let scheduled = 0;
    for (const id of orgIds) {
      await ctx.scheduler.runAfter(0, internal.marketplace.embeddings.embedEntity, {
        entityType: "org",
        entityId: id,
      });
      scheduled++;
    }
    for (const id of serviceIds) {
      await ctx.scheduler.runAfter(0, internal.marketplace.embeddings.embedEntity, {
        entityType: "service",
        entityId: id,
      });
      scheduled++;
    }
    const repOrgIds: Id<"orgs">[] = await ctx.runQuery(
      internal.marketplace.embeddingsHelpers.listOrgIdsWithReviews,
    );
    for (const id of repOrgIds) {
      await ctx.scheduler.runAfter(0, internal.marketplace.embeddings.embedEntity, {
        entityType: "reputation",
        entityId: id,
      });
      scheduled++;
    }
    return { scheduled, orgs: orgIds.length, services: serviceIds.length, reputations: repOrgIds.length };
  },
});

// Daily cron entrypoint — recompute reputation snippets only.
// Per-org skip-if-unchanged is enforced by the sourceHash check.
export const refreshAllReputations = internalAction({
  args: {},
  handler: async (ctx) => {
    const orgIds: Id<"orgs">[] = await ctx.runQuery(
      internal.marketplace.embeddingsHelpers.listOrgIdsWithReviews,
    );
    for (const id of orgIds) {
      await ctx.scheduler.runAfter(0, internal.marketplace.embeddings.embedEntity, {
        entityType: "reputation",
        entityId: id,
      });
    }
    return { scheduled: orgIds.length };
  },
});
