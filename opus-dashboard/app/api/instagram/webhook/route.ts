import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { NextRequest } from "next/server";
import crypto from "crypto";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

type InstagramMessagingEvent = {
  sender?: { id?: string };
  message?: { is_echo?: boolean; text?: string };
};

type InstagramEntry = {
  id?: string;
  messaging?: InstagramMessagingEvent[];
};

type InstagramWebhookBody = {
  entry?: InstagramEntry[];
};

function isInstagramWebhookBody(value: unknown): value is InstagramWebhookBody {
  return typeof value === "object" && value !== null;
}

// ── Webhook verification (GET) ──────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    token === process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN
  ) {
    return new Response(challenge ?? "", { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

// ── Event handler (POST) ────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // Verify X-Hub-Signature-256
  const signature = req.headers.get("x-hub-signature-256");
  if (!verifySignature(rawBody, signature)) {
    return new Response("Invalid signature", { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  if (!isInstagramWebhookBody(body)) {
    return new Response("Invalid payload", { status: 400 });
  }

  // Instagram requires a fast 200 — process async
  // We return 200 immediately and handle events in the background
  processEvents(body).catch(err => console.error("[instagram/webhook] Processing error:", err));

  return new Response("ok", { status: 200 });
}

// ── Signature verification ───────────────────────────────────────────────────

function verifySignature(rawBody: string, signature: string | null): boolean {
  if (!signature || !process.env.INSTAGRAM_APP_SECRET) return false;

  const expected = `sha256=${crypto
    .createHmac("sha256", process.env.INSTAGRAM_APP_SECRET)
    .update(rawBody)
    .digest("hex")}`;

  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

// ── Event processing ─────────────────────────────────────────────────────────

async function processEvents(body: InstagramWebhookBody) {
  const entries = body.entry ?? [];

  for (const entry of entries) {
    const pageId = entry.id;
    if (!pageId) continue;
    const messagingEvents = entry.messaging ?? [];

    // Resolve orgId from pageId
    const orgId = await convex.query(api.orgs.getByInstagramPageId, { instagramPageId: pageId });

    if (!orgId) {
      console.warn(`[instagram/webhook] No org found for page ID ${pageId}`);
      continue;
    }

    for (const event of messagingEvents) {
      // Skip echoes (messages sent by the page itself)
      if (!event.message || event.message.is_echo) continue;
      // Skip non-text messages (stickers, attachments, etc.)
      if (!event.message.text || !event.sender?.id) continue;

      const senderId = event.sender.id;
      const messageText = event.message.text;

      // Get or create conversation
      const existingConversation = await convex.query(api.ai.conversations.getConversationByThread, {
        channel: "instagram",
        channelThreadId: senderId,
      });

      let convId: Id<"ai_conversations">;
      let convStatus: string;
      let convOrgId: string;

      if (!existingConversation) {
        convId = (await convex.mutation(api.ai.conversations.createConversation, {
          orgId: orgId as Id<"orgs">,
          channel: "instagram",
          channelThreadId: senderId,
        })) as Id<"ai_conversations">;
        convStatus = "active";
        convOrgId = orgId as string;
      } else {
        convId = existingConversation._id as Id<"ai_conversations">;
        convStatus = existingConversation.status;
        convOrgId = existingConversation.orgId as string;
      }

      // Security: verify conversation belongs to this org
      if (convOrgId !== (orgId as string)) {
        console.warn(`[instagram/webhook] Conversation orgId mismatch for sender ${senderId}`);
        continue;
      }

      // Don't re-engage AI for handed-off conversations
      if (convStatus === "handed_off") continue;

      // Run AI
      const result = await convex.action(api.ai.agent.processMessagePublic, {
        orgId: orgId as Id<"orgs">,
        conversationId: convId,
        userMessage: messageText,
        channel: "instagram",
      });

      // Send reply via Instagram Graph API
      await sendInstagramReply(senderId, result.reply);
    }
  }
}

// ── Instagram Graph API sender ───────────────────────────────────────────────

async function sendInstagramReply(recipientId: string, message: string) {
  const accessToken = process.env.INSTAGRAM_PAGE_ACCESS_TOKEN;
  if (!accessToken) {
    console.error("[instagram/webhook] INSTAGRAM_PAGE_ACCESS_TOKEN is not set");
    return;
  }

  const res = await fetch("https://graph.facebook.com/v19.0/me/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text: message },
      messaging_type: "RESPONSE",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`[instagram/webhook] Failed to send reply to ${recipientId}: ${err}`);
  }
}
