"use node";

// Marketplace retrieve action — the heart of the RAG pipeline.
//
// Flow:
//   1. extractTimeIntent (regex) — translate "now"/"tonight"/"tomorrow"/HH:MM
//      into a concrete Europe/Skopje timestamp before retrieval.
//   2. extractPartySize (regex) — detect party size from query for hospitality.
//   3. embed query via OpenAI text-embedding-3-small.
//   4. 3× parallel vectorSearch (entityType: org / service / reputation).
//      Convex vectorSearch filter supports a single eq, so we filter by
//      entityType at search time and post-filter isPublished/city/industry.
//   5. Resolve embedding rows → orgs, dedupe by orgId, keep best score.
//   6. Haversine distance from coords (when granted).
//   7. isOpenNow / isOpenAt(intentTime) annotation.
//   8. hasTableAvailability annotation for hospitality candidates when
//      timeIntent is not "none" (checks actual reservation slots, not just hours).
//   9. Combined re-rank: vector score + rating bonus + distance bonus.
//  10. Persist user turn, return top N candidates + history + timeIntent + partySize.
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

// Re-rank weights. Vector score is 0..1; rating/distance are normalised.
// W_CITY removed: city is already a hard post-filter, so a bonus would apply
// uniformly to all surviving candidates and add nothing to the ranking.
const W_VECTOR = 1.0;
const W_RATING = 0.15;   // averageRating / 5
const W_DISTANCE = 0.25; // exp(-d/5km)

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

// ── Party size extraction ──────────────────────────────────────────────────────
// Runs before the retrieve call so the result is available for:
//   - table availability check (slot capacity filtering)
//   - bookingIntent pre-fill in the chat route
//
// Returns 2 as a safe default for hospitality queries.

export function extractPartySize(query: string): number {
  // Explicit digit patterns: "table for 4", "4 people", "party of 6"
  const digitMatch = query.match(
    /\b(\d{1,2})\s*(?:person|people|guests?|of us|pax|места|лица|луѓе|особи)\b/i,
  );
  if (digitMatch) return Math.min(parseInt(digitMatch[1], 10), 20);

  // "party of N"
  const partyOfMatch = query.match(/party\s+of\s+(\d{1,2})/i);
  if (partyOfMatch) return Math.min(parseInt(partyOfMatch[1], 10), 20);

  // Word numbers — English + Macedonian
  if (/\b(two|couple|двајца|двете|нас двајца|нас две)\b/i.test(query)) return 2;
  if (/\b(three|тројца|нас тројца)\b/i.test(query)) return 3;
  if (/\b(four|четворица|нас четворица)\b/i.test(query)) return 4;
  if (/\b(five|петмина)\b/i.test(query)) return 5;
  if (/\b(six|шестмина)\b/i.test(query)) return 6;

  return 2; // safe default for hospitality
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
  hasTableAvailability?: boolean | null; // hospitality only; null = check skipped
};

export const retrieve = action({
  args: {
    query: v.string(),
    sessionId: v.string(),
    coords: v.optional(
      v.object({
        lat: v.number(),
        lng: v.number(),
      }),
    ),
    city: v.optional(v.string()),
    industry: v.optional(
      v.union(v.literal("beauty_wellness"), v.literal("hospitality")),
    ),
    locale: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    conversationId: Id<"marketplace_conversations">;
    candidates: Candidate[];
    timeIntent: TimeIntent;
    partySize: number;
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

    // 2. Party size — used for availability check and returned to chat route
    //    for bookingIntent pre-fill. Only meaningful for hospitality but cheap
    //    to compute for all queries.
    const partySize = extractPartySize(trimmedQuery);

    // 3. Conversation row (idempotent)
    const conversationId: Id<"marketplace_conversations"> =
      await ctx.runMutation(
        internal.marketplace.conversations.getOrCreateBySessionInternal,
        {
          sessionId: args.sessionId,
          initialCity: args.city,
          initialCoords: args.coords,
          locale: args.locale,
        },
      );

    // 4. History (chronological, last ~10 turns)
    const history = await ctx.runQuery(
      internal.marketplace.messages.recentForContext,
      { conversationId, take: 10 },
    );

    // 5. Persist the user turn FIRST so retries don't drop it.
    await ctx.runMutation(
      internal.marketplace.messages.persistUserTurnInternal,
      {
        conversationId,
        content: trimmedQuery,
      },
    );

    // 6. Embed query
    const client = getOpenAI();
    const vector = await embedQuery(client, trimmedQuery);

    // 7. 3× parallel vectorSearch
    const [orgHits, serviceHits, repHits]: [
      EmbeddingHit[],
      EmbeddingHit[],
      EmbeddingHit[],
    ] = await Promise.all([
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

    // 7.5 Available categories for the fallback message
    const availableCategories = await ctx.runQuery(
      internal.marketplace.retrieveHelpers.getAvailableCategories,
      { city: args.city },
    );

    if (allHits.length === 0) {
      return {
        conversationId,
        candidates: [],
        timeIntent,
        partySize,
        history,
        availableCategories,
      };
    }

    // 8. Fetch the embedding rows (vectorSearch returns _id + _score only)
    const embeddingDocs: Array<Doc<"marketplace_embeddings">> =
      await ctx.runQuery(
        internal.marketplace.retrieveHelpers.getEmbeddingsByIds,
        { ids: allHits.map((h) => h._id) },
      );

    // Map hit metadata onto rows
    const scoreById = new Map<string, { score: number; weight: number }>();
    for (const h of allHits) {
      scoreById.set(h._id, { score: h._score, weight: h.weight });
    }

    // 9. Filter (post-search) by isPublished, industry, and city.
    //    City is a strict filter to prevent out-of-location hallucinations.
    //    Industry filter is applied when passed — scopes to the correct vertical.
    const filtered = embeddingDocs.filter((row) => {
      if (!row.isPublished) return false;
      if (args.industry && row.industry !== args.industry) return false;
      if (args.city && row.city?.toLowerCase() !== args.city.toLowerCase())
        return false;
      return true;
    });

    // 10. Group by orgId, keep best (score × weight). Track best snippet.
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
      return {
        conversationId,
        candidates: [],
        timeIntent,
        partySize,
        history,
        availableCategories,
      };
    }

    // 11. Resolve to org rows
    const orgIds = [...bestByOrg.values()].map((b) => b.orgId);
    const orgs: Array<Doc<"orgs">> = await ctx.runQuery(
      internal.marketplace.retrieveHelpers.getOrgsByIds,
      { orgIds },
    );

    // 12. Build candidates with annotations + combined score
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

        const ratingBonus =
          org.reviewCount > 0 ? (org.averageRating || 0) / 5 : 0;
        const distanceBonus =
          distanceM != null ? Math.exp(-distanceM / 5000) : 0;

        // W_CITY removed: city is already a hard filter above, so every
        // surviving candidate is in the right city — the bonus would be
        // uniform and contribute nothing to relative ranking.
        const combined =
          W_VECTOR * best.bestScore +
          W_RATING * ratingBonus +
          W_DISTANCE * distanceBonus;

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
          // Table availability is annotated in step 13 for hospitality candidates.
          hasTableAvailability: null,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, RETURN_CANDIDATE_LIMIT);

    // 13. Annotate hospitality candidates with real table availability.
    //     Only runs when timeIntent is not "none" — no point checking if the
    //     user hasn't expressed a time. Runs as a single batched query.
    const hospitalityCandidates = candidates.filter(
      (c) => c.industry === "hospitality",
    );

    if (hospitalityCandidates.length > 0 && timeIntent.kind !== "none") {
      try {
        const availabilityResults: Array<{
          orgId: Id<"orgs">;
          hasAvailability: boolean;
        }> = await ctx.runQuery(
          internal.marketplace.retrieveHelpers.checkTableAvailability,
          {
            orgIds: hospitalityCandidates.map((c) => c.orgId),
            atTime: timeIntent.at,
            partySize,
          },
        );

        const availMap = new Map(
          availabilityResults.map((r) => [r.orgId, r.hasAvailability]),
        );
        for (const c of candidates) {
          if (c.industry === "hospitality") {
            const available = availMap.get(c.orgId);
            // Keep null when the org wasn't in the result set (shouldn't happen
            // but defensive — avoids false "no availability" signals).
            if (available !== undefined) {
              c.hasTableAvailability = available;
            }
          }
        }
      } catch {
        // Availability check is best-effort — don't fail the whole retrieve.
        // Candidates keep hasTableAvailability: null, Claude treats as unknown.
      }
    }

    return {
      conversationId,
      candidates,
      timeIntent,
      partySize,
      history,
      availableCategories,
    };
  },
});