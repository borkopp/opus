import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { NextRequest, NextResponse } from "next/server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": process.env.NEXT_PUBLIC_MK_URL ?? "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: CORS_HEADERS });
  }

  const { orgId, sessionId, message } = body as Record<string, string>;

  if (!orgId || !sessionId || !message?.trim()) {
    return NextResponse.json({ error: "orgId, sessionId, and message are required" }, { status: 400, headers: CORS_HEADERS });
  }

  try {
    // Get or create conversation for this session
    let existingConversation = await convex.query(api.ai.conversations.getConversationByThread, {
      channel: "webchat",
      channelThreadId: sessionId,
    });

    let conversationId: Id<"ai_conversations">;
    let conversationStatus: string;
    let conversationOrgId: string;

    if (!existingConversation) {
      conversationId = await convex.mutation(api.ai.conversations.createConversation, {
        orgId: orgId as Id<"orgs">,
        channel: "webchat",
        channelThreadId: sessionId,
      }) as Id<"ai_conversations">;
      conversationStatus = "active";
      conversationOrgId = orgId;
    } else {
      conversationId = existingConversation._id as Id<"ai_conversations">;
      conversationStatus = existingConversation.status;
      conversationOrgId = existingConversation.orgId as string;
    }

    // Verify this conversation belongs to the claimed orgId (security check)
    if (conversationOrgId !== orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: CORS_HEADERS });
    }

    // Don't engage AI for handed-off conversations
    if (conversationStatus === "handed_off") {
      return NextResponse.json({
        reply: "This conversation has been handed off to our team. We'll be in touch shortly.",
        confidence: 1.0,
        handedOff: true,
      }, { headers: CORS_HEADERS });
    }

    const result = await convex.action(api.ai.agent.processMessagePublic, {
      orgId: orgId as Id<"orgs">,
      conversationId,
      userMessage: message.trim(),
      channel: "webchat",
    });

    return NextResponse.json(result, { headers: CORS_HEADERS });
  } catch (e: any) {
    console.error("[/api/chat] Error:", e);
    return NextResponse.json({ error: e.message ?? "Internal error" }, { status: 500, headers: CORS_HEADERS });
  }
}

// GET: fetch conversation history for a session (page reload resilience)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("orgId");
  const sessionId = searchParams.get("sessionId");

  if (!orgId || !sessionId) {
    return NextResponse.json({ error: "orgId and sessionId are required" }, { status: 400, headers: CORS_HEADERS });
  }

  try {
    const conversation = await convex.query(api.ai.conversations.getConversationByThread, {
      channel: "webchat",
      channelThreadId: sessionId,
    });

    if (!conversation || conversation.orgId !== orgId) {
      return NextResponse.json({ messages: [] }, { headers: CORS_HEADERS });
    }

    const messages = await convex.query(api.ai.messages.listMessagesForWebchat, {
      orgId: orgId as Id<"orgs">,
      conversationId: conversation._id as Id<"ai_conversations">,
    });

    return NextResponse.json({ messages }, { headers: CORS_HEADERS });
  } catch (e: any) {
    console.error("[/api/chat GET] Error:", e);
    return NextResponse.json({ error: e.message ?? "Internal error" }, { status: 500, headers: CORS_HEADERS });
  }
}
