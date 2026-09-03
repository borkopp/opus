"use node";

import Anthropic from "@anthropic-ai/sdk";
import { v, ConvexError } from "convex/values";
import { action, internalAction, ActionCtx } from "../_generated/server";
import { internal, api } from "../_generated/api";
import { Id } from "../_generated/dataModel";

type ToolInput = Record<string, unknown>;
type AvailabilitySlot = {
  startAt: number;
  availableStaffIds: Id<"staff_members">[];
};

function requiredString(input: ToolInput, key: string): string {
  const value = input[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new ConvexError(`Missing or invalid ${key}`);
  }
  return value;
}

function requiredNumber(input: ToolInput, key: string): number {
  const value = input[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ConvexError(`Missing or invalid ${key}`);
  }
  return value;
}

// ── Tool definitions ────────────────────────────────────────────────────────

const AI_TOOLS: Anthropic.Tool[] = [
  {
    name: "list_services",
    description:
      "List all services this business offers, including name, duration, and price. Call this first to understand what can be booked.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "check_availability",
    description:
      "Check available booking slots for a specific service on a given date. Returns a list of available times. You MUST call list_services first and use the exact serviceId value returned — never invent or guess the serviceId.",
    input_schema: {
      type: "object",
      properties: {
        serviceId: {
          type: "string",
          description: "The exact serviceId value returned by list_services. Copy it verbatim — do not derive it from the service name.",
        },
        date: {
          type: "string",
          description: "Date in YYYY-MM-DD format",
        },
      },
      required: ["serviceId", "date"],
    },
  },
  {
    name: "create_booking",
    description:
      "Create a booking for a customer. Only call this after confirming the customer's full name, phone number, desired service, and the specific time slot they want.",
    input_schema: {
      type: "object",
      properties: {
        serviceId: { type: "string", description: "The exact serviceId value returned by list_services — copy verbatim." },
        staffId: {
          type: "string",
          description: "Staff member id from check_availability availableStaffIds",
        },
        startAt: {
          type: "number",
          description: "Unix timestamp in milliseconds for the start of the booking",
        },
        customerName: { type: "string", description: "Customer's full name" },
        customerPhone: {
          type: "string",
          description: "Customer's phone number in E.164 format (e.g. +38971234567)",
        },
      },
      required: ["serviceId", "staffId", "startAt", "customerName", "customerPhone"],
    },
  },
  {
    name: "get_customer_bookings",
    description:
      "Look up a customer's upcoming bookings by their phone number. Use this when a customer asks about their existing appointments.",
    input_schema: {
      type: "object",
      properties: {
        customerPhone: {
          type: "string",
          description: "Customer's phone number in E.164 format",
        },
      },
      required: ["customerPhone"],
    },
  },
];

// Timezone used for all human-readable date/time formatting in AI responses.
// Convex action runtime runs in UTC — without this, times appear 2 h early for MK (UTC+2 CEST).
const ORG_TIMEZONE = "Europe/Skopje";

// ── System prompt builder ────────────────────────────────────────────────────

function buildSystemPrompt(settings: {
  aiPersonaName: string;
  aiTone?: string;
  aiSystemPrompt?: string;
  aiLanguage?: string;
}): string {
  const tone = settings.aiTone ?? "friendly";
  const name = settings.aiPersonaName ?? "Aria";
  const custom = settings.aiSystemPrompt ? `\nAdditional instructions: ${settings.aiSystemPrompt}` : "";

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: ORG_TIMEZONE });
  const todayInstruction = `\nToday's date is ${dateStr}. Use this to resolve relative dates like "tomorrow", "next Monday", etc. Dates for check_availability must be in YYYY-MM-DD format.`;

  const mkVocab = `
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

  const languageInstruction =
    settings.aiLanguage === "en"
      ? "\nLanguage: Always respond in English, regardless of what language the customer writes in."
      : settings.aiLanguage === "mk"
      ? `\nЈазик: Секогаш одговарај на стандарден македонски јазик, пишувај на кирилица. НЕ користи српски, хрватски, босански или бугарски зборови — тие се различни јазици.\n${mkVocab}`
      : `\nLanguage: Detect the language of the customer's message and respond in the same language.\n- If the message is in Macedonian (Cyrillic script or Macedonian words), reply in standard Macedonian using Cyrillic. Do NOT mix in Serbian, Croatian, Bosnian, or Bulgarian words.\n${mkVocab}\n- If the message is in English, reply in English.`;

  return `You are ${name}, the AI front-desk assistant for this business. You help customers book appointments, check availability, and answer questions.

Tone: ${tone}. Keep responses concise and helpful. Never be overly formal or robotic.${todayInstruction}${languageInstruction}${custom}

IMPORTANT — You must ALWAYS respond with a valid JSON object and nothing else:
{"message": "<your reply to the customer>", "confidence": <number 0.0 to 1.0>}

Confidence scoring:
- 0.9–1.0: Request is clear, you have all information needed, action taken or answer given with certainty
- 0.7–0.9: Request understood, minor ambiguity or waiting on customer confirmation
- Below 0.7: Request unclear, information missing, situation complex — a human should take over

Rules:
- CRITICAL: When calling check_availability or create_booking, you MUST copy the exact serviceId value returned by list_services. Never invent, shorten, or derive an ID from the service name. IDs are long opaque strings like "jx76abc123...".
- CRITICAL: When calling create_booking, copy the exact staffId and startAt values returned by check_availability. Never invent these values.
- Never include raw database IDs in your message to the customer. Use human-readable names (service name, staff name, date/time).
- Never promise policy exceptions or other things outside your capabilities.
- If you cannot help confidently, set confidence below the threshold so a human can assist.
- When creating a booking, always confirm the details with the customer before calling create_booking.
- Format dates and times clearly (e.g. "Monday, 14 April at 10:00 AM").`;
}

// ── Working hours check ──────────────────────────────────────────────────────

function isWithinWorkingHours(settings: {
  aiWorkingHoursEnabled?: boolean;
  aiWorkingHours?: Array<{ dayOfWeek: number; startTime: string; endTime: string }>;
}): boolean {
  if (!settings.aiWorkingHoursEnabled || !settings.aiWorkingHours?.length) return true;

  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sun … 6 = Sat
  const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  return settings.aiWorkingHours.some(
    h => h.dayOfWeek === dayOfWeek && timeStr >= h.startTime && timeStr < h.endTime
  );
}

// ── Tool dispatch ────────────────────────────────────────────────────────────

async function dispatchTool(
  ctx: ActionCtx,
  orgId: Id<"orgs">,
  conversationId: Id<"ai_conversations">,
  channel: "instagram" | "webchat",
  tool: Anthropic.ToolUseBlock
): Promise<string> {
  const input = tool.input as ToolInput;

  switch (tool.name) {
    case "list_services": {
      const services = await ctx.runQuery(internal.services.listServicesForAI, { orgId });
      if (!services.length) return "No services are currently available.";
      return JSON.stringify(services);
    }

    case "check_availability": {
      const serviceId = requiredString(input, "serviceId") as Id<"services">;
      const date = requiredString(input, "date");
      let slots: AvailabilitySlot[];
      try {
        slots = await ctx.runQuery(internal.slots.getAvailableSlotsForAI, {
          orgId,
          serviceId,
          date,
        });
      } catch {
        return "Invalid serviceId. Please call list_services first and use the exact serviceId value returned.";
      }

      if (!slots.length) return `No available slots on ${date}.`;

      // Return slots formatted for Claude — include startAt for create_booking
      const formatted = slots.map((s) => {
        const d = new Date(s.startAt);
        const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: ORG_TIMEZONE });
        const staffId = s.availableStaffIds[0];
        return { time, startAt: s.startAt, staffId };
      });
      return JSON.stringify(formatted);
    }

    case "create_booking": {
      const customerName = requiredString(input, "customerName");
      const customerPhone = requiredString(input, "customerPhone");
      const staffId = requiredString(input, "staffId") as Id<"staff_members">;
      const serviceId = requiredString(input, "serviceId") as Id<"services">;
      const startAt = requiredNumber(input, "startAt");

      // Find or create customer
      const customerId = await ctx.runMutation(internal.customers.findOrCreateCustomerForAI, {
        orgId,
        name: customerName,
        phone: customerPhone,
      });

      // Create the booking
      let bookingId: Id<"bookings">;
      try {
        bookingId = await ctx.runMutation(internal.bookings.createBookingForAI, {
          orgId,
          staffId,
          serviceId,
          customerId,
          startAt,
          conversationId,
          channel,
        });
      } catch (error: unknown) {
        const message = error instanceof Error
          ? error.message
          : "Invalid service or staff ID. Use exact IDs from list_services and check_availability.";
        return `Booking failed: ${message}`;
      }

      // Log the booking action in ai_messages
      await ctx.runMutation(internal.ai.messages.saveMessage, {
        orgId,
        conversationId,
        role: "assistant",
        content: `Booking created for ${customerName}`,
        actionType: "booking_created",
        actionReferenceId: bookingId,
      });

      // Link booking to conversation
      await ctx.runMutation(internal.ai.conversations.addBookingToConversation, {
        conversationId,
        bookingId,
      });

      const d = new Date(startAt);
      const readableDate = d.toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        timeZone: ORG_TIMEZONE,
      });
      const readableTime = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: ORG_TIMEZONE });

      return `Booking confirmed for ${customerName} on ${readableDate} at ${readableTime}.`;
    }

    case "get_customer_bookings": {
      const customerPhone = requiredString(input, "customerPhone");
      const bookings = await ctx.runQuery(internal.bookings.getCustomerBookingsForAI, {
        orgId,
        customerPhone,
      });

      if (!bookings.length) return "No upcoming bookings found for that phone number.";
      return JSON.stringify(bookings);
    }

    default:
      return "Unknown tool.";
  }
}

// ── Main AI action (internal) ────────────────────────────────────────────────

export const processMessage = internalAction({
  args: {
    orgId: v.id("orgs"),
    conversationId: v.id("ai_conversations"),
    userMessage: v.string(),
    channel: v.union(v.literal("instagram"), v.literal("webchat")),
  },
  handler: async (ctx, args): Promise<{ reply: string; confidence: number; handedOff: boolean }> => {
    await ctx.runQuery(internal.auth.assertPaidOrg, {
      orgId: args.orgId,
      feature: "AI front desk",
    });

    const settings = await ctx.runQuery(internal.orgSettings.getOrgSettingsInternal, {
      orgId: args.orgId,
    });

    if (!settings) {
      return { reply: "Service temporarily unavailable.", confidence: 0, handedOff: false };
    }

    // Check working hours
    if (!isWithinWorkingHours(settings)) {
      const awayMessage = settings.aiAwayMessage ?? "We're currently outside of business hours. Please reach out again during our working hours.";

      await ctx.runMutation(internal.ai.messages.saveMessage, {
        orgId: args.orgId,
        conversationId: args.conversationId,
        role: "user",
        content: args.userMessage,
      });

      await ctx.runMutation(internal.ai.messages.saveMessage, {
        orgId: args.orgId,
        conversationId: args.conversationId,
        role: "assistant",
        content: awayMessage,
        confidenceScore: 1.0,
      });

      return { reply: awayMessage, confidence: 1.0, handedOff: false };
    }

    // Load conversation history (last 20 messages)
    const history = await ctx.runQuery(internal.ai.messages.listMessagesInternal, {
      conversationId: args.conversationId,
      limit: 20,
    });

    // Save incoming user message
    await ctx.runMutation(internal.ai.messages.saveMessage, {
      orgId: args.orgId,
      conversationId: args.conversationId,
      role: "user",
      content: args.userMessage,
    });

    // Build message history for Claude
    const messages: Anthropic.MessageParam[] = history
      .filter((message) => message.role === "user" || message.role === "assistant")
      .map((message) => ({
        role: message.role as "user" | "assistant",
        content: message.content,
      }));
    messages.push({ role: "user", content: args.userMessage });

    const systemPrompt = buildSystemPrompt(settings);
    const client = new Anthropic();

    let finalReply = "I'm sorry, I couldn't process your request. Please try again.";
    let finalConfidence = 0.5;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let continueLoop = true;
    let iterations = 0;
    const MAX_ITERATIONS = 8;

    while (continueLoop && iterations < MAX_ITERATIONS) {
      iterations++;

      const response = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: systemPrompt,
        tools: AI_TOOLS,
        messages,
      });

      totalInputTokens += response.usage.input_tokens;
      totalOutputTokens += response.usage.output_tokens;

      if (response.stop_reason === "tool_use") {
        const assistantContent = response.content;
        messages.push({ role: "assistant", content: assistantContent });

        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        for (const block of assistantContent) {
          if (block.type === "tool_use") {
            const result = await dispatchTool(
              ctx,
              args.orgId,
              args.conversationId,
              args.channel,
              block
            );
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: result,
            });
          }
        }
        messages.push({ role: "user", content: toolResults });
      } else {
        // end_turn — extract JSON response
        const textBlock = response.content.find(
          (block): block is Anthropic.TextBlock => block.type === "text",
        );
        if (textBlock) {
          try {
            // Claude may wrap JSON in markdown code fences
            const rawText = textBlock.text.trim().replace(/^```json\s*/, "").replace(/\s*```$/, "");
            const parsed = JSON.parse(rawText);
            if (typeof parsed.message === "string" && typeof parsed.confidence === "number") {
              finalReply = parsed.message;
              finalConfidence = Math.max(0, Math.min(1, parsed.confidence));
            }
          } catch {
            // Claude returned plain text — use it as-is with reduced confidence
            finalReply = textBlock.text;
            finalConfidence = 0.6;
          }
        }
        continueLoop = false;
      }
    }

    // Update token usage
    await ctx.runMutation(internal.ai.conversations.updateTokenUsage, {
      conversationId: args.conversationId,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
    });

    // Save assistant response
    await ctx.runMutation(internal.ai.messages.saveMessage, {
      orgId: args.orgId,
      conversationId: args.conversationId,
      role: "assistant",
      content: finalReply,
      model: "claude-haiku-4-5-20251001",
      confidenceScore: finalConfidence,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
    });

    // Write to audit_log
    await ctx.runMutation(internal.auditLog.insertAuditLog, {
      orgId: args.orgId,
      actorType: "ai",
      actorId: "claude-haiku-4-5-20251001",
      action: "ai.message_sent",
      resourceType: "ai_conversations",
      resourceId: args.conversationId,
      after: { confidence: finalConfidence, channel: args.channel },
    });

    // Check confidence threshold — trigger handoff if needed
    const threshold = settings.aiConfidenceThreshold ?? 0.7;
    const handedOff = finalConfidence < threshold;

    if (handedOff) {
      await ctx.runMutation(api.ai.conversations.handoffConversation, {
        orgId: args.orgId,
        conversationId: args.conversationId,
        reason: `AI confidence ${(finalConfidence * 100).toFixed(0)}% below threshold ${(threshold * 100).toFixed(0)}%`,
      });
    }

    return { reply: finalReply, confidence: finalConfidence, handedOff };
  },
});

// ── Public wrapper ────────────────────────────────────────────────────────────
// Called from API routes (webchat, Instagram webhook)

export const processMessagePublic = action({
  args: {
    orgId: v.id("orgs"),
    conversationId: v.id("ai_conversations"),
    userMessage: v.string(),
    channel: v.union(v.literal("instagram"), v.literal("webchat")),
  },
  handler: async (ctx, args): Promise<{ reply: string; confidence: number; handedOff: boolean }> => {
    await ctx.runQuery(internal.auth.assertPaidOrg, {
      orgId: args.orgId,
      feature: "AI front desk",
    });

    // Validate AI is enabled
    const settings = await ctx.runQuery(internal.orgSettings.getOrgSettingsInternal, {
      orgId: args.orgId,
    });

    if (!settings?.aiEnabled) {
      throw new ConvexError("AI front-desk is not enabled.");
    }

    return await ctx.runAction(internal.ai.agent.processMessage, args);
  },
});
