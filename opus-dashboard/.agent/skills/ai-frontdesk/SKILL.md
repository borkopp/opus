---
name: ai-frontdesk
description: Covers implementation of the AI front-desk agent in Omni-Service OS. Use when writing code that handles inbound customer messages (WhatsApp, Instagram, webchat), calls Claude, manages conversation state, triggers bookings autonomously, or handles the human handoff flow.
---

# AI Front Desk

The AI front desk uses Claude (`claude-sonnet-4-6`) to autonomously handle inbound customer messages and book appointments without human intervention. It operates across WhatsApp, Instagram DM, and webchat.

## Architecture overview

```
Inbound message (Twilio / Meta webhook)
        ↓
  Convex HTTP Action (webhook handler)
        ↓
  Resolve or create ai_conversation
        ↓
  Fetch context (schedule, customer history, org settings)
        ↓
  Call Claude via Anthropic SDK
        ↓
  Parse response + confidence score
        ↓
  confidence ≥ threshold?
    YES → execute action (create booking, send payment link)
    NO  → flag as handed_off, notify staff
        ↓
  Write ai_messages row
  Write audit_log row
  Send reply via Twilio / Meta
```

## Calling Claude

Always use the `claude-sonnet-4-6` model. Inject full context into the system prompt. Never hardcode org-specific values — read them from the resolved org context.

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

async function callFrontDesk(
  conversation: AiConversation,
  customerMessage: string,
  context: FrontDeskContext,
): Promise<FrontDeskResponse> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: buildSystemPrompt(context),
    messages: buildMessageHistory(conversation, customerMessage),
  });

  return parseResponse(response);
}

function buildSystemPrompt(ctx: FrontDeskContext): string {
  return `
You are ${ctx.aiPersonaName}, the virtual receptionist for ${ctx.orgName}.
Your job is to help customers book, reschedule, and cancel appointments.

BUSINESS HOURS AND AVAILABILITY:
${ctx.availabilityText}

CANCELLATION POLICY:
${ctx.cancellationPolicy}

DEPOSIT POLICY:
${ctx.depositPolicy}

TONE:
Be friendly, concise, and professional. Match the tone of the business.
Never mention that you are an AI unless directly asked.

AVAILABLE ACTIONS:
- Check availability for a given date/time and staff member
- Create a booking (respond with JSON action block)
- Send a payment link for a deposit (respond with JSON action block)
- Reschedule an existing booking (respond with JSON action block)
- Cancel a booking (respond with JSON action block)

When you intend to take an action, include a JSON block in your response:
<action>
{
  "type": "create_booking" | "send_payment_link" | "reschedule" | "cancel",
  "confidence": 0.0–1.0,
  "params": { ... }
}
</action>

If you are unsure or the request is ambiguous, set confidence below 0.7 and
ask a clarifying question rather than proceeding.
  `.trim();
}
```

## Confidence threshold and human handoff

After receiving Claude's response, extract the `confidence` score from the action block. Compare against `org_settings.aiConfidenceThreshold` (default `0.7`).

```typescript
async function handleAiResponse(
  ctx: ActionCtx,
  conversationId: Id<"ai_conversations">,
  response: FrontDeskResponse,
  orgSettings: OrgSettings,
) {
  if (response.action && response.action.confidence < orgSettings.aiConfidenceThreshold) {
    // Handoff — do not execute the action
    await ctx.runMutation(internal.ai.flagHandoff, {
      conversationId,
      reason: `Low confidence: ${response.action.confidence}`,
    });
    await notifyStaffHandoff(ctx, conversationId);
    return;
  }

  if (response.action) {
    await executeAiAction(ctx, response.action, conversationId);
  }
}
```

**Never let a low-confidence action execute silently.** If handoff is triggered, the AI should still send a holding reply to the customer ("Let me check with the team and get back to you shortly.") before pausing the thread.

## AI must never call booking mutations directly

AI actions must go through the booking engine's standard mutation path. This ensures all rules (conflict checks, deposit checks, surge pricing, audit logging) are enforced identically regardless of source.

```typescript
// ✅ Correct — AI action calls the same mutation as the web UI
await ctx.runMutation(internal.bookings.createBooking, {
  orgId,
  staffId,
  serviceId,
  customerId,
  startAt,
  source: "ai_whatsapp",         // always set the correct source
  aiConversationId: conversationId,
});

// ❌ Wrong — AI bypasses booking rules with a raw insert
await ctx.db.insert("bookings", { ... });
```

## Logging — mandatory for every turn

Every message in and out must be written to `ai_messages`. Every action taken must be written to `audit_log`.

```typescript
// Log the inbound customer message
await ctx.db.insert("ai_messages", {
  orgId,
  conversationId,
  role: "user",
  content: customerMessage,
  createdAt: Date.now(),
});

// Log the AI response
await ctx.db.insert("ai_messages", {
  orgId,
  conversationId,
  role: "assistant",
  content: response.text,
  model: "claude-sonnet-4-6",
  confidenceScore: response.action?.confidence,
  inputTokens: response.usage.input_tokens,
  outputTokens: response.usage.output_tokens,
  actionType: response.action?.type ?? undefined,
  actionReferenceId: createdBookingId ?? undefined,
  createdAt: Date.now(),
});

// Update token totals on the conversation
await ctx.db.patch(conversationId, {
  totalInputTokens: conversation.totalInputTokens + response.usage.input_tokens,
  totalOutputTokens: conversation.totalOutputTokens + response.usage.output_tokens,
  updatedAt: Date.now(),
});
```

## Conversation state management

- One `ai_conversation` per customer per channel thread. Look up by `by_channel_thread` index before creating a new one.
- Pass the full message history to Claude on every turn (Convex has no memory between calls).
- When status is `handed_off`, do not send further AI responses until a staff member marks it resolved and reactivates the thread.
- When a booking is created during a conversation, push its ID into `bookingIds` on the conversation row.

## Customer identification

Inbound messages may come from unknown numbers. Attempt to match `customer.phone` (E.164 format) against the org's customer table using the `by_org_phone` index. If no match, create a new customer record with name `"Unknown"` and update it once the customer provides their name during conversation.
