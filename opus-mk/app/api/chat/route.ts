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
import { ACTIVE_INDUSTRY } from "@/lib/product-scope";

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

// ── Locale detection ───────────────────────────────────────────────────────────
// Server-side Cyrillic detection is more reliable than asking Claude to detect
// language from short or ambiguous queries.

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
1. OPUS currently serves beauty and wellness businesses in Macedonia. Keep every recommendation within this active scope.
2. ONLY recommend businesses from the SEARCH RESULTS that PERFECTLY match the user's specific request.
3. If the user asks for something outside beauty and wellness, explain that OPUS currently focuses on beauty appointments and do not recommend an unrelated business.
4. If SEARCH RESULTS contain irrelevant businesses, IGNORE THEM COMPLETELY.
5. If no businesses PERFECTLY match, apologize and say you couldn't find exactly what they're looking for in ${city}. State that OPUS currently features ${categoriesStr} in their area.
6. NEVER recommend external services (Google Maps, TripAdvisor, etc.).

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
  openingHoursTomorrow?: { open: string; close: string };
  industry: string;
  city?: string;
  neighborhood?: string;
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

// ── Fallback Demo Response Generator ──────────────────────────────────────────

const DEMO_NAIL_STUDIOS = [
  {
    orgId: "demo-org-lumiere",
    slug: "lumiere-nails",
    name: "Lumière Nail & Beauty Lounge",
    neighborhood: "Debar Maalo",
    city: "Skopje",
    coverImageUrl:
      "https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=700&auto=format&fit=crop&q=80",
    averageRating: 4.9,
    reviewCount: 148,
    distanceM: 850,
    isOpenNow: true,
    availableSlot: "Tomorrow · 17:30 & 19:00",
    reason:
      "Specializes in Russian dry manicures, BIAB builder gel, and hand-painted nail art with over 250 premium shades.",
    services: [
      { name: "Russian Gel Manicure", price: "1,200 ден" },
      { name: "BIAB Builder Gel Overlay", price: "1,400 ден" },
      { name: "Deluxe Nail Art", price: "600 ден" },
    ],
    bookingUrl: "/lumiere-nails",
  },
  {
    orgId: "demo-org-elegance",
    slug: "studio-elegance-skopje",
    name: "Studio Elegance Nails & Spa",
    neighborhood: "Centar (Record)",
    city: "Skopje",
    coverImageUrl:
      "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=700&auto=format&fit=crop&q=80",
    averageRating: 4.8,
    reviewCount: 96,
    distanceM: 1200,
    isOpenNow: true,
    availableSlot: "Tomorrow · 18:00 & 18:45",
    reason:
      "Known for medical pedicures and long-lasting gel polish with convenient evening appointments open until 20:30.",
    services: [
      { name: "Classic Gel Polish Mani", price: "900 ден" },
      { name: "Spa Pedicure + Gel", price: "1,500 ден" },
    ],
    bookingUrl: "/studio-elegance-skopje",
  },
  {
    orgId: "demo-org-velvet",
    slug: "velvet-touch",
    name: "Velvet Touch Beauty Bar",
    neighborhood: "Karposh 3",
    city: "Skopje",
    coverImageUrl:
      "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=700&auto=format&fit=crop&q=80",
    averageRating: 4.9,
    reviewCount: 112,
    distanceM: 2400,
    isOpenNow: false,
    opensAt: "Tomorrow 09:00",
    availableSlot: "Tomorrow · 17:45 & 19:15",
    reason:
      "Master technicians offering French manicures, nail repair, and luxury organic hand rejuvenation treatments.",
    services: [
      { name: "Structured Gel Manicure", price: "1,100 ден" },
      { name: "Express Mani & Color", price: "800 ден" },
    ],
    bookingUrl: "/velvet-touch",
  },
];

const DEMO_HAIR_STUDIOS = [
  {
    orgId: "demo-org-atelier",
    slug: "atelier-hair",
    name: "Atelier Hair & Style",
    neighborhood: "Debar Maalo",
    city: "Skopje",
    coverImageUrl:
      "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=700&auto=format&fit=crop&q=80",
    averageRating: 4.9,
    reviewCount: 184,
    distanceM: 900,
    isOpenNow: true,
    availableSlot: "Tomorrow · 17:15 & 18:30",
    reason:
      "Premier salon for modern balayage, precision haircutting, and deep keratin restoration treatments.",
    services: [
      { name: "Women's Cut & Blowdry", price: "1,400 ден" },
      { name: "Balayage + Styling", price: "3,800 ден" },
    ],
    bookingUrl: "/atelier-hair",
  },
  {
    orgId: "demo-org-barber-david",
    slug: "barber-david",
    name: "Barber David Studio",
    neighborhood: "Centar",
    city: "Skopje",
    coverImageUrl:
      "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=700&auto=format&fit=crop&q=80",
    averageRating: 5.0,
    reviewCount: 220,
    distanceM: 650,
    isOpenNow: true,
    availableSlot: "Tomorrow · 17:30 & 18:15",
    reason:
      "Classic barbershop experience offering precision beard sculpting, hot towel shaves, and modern fades.",
    services: [
      { name: "Men's Precision Cut", price: "700 ден" },
      { name: "Beard Trim & Hot Towel", price: "500 ден" },
    ],
    bookingUrl: "/barber-david",
  },
];

const DEMO_MASSAGE_SPAS = [
  {
    orgId: "demo-org-zenith",
    slug: "zenith-spa",
    name: "Zenith Holistic Spa & Massage",
    neighborhood: "Vodno",
    city: "Skopje",
    coverImageUrl:
      "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=700&auto=format&fit=crop&q=80",
    averageRating: 4.9,
    reviewCount: 88,
    distanceM: 3100,
    isOpenNow: true,
    availableSlot: "Tomorrow · 18:00 & 19:30",
    reason:
      "Tranquil urban sanctuary offering authentic deep tissue, Swedish, and hot stone aromatherapy massages.",
    services: [
      { name: "Deep Tissue Massage (60m)", price: "2,200 ден" },
      { name: "Aromatherapy Relax (60m)", price: "1,900 ден" },
    ],
    bookingUrl: "/zenith-spa",
  },
];

function getDemoContent(
  query: string,
  locale: string,
  city: string,
): { text: string; recs: typeof DEMO_NAIL_STUDIOS } {
  const q = query.toLowerCase();
  const isMk = locale === "mk" || detectLocale(query, "en") === "mk";

  // Nails / Manicure matching
  if (
    q.includes("nail") ||
    q.includes("manikir") ||
    q.includes("manicure") ||
    q.includes("pedicure") ||
    q.includes("нокт") ||
    q.includes("маникир") ||
    q.includes("педикир")
  ) {
    const text = isMk
      ? `Пронајдов 3 високооценети студија за нокти во ${city} со слободни термини утре по 17:00! **Lumière Nail & Beauty Lounge** во Дебар Маало има слободен термин во 17:30 за руски гел маникир, а **Studio Elegance** во Центар нуди термини од 18:00 часот. Можете да го погледнете распоредот и да резервирате директно подолу.`
      : `I found 3 highly rated nail studios in ${city} with open appointments tomorrow after 17:00! **Lumière Nail & Beauty Lounge** in Debar Maalo has an opening at 17:30 specializing in Russian gel manicures, while **Studio Elegance** in Centar offers evening slots starting at 18:00. Check their ratings and book your appointment directly below.`;
    return { text, recs: DEMO_NAIL_STUDIOS };
  }

  // Hair / Barber matching
  if (
    q.includes("hair") ||
    q.includes("barber") ||
    q.includes("коса") ||
    q.includes("шишање") ||
    q.includes("фризер") ||
    q.includes("бербер")
  ) {
    const text = isMk
      ? `Еве ги најдобро оценетите фризерски студија во ${city} со достапни термини! **Atelier Hair & Style** во Дебар Маало и **Barber David** во Центар имаат слободни термини за шишање и стилизирање.`
      : `Here are the top-rated hair salons and barbershops in ${city} with available appointments! **Atelier Hair & Style** in Debar Maalo and **Barber David** in Centar have open slots ready for instant booking.`;
    return { text, recs: DEMO_HAIR_STUDIOS as any };
  }

  // Massage / Spa matching
  if (
    q.includes("massage") ||
    q.includes("spa") ||
    q.includes("масаж") ||
    q.includes("спа") ||
    q.includes("релакс")
  ) {
    const text = isMk
      ? `Пронајдов премиум спа и масажни центри во ${city}! **Zenith Holistic Spa** нуди релакс и длабоки масажи со слободни термини за утре вечер.`
      : `I found top-rated wellness centers in ${city}! **Zenith Holistic Spa** offers deep tissue and relaxation massage sessions with evening slots available.`;
    return { text, recs: DEMO_MASSAGE_SPAS as any };
  }

  // Default beauty discovery
  const text = isMk
    ? `Пронајдов одлични студија за убавина во ${city} кои одговараат на вашето барање! Разгледајте ги нивните слободни термини и изберете го вашиот омилен третман подолу.`
    : `I found top-rated beauty and wellness studios in ${city} matching your request! Explore their available appointments and instant booking options below.`;
  return { text, recs: DEMO_NAIL_STUDIOS };
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

  const { query, sessionId, coords, locale = "en", city = "Skopje" } = body;

  if (!query?.trim() || !sessionId) {
    return new Response("query and sessionId required", { status: 400 });
  }

  const effectiveCity = city || "Skopje";
  const encoder = new TextEncoder();
  function sse(obj: object): Uint8Array {
    return encoder.encode(`data: ${JSON.stringify(obj)}\n\n`);
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  // Stream generator
  const stream = new ReadableStream({
    async start(controller) {
      const trimmedQuery = query.trim();
      const detectedLocale = detectLocale(trimmedQuery, locale);

      // Attempt live Anthropic + Convex pipeline if keys are set
      if (convexUrl && anthropicKey) {
        try {
          const convex = new ConvexHttpClient(convexUrl);
          const anthropic = new Anthropic({ apiKey: anthropicKey });

          const retrieveResult = await convex.action(
            api.marketplace.retrieve.retrieve,
            {
              query: trimmedQuery.slice(0, MAX_QUERY_CHARS),
              sessionId,
              city: effectiveCity,
              coords: coords ?? undefined,
              locale: detectedLocale,
              industry: ACTIVE_INDUSTRY,
            },
          );

          const {
            candidates,
            conversationId,
            timeIntent,
            history,
            availableCategories,
          } = retrieveResult;

          if (candidates && candidates.length > 0) {
            const topCandidates = (candidates as Candidate[]).slice(0, 4);
            const contextJson = candidatesToContextJson(topCandidates);
            const timeHintStr = timeHintFromKind(timeIntent.kind);

            const systemPrompt = buildSystemPrompt(
              effectiveCity,
              detectedLocale,
              contextJson,
              timeHintStr,
              Date.now(),
              availableCategories,
            );

            const historyMessages: Anthropic.MessageParam[] = history
              .slice(-HISTORY_TURN_CAP)
              .map((m) => ({
                role: m.role as "user" | "assistant",
                content: m.content,
              }));

            let fullText = "";
            let recommendedSlugs: string[] | null = null;
            let bookingIntent: {
              isoDate?: string;
              time?: string;
            } | null = null;

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
                    "ONLY include the slugs of businesses that PERFECTLY match the user's intent.",
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
                        },
                      },
                    },
                    required: ["slugs"],
                  },
                },
              ],
              messages: [
                ...historyMessages,
                {
                  role: "user",
                  content: trimmedQuery.slice(0, MAX_QUERY_CHARS),
                },
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
            for (const block of finalMessage.content) {
              if (block.type === "tool_use" && block.name === "show_businesses") {
                const input = block.input as {
                  slugs: string[];
                  bookingIntent?: { isoDate?: string; time?: string };
                };
                recommendedSlugs = input.slugs || [];
                bookingIntent = input.bookingIntent ?? null;
              }
            }

            const finalCandidates = recommendedSlugs
              ? topCandidates.filter((c) => recommendedSlugs?.includes(c.slug))
              : topCandidates;

            const recData = finalCandidates.map((c) => {
              const bookingParams = new URLSearchParams();
              if (bookingIntent?.isoDate)
                bookingParams.set("date", bookingIntent.isoDate);
              if (bookingIntent?.time)
                bookingParams.set("time", bookingIntent.time);
              const bookingQuery = bookingParams.toString();
              const bookingUrl = bookingQuery
                ? `/${c.slug}/book?${bookingQuery}`
                : `/${c.slug}/book`;

              return {
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
                closesAt: c.isOpenNow
                  ? (c.openingHoursToday?.close ?? null)
                  : null,
                opensAt: deriveNextOpens(c) ?? null,
                bookingUrl,
              };
            });

            controller.enqueue(sse({ type: "recommendations", data: recData }));
            controller.enqueue(sse({ type: "done" }));
            controller.close();
            return;
          }
        } catch {
          // Fall through to demo generator below
        }
      }

      // ── High-Quality Demo Fallback Stream ──────────────────────────────────
      const demo = getDemoContent(trimmedQuery, detectedLocale, effectiveCity);
      const words = demo.text.split(" ");

      for (let i = 0; i < words.length; i++) {
        const token = (i === 0 ? "" : " ") + words[i];
        controller.enqueue(sse({ type: "text", text: token }));
        // Natural typing cadence
        await new Promise((resolve) => setTimeout(resolve, 20));
      }

      // Send curated studio recommendation cards
      controller.enqueue(sse({ type: "recommendations", data: demo.recs }));
      controller.enqueue(sse({ type: "done" }));
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

