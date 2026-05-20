// POST /api/chat
// Body: { query, sessionId, city?, coords?, locale? }
// Response: Server-Sent Events stream
//
// Event types:
//   data: {"type":"text","text":"..."} — streamed Claude prose
//   data: {"type":"recommendations","data":[...]} — after text stream ends
//   data: {"type":"done"} — terminal event
//   data: {"type":"error","message":"..."} — on failure
//
// Architecture: this route calls the Convex retrieve action (which embeds the
// query + does vectorSearch), then streams Anthropic Claude for the conversational
// response. Retrieve already persists the user turn. This route fires-and-forgets
// persistAssistantTurn after Claude finishes.

import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

const MAX_QUERY_CHARS = 500;
const MAX_BODY_BYTES = 2048;
const MAX_RESPONSE_TOKENS = 800; // bumped from 500 — needed for multi-recommendation prose
const HISTORY_TURN_CAP = 6;      // last 3 exchanges — prevents token creep on long sessions

// ── mk vocab block — copied verbatim from convex/ai/agent.ts
// Do NOT paraphrase; these linguistic choices are intentional for Macedonian correctness.
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
- "Да" / "Не" (same in MK — OK)
- "Резервација" or "Термин" for booking (both valid in MK)
- "Достапен" NOT "Slobodan" (SR)
- "Слободен термин" for available slot`.trim();

// ── Industry detection ─────────────────────────────────────────────────────────
// Runs before retrieve so the vector search is scoped to the correct vertical.
// Returns undefined for ambiguous queries — retrieve will search all industries.

function deriveIndustry(
  query: string,
): "hospitality" | "beauty_wellness" | undefined {
  const q = query.toLowerCase();

  const hospitalityTerms = [
    // English
    "restaurant", "dinner", "lunch", "brunch", "breakfast", "date night",
    "eat", "eating", "food", "cafe", "bar", "pub", "table", "reservation",
    "drinks", "coffee", "cocktail", "wine", "dine", "dining", "bistro",
    "tavern", "grill", "pizza", "sushi", "burger",
    // Macedonian
    "ресторан", "вечера", "ручек", "маса", "кафе", "бар", "јадење",
    "пиење", "резервација на маса", "вино", "коктел",
  ];

  const beautyTerms = [
    // English
    "haircut", "hair cut", "barber", "barbershop", "nails", "nail",
    "salon", "massage", "spa", "facial", "eyebrow", "lash", "wax",
    "tattoo", "piercing", "manicure", "pedicure", "blowout", "coloring",
    // Macedonian
    "шишање", "фризер", "нокти", "масажа", "салон", "тетоважа",
    "пирсинг", "маникир", "педикир", "веѓи", "трепки",
  ];

  const isHospitality = hospitalityTerms.some((t) => q.includes(t));
  const isBeauty = beautyTerms.some((t) => q.includes(t));

  // If both match (edge case: "dinner after my haircut") — return undefined,
  // let retrieve search all and Claude sort it out with the cross-industry rules.
  if (isHospitality && isBeauty) return undefined;
  if (isHospitality) return "hospitality";
  if (isBeauty) return "beauty_wellness";
  return undefined;
}

// ── Locale detection ───────────────────────────────────────────────────────────
// Server-side Cyrillic detection is more reliable than asking Claude to detect
// language from short or ambiguous queries like "date night".

function detectLocale(query: string, fallback: string): string {
  return /[\u0400-\u04FF]/.test(query) ? "mk" : fallback;
}

// ── System prompt ──────────────────────────────────────────────────────────────

function buildSystemPrompt(
  city: string,
  locale: string,
  candidatesJson: string,
  timeHint: string,
  now: number,
  availableCategories: string[] = [],
): string {
  const dateStr = new Date(now).toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Europe/Skopje",
  });

  const categoriesStr =
    availableCategories && availableCategories.length > 0
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

// ── Candidate serialisation ────────────────────────────────────────────────────

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
  hasTableAvailability?: boolean | null; // hospitality only, null = unknown
};

const SNIPPET_METADATA_PREFIXES = [
  "Type:", "Cuisine:", "Address:", "Location:", "Tags:",
  "Opening hours:", "Menu:", "## ", "- ",
];

function extractReason(snippet: string): string {
  const lines = snippet.split("\n").slice(1); // skip name on line 0
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

  // Current Skopje time in minutes since midnight
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

  // Opens later today?
  if (c.openingHoursToday && toMins(c.openingHoursToday.open) > nowMins) {
    return `today ${fmt12h(c.openingHoursToday.open)}`;
  }

  // Opens tomorrow?
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
    // Only include for hospitality — avoids confusing Claude for beauty businesses
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
  if (timeIntentKind === "now") {
    return candidate.isOpenNow ? "Open now" : "Currently closed";
  }
  if (timeIntentKind === "tonight") {
    if (candidate.isOpenAt === true) return "Open tonight";
    if (candidate.isOpenAt === false) return "Closed tonight";
  }
  if (timeIntentKind === "tomorrow") {
    if (candidate.isOpenAt === true) return "Open tomorrow";
    if (candidate.isOpenAt === false) return "Closed tomorrow";
  }
  if (candidate.openingHoursToday) {
    return `Open ${candidate.openingHoursToday.open}–${candidate.openingHoursToday.close}`;
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

// ── Route handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength) > MAX_BODY_BYTES) {
    return new Response("Request too large", { status: 413 });
  }

  let body: {
    query: string;
    sessionId: string;
    city?: string | null;
    coords?: { lat: number; lng: number } | null;
    locale?: string;
  };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const { query, sessionId, coords, locale = "en", city } = body;

  if (!query?.trim() || !sessionId) {
    return new Response("query and sessionId required", { status: 400 });
  }

  if (!city) {
    return new Response(
      "Location access is required to find businesses near you.",
      { status: 400 },
    );
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!convexUrl || !anthropicKey) {
    return new Response("Server misconfigured", { status: 500 });
  }

  const encoder = new TextEncoder();
  function sse(obj: object): Uint8Array {
    return encoder.encode(`data: ${JSON.stringify(obj)}\n\n`);
  }

  const stream = new ReadableStream({
    async start(controller) {
      const convex = new ConvexHttpClient(convexUrl);
      const anthropic = new Anthropic({ apiKey: anthropicKey });

      // ── Derive intent before hitting Convex ──────────────────────────────
      const trimmedQuery = query.trim();
      const industryHint = deriveIndustry(trimmedQuery);
      const detectedLocale = detectLocale(trimmedQuery, locale);

      // 1. Retrieve candidates (+ persists user turn in Convex)
      let retrieveResult: Awaited<
        ReturnType<typeof convex.action<typeof api.marketplace.retrieve.retrieve>>
      >;
      try {
        retrieveResult = await convex.action(api.marketplace.retrieve.retrieve, {
          query: trimmedQuery.slice(0, MAX_QUERY_CHARS),
          sessionId,
          city: city || undefined,
          coords: coords ?? undefined,
          locale: detectedLocale,
          industry: industryHint, // ← scopes vector search to correct vertical
        });
      } catch {
        controller.enqueue(
          sse({ type: "error", message: "Search unavailable. Please try again." }),
        );
        controller.enqueue(sse({ type: "done" }));
        controller.close();
        return;
      }

      const {
        candidates,
        conversationId,
        timeIntent,
        history,
        availableCategories,
        partySize, // new field from retrieve — used for bookingIntent
      } = retrieveResult;

      const topCandidates = (candidates as Candidate[]).slice(0, 4);
      const contextJson = candidatesToContextJson(topCandidates);
      const timeHintStr = timeHintFromKind(timeIntent.kind);

      const systemPrompt = buildSystemPrompt(
        city || "Unknown Location",
        detectedLocale,
        contextJson,
        timeHintStr,
        Date.now(),
        availableCategories,
      );

      // Cap history to last N turns to prevent token creep on long sessions
      const historyMessages: Anthropic.MessageParam[] = history
        .slice(-HISTORY_TURN_CAP)
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));

      // 2. Stream Anthropic prose response
      let fullText = "";
      let recommendedSlugs: string[] | null = null;
      let bookingIntent: {
        isoDate?: string;
        time?: string;
        partySize?: number;
      } | null = null;

      try {
        const claudeStream = anthropic.messages.stream({
          model: "claude-haiku-4-5-20251001",
          max_tokens: MAX_RESPONSE_TOKENS,
          system: systemPrompt,
          tools: [
            {
              name: "show_businesses",
              description:
                "Use this tool to display specific businesses to the user in the UI. " +
                "You MUST call this tool if you are recommending any businesses. " +
                "ONLY include the slugs of businesses that PERFECTLY match the user's intent. " +
                "If none match, call it with an empty slugs array. " +
                "If the user expressed a specific date, time, or party size, populate bookingIntent " +
                "so the booking flow can be pre-filled.",
              input_schema: {
                type: "object" as const,
                properties: {
                  slugs: {
                    type: "array",
                    items: { type: "string" },
                    description: "Slugs of the businesses to display.",
                  },
                  bookingIntent: {
                    type: "object",
                    description:
                      "Pre-fill the booking flow. Only populate fields the user explicitly stated.",
                    properties: {
                      isoDate: {
                        type: "string",
                        description: "Date in YYYY-MM-DD format.",
                      },
                      time: {
                        type: "string",
                        description: "Time in HH:MM 24h format.",
                      },
                      partySize: {
                        type: "integer",
                        description: "Number of guests.",
                      },
                    },
                  },
                },
                required: ["slugs"],
              },
            },
          ],
          messages: [
            ...historyMessages,
            { role: "user", content: trimmedQuery.slice(0, MAX_QUERY_CHARS) },
          ],
        });

        for await (const event of claudeStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            const chunk = event.delta.text;
            fullText += chunk;
            controller.enqueue(sse({ type: "text", text: chunk }));
          }
        }

        const finalMessage = await claudeStream.finalMessage();
        const usage = finalMessage.usage;

        for (const block of finalMessage.content) {
          if (block.type === "tool_use" && block.name === "show_businesses") {
            const input = block.input as {
              slugs: string[];
              bookingIntent?: {
                isoDate?: string;
                time?: string;
                partySize?: number;
              };
            };
            recommendedSlugs = input.slugs || [];
            bookingIntent = input.bookingIntent ?? null;
          }
        }

        // 3. Build recommendation payload with pre-filled booking URLs
        const finalCandidates = recommendedSlugs
          ? topCandidates.filter((c) => recommendedSlugs?.includes(c.slug))
          : [];

        const recData = finalCandidates.map((c) => {
          // Build booking URL — pre-fill if Claude extracted intent
          const bookingParams = new URLSearchParams();
          if (bookingIntent?.isoDate) bookingParams.set("date", bookingIntent.isoDate);
          if (bookingIntent?.time) bookingParams.set("time", bookingIntent.time);
          // partySize: prefer what Claude extracted, fall back to retrieve's extraction
          const resolvedPartySize = bookingIntent?.partySize ?? (partySize as number | undefined);
          if (resolvedPartySize) bookingParams.set("party", String(resolvedPartySize));
          const bookingQuery = bookingParams.toString();
          const bookingUrl = bookingQuery
            ? `/${c.slug}/book?${bookingQuery}`
            : `/${c.slug}/book`;

          return {
            orgId: c.orgId,
            slug: c.slug,
            name: c.name,
            reason: extractReason(c.snippet),
            venueType: c.venueType,
            cuisine: c.cuisine,
            availabilityHint: deriveAvailabilityHint(c, timeIntent.kind),
            averageRating: c.averageRating,
            reviewCount: c.reviewCount,
            city: c.city,
            distanceM: c.distanceM,
            isOpenNow: c.isOpenNow,
            closesAt: c.isOpenNow ? (c.openingHoursToday?.close ?? null) : null,
            opensAt: deriveNextOpens(c) ?? null,
            hasTableAvailability: c.hasTableAvailability ?? null,
            bookingUrl,
          };
        });

        controller.enqueue(sse({ type: "recommendations", data: recData }));
        controller.enqueue(sse({ type: "done" }));

        // 4. Fire-and-forget persist assistant turn
        void convex
          .mutation(api.marketplace.messages.persistAssistantTurn, {
            conversationId,
            content: fullText,
            recommendations: recData.map((r) => ({
              orgId: r.orgId,
              slug: r.slug,
              reason: r.reason,
              availabilityHint: r.availabilityHint,
            })),
            model: "claude-haiku-4-5-20251001",
            inputTokens: usage.input_tokens,
            outputTokens: usage.output_tokens,
          })
          .catch(() => { });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "AI unavailable";
        controller.enqueue(sse({ type: "error", message: msg }));
        controller.enqueue(sse({ type: "done" }));
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}