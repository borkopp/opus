"use node";

// Marketplace retrieve action — the heart of the RAG pipeline.
//
// Flow:
//   1. extractTimeIntent (regex) — translate "now"/"tonight"/"tomorrow"/HH:MM
//      into a concrete Europe/Skopje timestamp before retrieval.
//   2. embed query via OpenAI text-embedding-3-small.
//   3. 3× parallel vectorSearch (entityType: org / service / reputation).
//      Convex vectorSearch filter supports a single eq, so we filter by
//      entityType at search time and post-filter isPublished/city/industry.
//   4. Resolve embedding rows → orgs, dedupe by orgId, keep best score.
//   5. Haversine distance from coords (when granted).
//   6. isOpenNow / isOpenAt(intentTime) annotation.
//   7. Combined re-rank: vector score + rating bonus − distance penalty.
//   8. Persist user turn, return top N candidates + history + timeIntent.
//
// The Edge route /api/chat synthesises the response by calling Anthropic
// Claude with these candidates as structured context — this action does
// NOT call the LLM.

import OpenAI from "openai";
import { v } from "convex/values";
import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import { Doc, Id } from "../_generated/dataModel";
import { extractTimeIntent, TimeIntent } from "./timeIntent";
import { isOpenAt, isOpenNow, openingHoursToday } from "./openingHours";

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMS = 1536;

// Per-type search limits. Total fetched ≈ 36 → after dedup typically ≤ 20 orgs.
const SEARCH_LIMIT_ORG = 12;
const SEARCH_LIMIT_SERVICE = 16;
const SEARCH_LIMIT_REPUTATION = 8;

// Final return cap for the LLM context.
const RETURN_CANDIDATE_LIMIT = 8;

// Re-rank weights. Vector score is 0..1; rating/distance/city are normalised.
const W_VECTOR = 1.0;
const W_RATING = 0.15;  // averageRating / 5
const W_DISTANCE = 0.25; // exp(-d/5km)
const W_CITY = 0.2;      // bonus when org.city === args.city (no penalty for other cities)

function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set in Convex env. Run `npx convex env set OPENAI_API_KEY ...` from opus-dashboard.",
    );
  }
  return new OpenAI({ apiKey });
}

async function embedQuery(client: OpenAI, query: string): Promise<number[]> {
  const res = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: query,
    dimensions: EMBEDDING_DIMS,
  });
  return res.data[0].embedding;
}

function haversineMetres(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

type EmbeddingHit = {
  _id: Id<"marketplace_embeddings">;
  _score: number;
};

type Candidate = {
  orgId: Id<"orgs">;
  slug: string;
  name: string;
  score: number;
  distanceM?: number;
  isOpenNow: boolean;
  isOpenAt?: boolean;
  snippet: string;
  openingHoursToday?: { open: string; close: string };
  averageRating: number;
  reviewCount: number;
  beautyCategory?: string;
  industry: "beauty_wellness" | "hospitality";
  city?: string;
  neighborhood?: string;
};

export const retrieve = action({
  args: {
    query: v.string(),
    sessionId: v.string(),
    coords: v.optional(v.object({
      lat: v.number(),
      lng: v.number(),
    })),
    city: v.optional(v.string()),
    industry: v.optional(v.union(
      v.literal("beauty_wellness"),
      v.literal("hospitality"),
    )),
    locale: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    conversationId: Id<"marketplace_conversations">;
    candidates: Candidate[];
    timeIntent: TimeIntent;
    history: Array<{ role: "user" | "assistant" | "system"; content: string }>;
    availableCategories: string[];
  }> => {
    const trimmedQuery = args.query.trim().slice(0, 500);
    if (trimmedQuery.length === 0) {
      throw new Error("query must be non-empty");
    }

    // 1. Time intent
    const now = Date.now();
    const timeIntent = extractTimeIntent(trimmedQuery, now);

    // 2. Conversation row (idempotent)
    const conversationId: Id<"marketplace_conversations"> = await ctx.runMutation(
      internal.marketplace.conversations.getOrCreateBySessionInternal,
      {
        sessionId: args.sessionId,
        initialCity: args.city,
        initialCoords: args.coords,
        locale: args.locale,
      },
    );

    // 3. History (chronological, last ~10 turns)
    const history = await ctx.runQuery(
      internal.marketplace.messages.recentForContext,
      { conversationId, take: 10 },
    );

    // 4. Persist the user turn FIRST so retries don't drop it.
    await ctx.runMutation(internal.marketplace.messages.persistUserTurnInternal, {
      conversationId,
      content: trimmedQuery,
    });

    // 5. Embed query
    const client = getOpenAI();
    const vector = await embedQuery(client, trimmedQuery);

    // 6. 3× parallel vectorSearch
    const [orgHits, serviceHits, repHits]: [EmbeddingHit[], EmbeddingHit[], EmbeddingHit[]] =
      await Promise.all([
        ctx.vectorSearch("marketplace_embeddings", "by_embedding", {
          vector,
          limit: SEARCH_LIMIT_ORG,
          filter: (q) => q.eq("entityType", "org"),
        }),
        ctx.vectorSearch("marketplace_embeddings", "by_embedding", {
          vector,
          limit: SEARCH_LIMIT_SERVICE,
          filter: (q) => q.eq("entityType", "service"),
        }),
        ctx.vectorSearch("marketplace_embeddings", "by_embedding", {
          vector,
          limit: SEARCH_LIMIT_REPUTATION,
          filter: (q) => q.eq("entityType", "reputation"),
        }),
      ]);

    // Tag with origin score weight before merging (services rank slightly
    // lower per-hit since multiple service chunks per org would otherwise dominate)
    const allHits: Array<EmbeddingHit & { weight: number }> = [
      ...orgHits.map((h) => ({ ...h, weight: 1.0 })),
      ...serviceHits.map((h) => ({ ...h, weight: 0.95 })),
      ...repHits.map((h) => ({ ...h, weight: 1.0 })),
    ];
    // 6.5 Extract available categories in the current city
    const availableCategories = await ctx.runQuery(
      internal.marketplace.retrieveHelpers.getAvailableCategories,
      { city: args.city }
    );

    if (allHits.length === 0) {
      return { conversationId, candidates: [], timeIntent, history, availableCategories };
    }

    // 7. Fetch the embedding rows (vectorSearch returns _id + _score only)
    const embeddingDocs: Array<Doc<"marketplace_embeddings">> = await ctx.runQuery(
      internal.marketplace.retrieveHelpers.getEmbeddingsByIds,
      { ids: allHits.map((h) => h._id) },
    );

    // Map hit metadata onto rows
    const scoreById = new Map<string, { score: number; weight: number }>();
    for (const h of allHits) {
      scoreById.set(h._id, { score: h._score, weight: h.weight });
    }

    // 8. Filter (post-search) by isPublished, industry, and city.
    // City is now a strict filter to prevent out-of-location hallucinations.
    const filtered = embeddingDocs.filter((row) => {
      if (!row.isPublished) return false;
      if (args.industry && row.industry !== args.industry) return false;
      if (args.city && row.city?.toLowerCase() !== args.city.toLowerCase()) return false;
      return true;
    });

    // 9. Group by orgId, keep best (score × weight). Track best snippet.
    type Best = {
      orgId: Id<"orgs">;
      bestScore: number;
      snippet: string;
      entityType: "org" | "service" | "reputation";
    };
    const bestByOrg = new Map<string, Best>();
    for (const row of filtered) {
      const meta = scoreById.get(row._id);
      if (!meta) continue;
      const weighted = meta.score * meta.weight;
      const prev = bestByOrg.get(row.orgId);
      if (!prev || weighted > prev.bestScore) {
        bestByOrg.set(row.orgId, {
          orgId: row.orgId,
          bestScore: weighted,
          snippet: row.text,
          entityType: row.entityType,
        });
      }
    }
    if (bestByOrg.size === 0) {
      return { conversationId, candidates: [], timeIntent, history, availableCategories };
    }

    // 10. Resolve to org rows
    const orgIds = [...bestByOrg.values()].map((b) => b.orgId);
    const orgs: Array<Doc<"orgs">> = await ctx.runQuery(
      internal.marketplace.retrieveHelpers.getOrgsByIds,
      { orgIds },
    );

    // 11. Build candidates with annotations + combined score
    const candidates: Candidate[] = orgs
      .filter((o) => o.listingStatus === "published")
      .map((org) => {
        const best = bestByOrg.get(org._id)!;
        const distanceM =
          args.coords && org.coordinates
            ? haversineMetres(args.coords, org.coordinates)
            : undefined;

        const openNow = isOpenNow(org);
        const openAt =
          timeIntent.kind === "none" ? undefined : isOpenAt(org, timeIntent.at);

        const ratingBonus = org.reviewCount > 0 ? (org.averageRating || 0) / 5 : 0;
        const distanceBonus = distanceM != null ? Math.exp(-distanceM / 5000) : 0;
        const cityBonus = args.city && org.city === args.city ? 1 : 0;

        const combined =
          W_VECTOR * best.bestScore +
          W_RATING * ratingBonus +
          W_DISTANCE * distanceBonus +
          W_CITY * cityBonus;

        return {
          orgId: org._id,
          slug: org.slug,
          name: org.name,
          score: combined,
          distanceM,
          isOpenNow: openNow,
          isOpenAt: openAt,
          snippet: best.snippet,
          openingHoursToday: openingHoursToday(org, now),
          averageRating: org.averageRating,
          reviewCount: org.reviewCount,
          beautyCategory: org.beautyCategory,
          industry: org.industry,
          city: org.city,
          neighborhood: org.neighborhood,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, RETURN_CANDIDATE_LIMIT);

    return { conversationId, candidates, timeIntent, history, availableCategories };
  },
});
