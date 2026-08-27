"use node";

// Mobile chat action — full RAG + Claude synthesis in a single round-trip.
//
// Flow:
//   1. Call marketplace.retrieve.retrieve (embeds query, vector search,
//      annotates opening hours, persists user turn).
//   2. Build the same system prompt used by the opus-mk chat route.
//   3. Call Claude (claude-haiku, non-streaming) with show_businesses tool.
//   4. Persist assistant turn.
//   5. Return { conversationId, text, recommendations }.
//
// The mobile client receives a complete response — no SSE needed.

import Anthropic from "@anthropic-ai/sdk";
import { v } from "convex/values";
import { action } from "../_generated/server";
import { api } from "../_generated/api";
import { Id } from "../_generated/dataModel";

const MAX_RESPONSE_TOKENS = 600;
const HISTORY_TURN_CAP = 6;

// ── Macedonian vocabulary block (same as opus-mk route) ───────────────────────
const MK_VOCAB = `
MACEDONIAN VOCABULARY — use ONLY these forms (never the Serbian/Bulgarian equivalents):
- "Се извинувам" NOT "Извинувам се" (SR)
- "Двете / двајцата" NOT "Обе / оба" (SR)
- "Еве" NOT "Ево" (SR)
- "Јас" NOT "Ја" (SR) or "Аз" (BG)
- "Тие" NOT "Они" (SR)
- "Каде" NOT "Где" (SR)
- "Зошто" NOT "Зашто" (SR)
- "Убаво" NOT "Лепо" (SR)
- "Денес" NOT "Данас" (SR) or "Днес" (BG)
- "Утре" NOT "Сутра" (SR)
- "Благодарам" NOT "Хвала" (SR) or "Благодаря" (BG)
- "Ве молам" NOT "Молим" (SR)
- "Резервација" or "Термин" for booking (both valid in MK)
- "Достапен" NOT "Slobodan" (SR)
- "Слободен термин" for available slot`.trim();

// ── Industry detection ────────────────────────────────────────────────────────

function deriveIndustry(
  query: string,
): "hospitality" | "beauty_wellness" | undefined {
  const q = query.toLowerCase();

  const hospitalityTerms = [
    "restaurant", "dinner", "lunch", "brunch", "breakfast", "date night",
    "eat", "eating", "food", "cafe", "bar", "pub", "table", "reservation",
    "drinks", "coffee", "cocktail", "wine", "dine", "dining", "bistro",
    "tavern", "grill", "pizza", "sushi", "burger",
    "ресторан", "вечера", "ручек", "маса", "кафе", "бар", "јадење",
    "пиење", "резервација на маса", "вино", "коктел",
  ];

  const beautyTerms = [
    "haircut", "hair cut", "barber", "barbershop", "nails", "nail",
    "salon", "massage", "spa", "facial", "eyebrow", "lash", "wax",
    "tattoo", "piercing", "manicure", "pedicure", "blowout", "coloring",
    "шишање", "фризер", "нокти", "масажа", "салон", "тетоважа",
    "пирсинг", "маникир", "педикир", "веѓи", "трепки",
  ];

  const isHospitality = hospitalityTerms.some((t) => q.includes(t));
  const isBeauty = beautyTerms.some((t) => q.includes(t));

  if (isHospitality && isBeauty) return undefined;
  if (isHospitality) return "hospitality";
  if (isBeauty) return "beauty_wellness";
  return undefined;
}

function detectLocale(query: string, fallback: string): string {
  return /[Ѐ-ӿ]/.test(query) ? "mk" : fallback;
}

// ── System prompt ─────────────────────────────────────────────────────────────

function buildSystemPrompt(
  city: string,
  locale: string,
  candidatesJson: string,
  timeHint: string,
  now: number,
  availableCategories: string[],
): string {
  const dateStr = new Date(now).toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Europe/Skopje",
  });

  const categoriesStr =
    availableCategories.length > 0
      ? availableCategories.map((c) => c.replace(/_/g, " ")).join(", ")
      : "beauty services";

  const languageInstruction =
    locale === "mk"
      ? `\nLanguage: Reply in standard Macedonian (Cyrillic):\n${MK_VOCAB}`
      : `\nLanguage: Reply in English.`;

  return `You are OPUS, a friendly local-discovery assistant.
Today: ${dateStr}. User location: ${city}.${languageInstruction}

CRITICAL STRICTNESS RULES:
1. OPUS is an INTERNATIONAL service. You are helping a user in ${city}. DO NOT assume they want recommendations in Macedonia.
2. ONLY recommend businesses from the SEARCH RESULTS that PERFECTLY match the user's specific request.
3. Cross-industry strictness: If the user asks for food/dining, DO NOT recommend beauty businesses. If they ask for haircut/nails, DO NOT recommend restaurants.
4. If SEARCH RESULTS contain irrelevant businesses, IGNORE THEM COMPLETELY.
5. If no businesses PERFECTLY match, apologize and say you couldn't find exactly what they're looking for in ${city}. State that OPUS currently features ${categoriesStr} in their area.
6. NEVER recommend external services (Google Maps, TripAdvisor, etc.).
7. If a business is marked hasTableAvailability: false, mention it may be fully booked and suggest calling ahead or trying another option.
8. If a business is marked hasTableAvailability: true, you can confidently say it has availability.

Write a SHORT conversational reply (2–4 sentences). Be warm, specific, and direct. Reference businesses by name.
${timeHint ? `Time context: ${timeHint}. If a business is closed at that time, mention it or skip it.` : ""}
Do NOT list businesses as bullet points — weave them naturally into prose.
Do NOT output JSON. Plain conversational text only.
When recommending businesses, you MUST call the show_businesses tool.

SEARCH RESULTS:
${candidatesJson}`;
}

// ── Candidate helpers ─────────────────────────────────────────────────────────

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
  venueType?: string;
  cuisine?: string[];
  openingHoursTomorrow?: { open: string; close: string };
  industry: string;
  city?: string;
  neighborhood?: string;
  hasTableAvailability?: boolean | null;
};

const SNIPPET_METADATA_PREFIXES = [
  "Type:", "Cuisine:", "Address:", "Location:", "Tags:",
  "Opening hours:", "Menu:", "## ", "- ",
];

function extractReason(snippet: string): string {
  const lines = snippet.split("\n").slice(1);
  const meaningful = lines.filter((line) => {
    const t = line.trim();
    return t.length > 0 && !SNIPPET_METADATA_PREFIXES.some((p) => t.startsWith(p));
  });
  return meaningful.slice(0, 2).join(" ").slice(0, 120);
}

function fmt12h(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "pm" : "am";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${h12}${period}` : `${h12}:${m.toString().padStart(2, "0")}${period}`;
}

function deriveNextOpens(c: Candidate): string | undefined {
  if (c.isOpenNow) return undefined;

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Belgrade",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(new Date());
  const nowMins =
    parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10) * 60 +
    parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);

  const toMins = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };

  if (c.openingHoursToday && toMins(c.openingHoursToday.open) > nowMins) {
    return `today ${fmt12h(c.openingHoursToday.open)}`;
  }
  if (c.openingHoursTomorrow) {
    return `tomorrow ${fmt12h(c.openingHoursTomorrow.open)}`;
  }
  return undefined;
}

function candidatesToContextJson(candidates: Candidate[]): string {
  const slim = candidates.map((c) => ({
    name: c.name,
    slug: c.slug,
    description: c.snippet.split("\n").slice(0, 4).join(" ").slice(0, 300),
    city: [c.neighborhood, c.city].filter(Boolean).join(", ") || undefined,
    rating:
      c.averageRating > 0
        ? `${c.averageRating.toFixed(1)}★ (${c.reviewCount} reviews)`
        : undefined,
    distanceKm:
      c.distanceM != null ? `${(c.distanceM / 1000).toFixed(1)}km away` : undefined,
    openNow: c.isOpenNow,
    openAt: c.isOpenAt,
    hours: c.openingHoursToday
      ? `${c.openingHoursToday.open}–${c.openingHoursToday.close}`
      : undefined,
    ...(c.industry === "hospitality" && c.hasTableAvailability != null
      ? { hasTableAvailability: c.hasTableAvailability }
      : {}),
  }));
  return JSON.stringify(slim, null, 0);
}

function deriveAvailabilityHint(
  candidate: Candidate,
  timeIntentKind: string,
): string | undefined {
  const closeToday = candidate.openingHoursToday?.close;
  const closeTomorrow = candidate.openingHoursTomorrow?.close;
  const openToday = candidate.openingHoursToday?.open;

  if (timeIntentKind === "now") {
    if (candidate.isOpenNow) {
      return closeToday ? `Closes at ${fmt12h(closeToday)}` : undefined;
    }
    return openToday ? `Opens at ${fmt12h(openToday)}` : "Currently closed";
  }
  if (timeIntentKind === "tonight") {
    if (candidate.isOpenAt === true) {
      return closeToday ? `Closes at ${fmt12h(closeToday)}` : undefined;
    }
    if (candidate.isOpenAt === false) return "Closed tonight";
  }
  if (timeIntentKind === "tomorrow") {
    if (candidate.isOpenAt === true) {
      return closeTomorrow ? `Closes at ${fmt12h(closeTomorrow)}` : undefined;
    }
    if (candidate.isOpenAt === false) return "Closed tomorrow";
  }
  // No time intent — show closing time if currently open, otherwise hours range
  if (candidate.isOpenNow && closeToday) {
    return `Closes at ${fmt12h(closeToday)}`;
  }
  if (openToday && closeToday) {
    return `Open ${fmt12h(openToday)} – ${fmt12h(closeToday)}`;
  }
  return undefined;
}

function timeHintFromKind(kind: string): string {
  if (kind === "now") return "User wants something right now.";
  if (kind === "tonight") return "User wants something tonight.";
  if (kind === "tomorrow") return "User wants something tomorrow.";
  if (kind === "iso") return "User specified a time today.";
  return "";
}

// ── Return type ───────────────────────────────────────────────────────────────

export type MobileRecommendation = {
  orgId: Id<"orgs">;
  slug: string;
  name: string;
  reason: string;
  availabilityHint?: string;
  averageRating: number;
  reviewCount: number;
  city?: string;
  distanceM?: number;
  isOpenNow: boolean;
  opensAt?: string;
  industry: string;
  beautyCategory?: string;
  venueType?: string;
  cuisine?: string[];
};

export type MobileChatResult = {
  conversationId: Id<"marketplace_conversations">;
  text: string;
  recommendations: MobileRecommendation[];
};

// ── Action ────────────────────────────────────────────────────────────────────

export const chat = action({
  args: {
    query: v.string(),
    sessionId: v.string(),
    coords: v.optional(v.object({ lat: v.number(), lng: v.number() })),
    city: v.optional(v.string()),
    locale: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<MobileChatResult> => {
    const trimmedQuery = args.query.trim().slice(0, 500);
    if (!trimmedQuery) throw new Error("query required");

    const industryHint = deriveIndustry(trimmedQuery);
    const detectedLocale = detectLocale(trimmedQuery, args.locale ?? "en");

    // 1. Retrieve (embeds query, vector search, persists user turn)
    const retrieveResult = await ctx.runAction(api.marketplace.retrieve.retrieve, {
      query: trimmedQuery,
      sessionId: args.sessionId,
      city: args.city,
      coords: args.coords,
      locale: detectedLocale,
      industry: industryHint,
    }) as {
      conversationId: Id<"marketplace_conversations">;
      candidates: Candidate[];
      timeIntent: { kind: string; at: number };
      partySize: number;
      history: Array<{ role: "user" | "assistant" | "system"; content: string }>;
      availableCategories: string[];
    };

    const {
      candidates,
      conversationId,
      timeIntent,
      history,
      availableCategories,
    } = retrieveResult;

    const topCandidates = candidates.slice(0, 4);
    const contextJson = candidatesToContextJson(topCandidates);
    const timeHintStr = timeHintFromKind(timeIntent.kind);

    const systemPrompt = buildSystemPrompt(
      args.city ?? "your area",
      detectedLocale,
      contextJson,
      timeHintStr,
      Date.now(),
      availableCategories,
    );

    const historyMessages: Anthropic.MessageParam[] = history
      .slice(-HISTORY_TURN_CAP)
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    // 2. Call Claude (non-streaming — mobile gets a complete response)
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) throw new Error("ANTHROPIC_API_KEY not set");
    const anthropic = new Anthropic({ apiKey: anthropicKey });

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: MAX_RESPONSE_TOKENS,
      system: systemPrompt,
      tools: [
        {
          name: "show_businesses",
          description:
            "Use this tool to display specific businesses to the user. " +
            "ONLY include slugs of businesses that PERFECTLY match the user's intent. " +
            "If none match, call it with an empty slugs array.",
          input_schema: {
            type: "object" as const,
            properties: {
              slugs: {
                type: "array",
                items: { type: "string" },
                description: "Slugs of the businesses to display.",
              },
            },
            required: ["slugs"],
          },
        },
      ],
      messages: [
        ...historyMessages,
        { role: "user", content: trimmedQuery },
      ],
    });

    let fullText = "";
    let recommendedSlugs: string[] = [];

    for (const block of response.content) {
      if (block.type === "text") {
        fullText += block.text;
      } else if (block.type === "tool_use" && block.name === "show_businesses") {
        const input = block.input as { slugs: string[] };
        recommendedSlugs = input.slugs ?? [];
      }
    }

    // 3. Build recommendations
    const finalCandidates = topCandidates.filter((c) =>
      recommendedSlugs.includes(c.slug),
    );

    const recommendations: MobileRecommendation[] = finalCandidates.map((c) => ({
      orgId: c.orgId,
      slug: c.slug,
      name: c.name,
      reason: extractReason(c.snippet),
      availabilityHint: deriveAvailabilityHint(c, timeIntent.kind),
      averageRating: c.averageRating,
      reviewCount: c.reviewCount,
      city: c.city,
      distanceM: c.distanceM,
      isOpenNow: c.isOpenNow,
      opensAt: deriveNextOpens(c),
      industry: c.industry,
      beautyCategory: c.beautyCategory,
      venueType: c.venueType,
      cuisine: c.cuisine,
    }));

    // 4. Persist assistant turn before returning
    await ctx.runMutation(api.marketplace.messages.persistAssistantTurn, {
      conversationId,
      content: fullText,
      recommendations: recommendations.map((r) => ({
        orgId: r.orgId,
        slug: r.slug,
        reason: r.reason,
        availabilityHint: r.availabilityHint,
      })),
      model: "claude-haiku-4-5-20251001",
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    });

    return { conversationId, text: fullText, recommendations };
  },
});
