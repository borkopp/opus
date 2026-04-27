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
const MAX_RESPONSE_TOKENS = 500;

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

function buildSystemPrompt(
  city: string,
  locale: string,
  candidatesJson: string,
  timeHint: string,
  now: number,
): string {
  const dateStr = new Date(now).toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Europe/Skopje",
  });

  const languageInstruction =
    locale === "mk"
      ? `\nЈазик: Секогаш одговарај на стандарден македонски јазик, пишувај на кирилица.\n${MK_VOCAB}`
      : `\nLanguage: Detect the language from the user's message and reply in the same language. If Macedonian (Cyrillic), use standard Macedonian:\n${MK_VOCAB}\nIf English, reply in English.`;

  return `You are OPUS, a friendly local-discovery assistant for Macedonia.
Today: ${dateStr} (Europe/Skopje). User location: ${city}.${languageInstruction}

Write a SHORT conversational reply (2–4 sentences) about the search results below.
Be warm, specific, and direct. Reference businesses by name.
${timeHint ? `Time context: ${timeHint}. If a business is closed at that time, mention it or skip it.` : ""}
Do NOT list businesses as bullet points — weave them naturally into prose.
Do NOT output JSON. Plain conversational text only.

SEARCH RESULTS:
${candidatesJson}`;
}

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
  industry: string;
  city?: string;
  neighborhood?: string;
};

function candidatesToContextJson(candidates: Candidate[]): string {
  const slim = candidates.map((c) => ({
    name: c.name,
    slug: c.slug,
    description: c.snippet.split("\n").slice(0, 4).join(" ").slice(0, 300),
    city: [c.neighborhood, c.city].filter(Boolean).join(", ") || undefined,
    rating: c.averageRating > 0 ? `${c.averageRating.toFixed(1)}★ (${c.reviewCount} reviews)` : undefined,
    distanceKm: c.distanceM != null ? `${(c.distanceM / 1000).toFixed(1)}km away` : undefined,
    openNow: c.isOpenNow,
    openAt: c.isOpenAt,
    hours: c.openingHoursToday ? `${c.openingHoursToday.open}–${c.openingHoursToday.close}` : undefined,
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

export async function POST(req: NextRequest) {
  // Coarse body-size guard
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

  const { query, sessionId, coords, locale = "en" } = body;
  const city = body.city;

  if (!query?.trim() || !sessionId) {
    return new Response("query and sessionId required", { status: 400 });
  }

  if (!city) {
    return new Response("Location access is required to find businesses near you.", { status: 400 });
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

      // 1. Retrieve candidates (+ persists user turn in Convex)
      let retrieveResult: Awaited<ReturnType<typeof convex.action<typeof api.marketplace.retrieve.retrieve>>>;
      try {
        retrieveResult = await convex.action(api.marketplace.retrieve.retrieve, {
          query: query.trim().slice(0, MAX_QUERY_CHARS),
          sessionId,
          city,
          coords: coords ?? undefined,
          locale,
        });
      } catch (err) {
        controller.enqueue(sse({ type: "error", message: "Search unavailable. Please try again." }));
        controller.enqueue(sse({ type: "done" }));
        controller.close();
        return;
      }

      const { candidates, conversationId, timeIntent, history } = retrieveResult;

      if (candidates.length === 0) {
        controller.enqueue(
          sse({ type: "text", text: `I couldn't find any matching businesses in ${city} right now. Try a broader search, or browse all listings.` }),
        );
        controller.enqueue(sse({ type: "recommendations", data: [] }));
        controller.enqueue(sse({ type: "done" }));
        controller.close();
        return;
      }

      const topCandidates = (candidates as Candidate[]).slice(0, 4);
      const contextJson = candidatesToContextJson(topCandidates);
      const timeHintStr = timeHintFromKind(timeIntent.kind);

      const systemPrompt = buildSystemPrompt(city, locale, contextJson, timeHintStr, Date.now());
      const historyMessages: Anthropic.MessageParam[] = history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      // 2. Stream Anthropic prose response
      let fullText = "";
      try {
        const claudeStream = anthropic.messages.stream({
          model: "claude-haiku-4-5-20251001",
          max_tokens: MAX_RESPONSE_TOKENS,
          system: systemPrompt,
          messages: [
            ...historyMessages,
            { role: "user", content: query.trim().slice(0, MAX_QUERY_CHARS) },
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

        // 3. Emit recommendations
        const recData = topCandidates.map((c) => ({
          orgId: c.orgId,
          slug: c.slug,
          name: c.name,
          reason: c.snippet.split("\n").slice(1, 3).join(" ").slice(0, 120) || c.snippet.slice(0, 120),
          availabilityHint: deriveAvailabilityHint(c, timeIntent.kind),
          averageRating: c.averageRating,
          reviewCount: c.reviewCount,
          city: c.city,
          distanceM: c.distanceM,
          isOpenNow: c.isOpenNow,
        }));
        controller.enqueue(sse({ type: "recommendations", data: recData }));
        controller.enqueue(sse({ type: "done" }));

        // 4. Fire-and-forget persist assistant turn
        void convex.mutation(api.marketplace.messages.persistAssistantTurn, {
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
        }).catch(() => {});
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
