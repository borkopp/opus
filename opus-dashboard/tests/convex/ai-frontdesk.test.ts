import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { convexTest } from "convex-test";
import { api, internal } from "../../convex/_generated/api";
import schema from "../../convex/schema";
import { convexModules } from "../../convex-test.setup";
import { encryptToken } from "../../convex/ai/instagram";
import { buildSystemPrompt } from "../../convex/ai/context";

const { createResponse } = vi.hoisted(() => ({ createResponse: vi.fn() }));
vi.mock("openai", () => ({
  default: class {
    responses = { create: createResponse };
  },
}));

const createBackend = () => convexTest(schema, convexModules);
type Backend = ReturnType<typeof createBackend>;
const NOW = Date.parse("2026-09-28T07:00:00Z");
const openingHours = Array.from({ length: 7 }, (_, dayOfWeek) => ({
  dayOfWeek,
  open: "09:00",
  close: "17:00",
  isClosed: false,
}));

async function studio(t: Backend, key = "one") {
  const owner = t.withIdentity({
    subject: `frontdesk-${key}`,
    email: `${key}@example.com`,
    name: "Studio Owner",
  });
  const userId = await owner.mutation(api.users.ensureUser);
  const { orgId } = await owner.mutation(api.activation.startBeautyBusiness, {
    name: `Studio ${key}`,
    category: "nail_salon",
  });
  const serviceId = await owner.mutation(api.activation.saveFirstService, {
    name: "Gel nails",
    durationMins: 60,
    priceMinorUnits: 120_000,
  });
  await owner.mutation(api.activation.saveHours, { openingHours });
  await t.run(async (ctx) => {
    await ctx.db.patch(orgId, {
      plan: "paid",
      instagramFrontdeskAccountId: `account-${key}`,
    });
    await ctx.db.insert("ai_instagram_connections", {
      orgId,
      accountId: `account-${key}`,
      username: `studio_${key}`,
      tokenCiphertext: encryptToken("test-instagram-token"),
      tokenExpiresAt: NOW + 60 * 86_400_000,
      status: "connected",
      createdAt: NOW,
      updatedAt: NOW,
    });
  });
  await owner.mutation(api.orgSettings.updateAiSettings, {
    orgId,
    aiEnabled: true,
    aiInstagramEnabled: true,
    aiPersonaName: "Aria",
    aiConfidenceThreshold: 0.8,
    aiStudioContext:
      "We use the studio's Example Gel. Maintenance is usually after 3 weeks. Do not guarantee wear time.",
    aiLanguage: "en",
  });
  const service = await t.run((ctx) => ctx.db.get(serviceId));
  if (!service?.staffIds[0]) throw new Error("Missing staff");
  const ingest = async (
    messageId: string,
    text: string,
    senderId = "client",
    extra: Partial<{
      timestamp: number;
      unsupported: boolean;
      echo: boolean;
    }> = {},
  ) => {
    await t.mutation(internal.ai.queue.ingest, {
      accountId: `account-${key}`,
      senderId,
      messageId,
      text,
      timestamp: Date.now(),
      unsupported: false,
      echo: false,
      ...extra,
    });
    const conv = await t.run((ctx) =>
      ctx.db
        .query("ai_conversations")
        .withIndex("by_org_channel_thread", (q) =>
          q
            .eq("orgId", orgId)
            .eq("channel", "instagram")
            .eq("channelThreadId", `account-${key}:${senderId}`),
        )
        .unique(),
    );
    if (!conv) throw new Error("Conversation missing");
    return conv;
  };
  const messages = () =>
    t.run((ctx) =>
      ctx.db
        .query("ai_messages")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .collect(),
    );
  return {
    owner,
    orgId,
    userId,
    serviceId,
    staffId: service.staffIds[0],
    ingest,
    messages,
  };
}

beforeEach(() => {
  createResponse.mockReset();
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  for (const [key, value] of Object.entries({
    AI_FRONTDESK_ENABLED: "true",
    OPENAI_API_KEY: "test-openai-key",
    INSTAGRAM_APP_ID: "test-app",
    INSTAGRAM_APP_SECRET: "test-secret",
    INSTAGRAM_WEBHOOK_VERIFY_TOKEN: "test-verify",
    INSTAGRAM_REDIRECT_URI: "https://test.convex.site/instagram/callback",
    INSTAGRAM_GRAPH_VERSION: "v24.0",
    FRONTDESK_TOKEN_SECRET: "a".repeat(32),
  }))
    vi.stubEnv(key, value);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Instagram frontdesk", () => {
  test("persists studio context, omits secrets from status, and rejects cross-tenant and anonymous access", async () => {
    const t = createBackend(),
      a = await studio(t),
      b = await studio(t, "two");
    const saved = await a.owner.query(api.orgSettings.getOrgSettings, {
      orgId: a.orgId,
    });
    expect(saved?.settings?.aiStudioContext).toContain("Example Gel");
    expect(await a.owner.query(api.ai.connections.getStatus, {})).toMatchObject(
      { connected: true, ready: true },
    );
    const status = await a.owner.query(api.ai.connections.getStatus, {});
    expect(status).not.toHaveProperty("tokenCiphertext");
    expect(status).not.toHaveProperty("oauthStateHash");
    await expect(
      t.query(api.ai.conversations.listConversations, { orgId: a.orgId }),
    ).rejects.toThrow("Unauthenticated");
    await expect(
      b.owner.query(api.ai.conversations.listConversations, { orgId: a.orgId }),
    ).rejects.toThrow("Unauthorised");
    await expect(
      a.owner.mutation(api.orgSettings.updateAiSettings, {
        orgId: a.orgId,
        aiEnabled: true,
        aiPersonaName: "Aria",
        aiConfidenceThreshold: 0.1,
      }),
    ).rejects.toThrow("0.7");
    const preview = await a.owner.mutation(internal.ai.previewData.reserve, {
      question: "How long do nails last?",
    });
    const prompt = buildSystemPrompt(preview.settings, preview.studio, NOW);
    expect(prompt).toContain("Example Gel");
    expect(prompt).toContain("Never invent brands");
    expect(prompt).not.toContain(a.orgId);
    expect(prompt).not.toContain(a.serviceId);
  });

  test("audits setup previews without sending messages or including them in the customer inbox", async () => {
    const t = createBackend(),
      a = await studio(t);
    createResponse.mockResolvedValue({
      status: "completed",
      output: [],
      output_text: JSON.stringify({
        message: "We use Example Gel.",
        confidenceScore: 0.95,
        handoff: false,
      }),
      usage: { input_tokens: 500, output_tokens: 25 },
    });
    const send = vi.fn();
    vi.stubGlobal("fetch", send);
    await expect(
      a.owner.action(api.ai.agent.preview, { question: "What do you use?" }),
    ).resolves.toMatchObject({
      message: "We use Example Gel.",
      handoff: false,
    });
    expect(send).not.toHaveBeenCalled();
    expect(
      await a.owner.query(api.ai.conversations.listConversations, {
        orgId: a.orgId,
      }),
    ).toEqual([]);
    expect(await a.messages()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: "user", content: "What do you use?" }),
        expect.objectContaining({
          role: "assistant",
          content: "We use Example Gel.",
          deliveryStatus: "withheld",
          model: "gpt-6-luna",
          inputTokens: 500,
        }),
      ]),
    );
    expect(
      await t.run((ctx) =>
        ctx.db
          .query("audit_log")
          .withIndex("by_org", (q) => q.eq("orgId", a.orgId))
          .collect(),
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: "ai.preview_completed" }),
      ]),
    );
  });

  test("finds older handoffs even when the studio has many newer resolved conversations", async () => {
    const t = createBackend(),
      a = await studio(t);
    const old = await a.ingest("old", "Please get a person");
    await a.owner.mutation(api.ai.conversations.handoffConversation, {
      orgId: a.orgId,
      conversationId: old._id,
      reason: "Customer requested a person",
    });
    await t.run(async (ctx) => {
      for (let index = 0; index < 205; index++)
        await ctx.db.insert("ai_conversations", {
          orgId: a.orgId,
          channel: "instagram",
          channelThreadId: `other:${index}`,
          status: "resolved",
          bookingIds: [],
          totalInputTokens: 0,
          totalOutputTokens: 0,
          createdAt: NOW + index + 1,
          updatedAt: NOW + index + 1,
        });
    });
    const handoffs = await a.owner.query(
      api.ai.conversations.listConversations,
      { orgId: a.orgId, status: "handed_off" },
    );
    expect(handoffs.map((conv) => conv._id)).toEqual([old._id]);
  });

  test("keeps staff replies from being overtaken by resumed AI or another outgoing message", async () => {
    const t = createBackend(),
      a = await studio(t);
    const conv = await a.ingest("hello", "Can someone help?");
    const args = { orgId: a.orgId, conversationId: conv._id };
    const replyId = await a.owner.mutation(api.ai.conversations.replyAsStaff, {
      ...args,
      text: "Yes, I can help.",
    });
    await expect(
      a.owner.mutation(api.ai.conversations.resumeConversation, args),
    ).rejects.toThrow("finish sending");
    await t.mutation(internal.ai.delivery.claim, {
      orgId: a.orgId,
      messageId: replyId,
    });
    await expect(
      a.owner.mutation(api.ai.conversations.replyAsStaff, {
        ...args,
        text: "Another reply",
      }),
    ).rejects.toThrow("finish sending");
    await t.mutation(internal.ai.delivery.complete, {
      orgId: a.orgId,
      messageId: replyId,
      status: "sent",
      providerMessageId: "staff-sent",
    });
    await a.owner.mutation(api.ai.conversations.resumeConversation, args);
    const resumed = await t.run((ctx) => ctx.db.get(conv._id));
    expect(resumed?.status).toBe("active");
    expect(resumed?.pendingBooking).toBeUndefined();
  });

  test("deduplicates webhook retries and isolates the same sender across studios", async () => {
    const t = createBackend(),
      a = await studio(t),
      b = await studio(t, "two");
    const first = await a.ingest("mid-1", "Hello");
    await a.ingest("mid-1", "Hello");
    const other = await b.ingest("mid-1", "Other studio");
    expect(first._id).not.toBe(other._id);
    expect((await a.messages()).filter((m) => m.role === "user")).toHaveLength(
      1,
    );
    const work = {
      orgId: a.orgId,
      conversationId: first._id,
      lease: "lease-1",
    };
    expect(await t.mutation(internal.ai.queue.claim, work)).toBeTruthy();
    expect(
      await t.mutation(internal.ai.queue.claim, {
        ...work,
        lease: "second-worker",
      }),
    ).toBeNull();
    expect(
      await t.query(internal.ai.queue.runtime, { ...work, orgId: b.orgId }),
    ).toBeNull();
  });

  test("requires reconnection only after bounded refresh retries fail", async () => {
    const t = createBackend(),
      a = await studio(t);
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ error: { message: "Temporarily unavailable" } }),
            { status: 503 },
          ),
      ),
    );
    const args = { orgId: a.orgId, tokenExpiresAt: NOW + 60 * 86_400_000 };
    await t.action(internal.ai.instagram.refreshConnection, args);
    expect(await a.owner.query(api.ai.connections.getStatus, {})).toMatchObject(
      { connected: true },
    );
    await t.action(internal.ai.instagram.refreshConnection, {
      ...args,
      attempt: 3,
    });
    expect(await a.owner.query(api.ai.connections.getStatus, {})).toMatchObject(
      { connected: false, error: "Reconnect Instagram to restore messaging." },
    );
  });

  test("cannot send or resume an old thread after connecting another Instagram account", async () => {
    const t = createBackend(),
      a = await studio(t);
    const conv = await a.ingest("old-account", "Hello");
    await t.run(async (ctx) => {
      const connection = await ctx.db
        .query("ai_instagram_connections")
        .withIndex("by_org", (q) => q.eq("orgId", a.orgId))
        .unique();
      await ctx.db.patch(connection!._id, { accountId: "replacement-account" });
      await ctx.db.patch(a.orgId, {
        instagramFrontdeskAccountId: "replacement-account",
      });
    });
    const args = { orgId: a.orgId, conversationId: conv._id };
    await expect(
      a.owner.mutation(api.ai.conversations.replyAsStaff, {
        ...args,
        text: "Hello",
      }),
    ).rejects.toThrow("Reconnect Instagram");
    await expect(
      a.owner.mutation(api.ai.conversations.resumeConversation, args),
    ).rejects.toThrow("different Instagram connection");
  });

  test("withholds low-confidence output, queues a safe acknowledgement and notifies the team", async () => {
    const t = createBackend(),
      a = await studio(t);
    const conv = await a.ingest("mid-1", "Are your gels allergy free?");
    const work = { orgId: a.orgId, conversationId: conv._id, lease: "lease-1" };
    await t.mutation(internal.ai.queue.claim, work);
    const replyId = await t.mutation(internal.ai.queue.finish, {
      ...work,
      reply: "Unsafe unverified claim",
      confidenceScore: 0.4,
      needsHandoff: false,
      model: "gpt-6-luna",
    });
    expect(await t.run((ctx) => ctx.db.get(replyId!))).toMatchObject({
      content:
        "I’ll pass this conversation to the studio team so they can help.",
      deliveryStatus: "queued",
      confidenceScore: 1,
    });
    expect(
      (await a.messages()).find((m) => m.content === "Unsafe unverified claim")
        ?.deliveryStatus,
    ).toBe("withheld");
    expect(
      await a.owner.query(api.ai.conversations.getConversation, {
        orgId: a.orgId,
        conversationId: conv._id,
      }),
    ).toMatchObject({ status: "handed_off" });
    expect(
      await a.owner.query(api.dashboardNotifications.list, { orgId: a.orgId }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "ai_handoff",
          conversationId: conv._id,
        }),
      ]),
    );
    await a.ingest("mid-2", "Please ask the team");
    expect((await a.messages()).filter((m) => m.role === "user")).toHaveLength(
      2,
    );
    expect(
      await t.mutation(internal.ai.queue.claim, { ...work, lease: "lease-2" }),
    ).toBeNull();
  });

  test("a staff takeover during generation prevents the AI reply and can resume for the next message", async () => {
    const t = createBackend(),
      a = await studio(t);
    const conv = await a.ingest("mid-1", "Hello");
    const work = { orgId: a.orgId, conversationId: conv._id, lease: "lease" };
    await t.mutation(internal.ai.queue.claim, work);
    await expect(
      t.mutation(api.ai.conversations.handoffConversation, {
        orgId: a.orgId,
        conversationId: conv._id,
        reason: "Attack",
      }),
    ).rejects.toThrow("Unauthenticated");
    await a.owner.mutation(api.ai.conversations.handoffConversation, {
      orgId: a.orgId,
      conversationId: conv._id,
      reason: "Staff takeover",
    });
    expect(
      await t.mutation(internal.ai.queue.finish, {
        ...work,
        reply: "stale reply",
        confidenceScore: 1,
        needsHandoff: false,
        model: "gpt-6-luna",
      }),
    ).toBeNull();
    await a.owner.mutation(api.ai.conversations.resumeConversation, {
      orgId: a.orgId,
      conversationId: conv._id,
    });
    expect(
      await t.mutation(internal.ai.queue.claim, { ...work, lease: "next" }),
    ).toBeNull();
    await a.ingest("mid-2", "A new question");
    expect(
      await t.mutation(internal.ai.queue.claim, { ...work, lease: "next" }),
    ).toBeTruthy();
  });

  test("attachments and expired messages hand off without a model call", async () => {
    const t = createBackend(),
      a = await studio(t);
    const attachment = await a.ingest("image", "", "attachment-client", {
      unsupported: true,
    });
    const expired = await a.ingest("old", "Hello", "old-client", {
      timestamp: NOW - 25 * 3_600_000,
    });
    for (const conv of [attachment, expired])
      expect(await t.run((ctx) => ctx.db.get(conv._id))).toMatchObject({
        status: "handed_off",
      });
  });

  test("does not resend a message after uncertain delivery, and a matching echo reconciles it", async () => {
    const t = createBackend(),
      a = await studio(t);
    const conv = await a.ingest("mid-1", "Hello");
    const work = { orgId: a.orgId, conversationId: conv._id, lease: "lease" };
    await t.mutation(internal.ai.queue.claim, work);
    const replyId = (await t.mutation(internal.ai.queue.finish, {
      ...work,
      reply: "Hello from the studio",
      confidenceScore: 1,
      needsHandoff: false,
      model: "gpt-6-luna",
    }))!;
    expect(
      await t.mutation(internal.ai.delivery.claim, {
        orgId: a.orgId,
        messageId: replyId,
      }),
    ).toMatchObject({ content: "Hello from the studio" });
    await t.mutation(internal.ai.delivery.complete, {
      orgId: a.orgId,
      messageId: replyId,
      status: "uncertain",
    });
    expect(
      await t.mutation(internal.ai.delivery.claim, {
        orgId: a.orgId,
        messageId: replyId,
      }),
    ).toBeNull();
    await a.ingest("echo-1", "Hello from the studio", "client", { echo: true });
    expect(await t.run((ctx) => ctx.db.get(replyId))).toMatchObject({
      deliveryStatus: "sent",
      providerMessageId: "echo-1",
    });
  });

  test("confirms a quoted slot atomically, books once, and does not inflate completed visits", async () => {
    const t = createBackend(),
      a = await studio(t);
    const conv = await a.ingest(
      "mid-1",
      "Please book Gel nails. My name is Ana and my phone is +38970111222.",
    );
    const work = {
      orgId: a.orgId,
      conversationId: conv._id,
      lease: "proposal",
    };
    await t.mutation(internal.ai.queue.claim, work);
    const slots = await t.query(internal.ai.booking.availability, {
      ...work,
      serviceId: a.serviceId,
      date: "2026-09-29",
    });
    expect(slots.length).toBeGreaterThan(0);
    const reply = await t.mutation(internal.ai.booking.prepare, {
      ...work,
      serviceId: a.serviceId,
      staffId: a.staffId,
      startAt: slots[0].startAt,
      customerName: "Ana",
      customerPhone: "+38970111222",
    });
    expect(
      await t.run((ctx) =>
        ctx.db
          .query("bookings")
          .withIndex("by_org", (q) => q.eq("orgId", a.orgId))
          .collect(),
      ),
    ).toHaveLength(0);
    await t.mutation(internal.ai.delivery.complete, {
      orgId: a.orgId,
      messageId: reply,
      status: "sent",
      providerMessageId: "proposal-sent",
    });
    await t.mutation(internal.ai.queue.release, work);
    vi.setSystemTime(NOW + 2_000);
    await a.ingest("confirm-1", "Confirm");
    const confirmationWork = { ...work, lease: "confirmation" };
    await t.mutation(internal.ai.queue.claim, confirmationWork);
    expect(
      await t.mutation(internal.ai.booking.confirm, confirmationWork),
    ).toContain("appointment is confirmed");
    expect(
      await t.mutation(internal.ai.booking.confirm, confirmationWork),
    ).toContain("already confirmed");
    await a.ingest("confirm-1", "Confirm");
    const bookings = await t.run((ctx) =>
      ctx.db
        .query("bookings")
        .withIndex("by_org", (q) => q.eq("orgId", a.orgId))
        .collect(),
    );
    expect(bookings).toHaveLength(1);
    expect(bookings[0]).toMatchObject({
      source: "ai_instagram",
      status: "confirmed",
      startAt: slots[0].startAt,
      priceMinorUnits: 120_000,
    });
    expect(
      await t.run((ctx) => ctx.db.get(bookings[0].customerId)),
    ).toMatchObject({
      totalVisits: 0,
      totalSpendMinorUnits: 0,
      marketingOptIn: false,
    });
  });

  test("rechecks availability and price at confirmation and rejects unsent proposals", async () => {
    const t = createBackend(),
      a = await studio(t);
    const conv = await a.ingest(
      "mid-1",
      "Ana +38970111222 please book Gel nails tomorrow",
    );
    const work = {
      orgId: a.orgId,
      conversationId: conv._id,
      lease: "proposal",
    };
    await t.mutation(internal.ai.queue.claim, work);
    const slots = await t.query(internal.ai.booking.availability, {
      ...work,
      serviceId: a.serviceId,
      date: "2026-09-29",
    });
    await t.mutation(internal.ai.booking.prepare, {
      ...work,
      serviceId: a.serviceId,
      staffId: a.staffId,
      startAt: slots[0].startAt,
      customerName: "Ana",
      customerPhone: "+38970111222",
    });
    await t.mutation(internal.ai.queue.release, work);
    vi.setSystemTime(NOW + 2_000);
    await a.ingest("confirm", "Confirm");
    const next = { ...work, lease: "confirm" };
    await t.mutation(internal.ai.queue.claim, next);
    expect(await t.mutation(internal.ai.booking.confirm, next)).toContain(
      "not been booked",
    );
    expect(
      await t.run((ctx) =>
        ctx.db
          .query("bookings")
          .withIndex("by_org", (q) => q.eq("orgId", a.orgId))
          .collect(),
      ),
    ).toHaveLength(0);
  });

  test("OAuth state is single-use, expires, and disconnect clears credentials", async () => {
    const t = createBackend(),
      a = await studio(t);
    await t.mutation(internal.ai.connections.beginOAuth, {
      orgId: a.orgId,
      userId: a.userId,
      stateHash: "one",
    });
    await expect(
      t.mutation(internal.ai.connections.consumeOAuth, {
        orgId: a.orgId,
        stateHash: "wrong",
      }),
    ).rejects.toThrow("expired");
    await t.mutation(internal.ai.connections.consumeOAuth, {
      orgId: a.orgId,
      stateHash: "one",
    });
    await expect(
      t.mutation(internal.ai.connections.consumeOAuth, {
        orgId: a.orgId,
        stateHash: "one",
      }),
    ).rejects.toThrow("expired");
    await a.owner.mutation(api.ai.connections.disconnect, {});
    expect(
      await t.query(internal.ai.connections.getInternal, { orgId: a.orgId }),
    ).toMatchObject({ status: "disconnected" });
    expect(
      (await t.query(internal.ai.connections.getInternal, { orgId: a.orgId }))
        ?.tokenCiphertext,
    ).toBeUndefined();
    expect(await a.owner.query(api.ai.connections.getStatus, {})).toMatchObject(
      { ready: false, connected: false },
    );
  });
  test("two customers cannot confirm the same slot", async () => {
    const t = createBackend(),
      a = await studio(t);
    const proposals = [];
    for (const sender of ["alice", "bob"]) {
      const conv = await a.ingest(
        `${sender}-request`,
        "Ana +38970111222 please book Gel nails",
        sender,
      );
      const work = {
        orgId: a.orgId,
        conversationId: conv._id,
        lease: `${sender}-proposal`,
      };
      await t.mutation(internal.ai.queue.claim, work);
      const slots = await t.query(internal.ai.booking.availability, {
        ...work,
        serviceId: a.serviceId,
        date: "2026-09-29",
      });
      const reply = await t.mutation(internal.ai.booking.prepare, {
        ...work,
        serviceId: a.serviceId,
        staffId: a.staffId,
        startAt: slots[0].startAt,
        customerName: "Ana",
        customerPhone: "+38970111222",
      });
      await t.mutation(internal.ai.delivery.complete, {
        orgId: a.orgId,
        messageId: reply,
        status: "sent",
        providerMessageId: `${sender}-proposal`,
      });
      await t.mutation(internal.ai.queue.release, work);
      proposals.push({ sender, work });
    }
    vi.setSystemTime(NOW + 2_000);
    for (const { sender, work } of proposals) {
      await a.ingest(`${sender}-confirm`, "Confirm", sender);
      await t.mutation(internal.ai.queue.claim, {
        ...work,
        lease: `${sender}-confirm`,
      });
    }
    const results = await Promise.all(
      proposals.map(({ sender, work }) =>
        t.mutation(internal.ai.booking.confirm, {
          ...work,
          lease: `${sender}-confirm`,
        }),
      ),
    );
    expect(
      results.filter((r) => r?.includes("appointment is confirmed")),
    ).toHaveLength(1);
    expect(results.filter((r) => r?.includes("not been booked"))).toHaveLength(
      1,
    );
    expect(
      await t.run((ctx) =>
        ctx.db
          .query("bookings")
          .withIndex("by_org", (q) => q.eq("orgId", a.orgId))
          .collect(),
      ),
    ).toHaveLength(1);
  });

  test("a price change requires a fresh proposal and customer confirmation", async () => {
    const t = createBackend(),
      a = await studio(t);
    const conv = await a.ingest(
      "request",
      "Ana +38970111222 please book Gel nails",
    );
    const work = {
      orgId: a.orgId,
      conversationId: conv._id,
      lease: "proposal",
    };
    await t.mutation(internal.ai.queue.claim, work);
    const slots = await t.query(internal.ai.booking.availability, {
      ...work,
      serviceId: a.serviceId,
      date: "2026-09-29",
    });
    const reply = await t.mutation(internal.ai.booking.prepare, {
      ...work,
      serviceId: a.serviceId,
      staffId: a.staffId,
      startAt: slots[0].startAt,
      customerName: "Ana",
      customerPhone: "+38970111222",
    });
    await t.mutation(internal.ai.delivery.complete, {
      orgId: a.orgId,
      messageId: reply,
      status: "sent",
      providerMessageId: "sent",
    });
    await t.mutation(internal.ai.queue.release, work);
    await t.run((ctx) =>
      ctx.db.patch(a.serviceId, { priceMinorUnits: 200_000 }),
    );
    vi.setSystemTime(NOW + 2_000);
    await a.ingest("confirmation", "Confirm");
    const next = { ...work, lease: "confirm" };
    await t.mutation(internal.ai.queue.claim, next);
    expect(await t.mutation(internal.ai.booking.confirm, next)).toContain(
      "not been booked",
    );
    expect(
      await t.run((ctx) =>
        ctx.db
          .query("bookings")
          .withIndex("by_org", (q) => q.eq("orgId", a.orgId))
          .collect(),
      ),
    ).toHaveLength(0);
  });

  test("disabling AI during generation prevents delivery; stalled workers notify the team", async () => {
    const t = createBackend(),
      a = await studio(t);
    const conv = await a.ingest("hello", "Hello");
    const work = { orgId: a.orgId, conversationId: conv._id, lease: "worker" };
    await t.mutation(internal.ai.queue.claim, work);
    const reply = (await t.mutation(internal.ai.queue.finish, {
      ...work,
      reply: "Hello!",
      confidenceScore: 1,
      needsHandoff: false,
      model: "gpt-6-luna",
    }))!;
    await a.owner.mutation(api.orgSettings.updateAiSettings, {
      orgId: a.orgId,
      aiEnabled: false,
      aiPersonaName: "Aria",
      aiConfidenceThreshold: 0.8,
    });
    expect(
      await t.mutation(internal.ai.delivery.claim, {
        orgId: a.orgId,
        messageId: reply,
      }),
    ).toBeNull();
    expect(await t.run((ctx) => ctx.db.get(reply))).toMatchObject({
      deliveryStatus: "failed",
    });
    vi.setSystemTime(NOW + 181_000);
    await t.mutation(internal.ai.queue.recover, work);
    expect(await t.run((ctx) => ctx.db.get(conv._id))).toMatchObject({
      status: "handed_off",
    });
  });

  test("runs Luna with saved studio context and sends only the validated answer", async () => {
    const t = createBackend(),
      a = await studio(t);
    createResponse.mockResolvedValue({
      status: "completed",
      output: [],
      output_text: JSON.stringify({
        message: "We use Example Gel. Maintenance is usually after 3 weeks.",
        confidenceScore: 0.95,
        handoff: false,
      }),
      usage: { input_tokens: 500, output_tokens: 35 },
    });
    const send = vi.fn<(url: unknown, init: RequestInit) => Promise<Response>>(
      async () =>
        new Response(JSON.stringify({ message_id: "instagram-sent" }), {
          status: 200,
        }),
    );
    vi.stubGlobal("fetch", send);
    const conv = await a.ingest("question", "What gel do you use?");
    await t.action(internal.ai.agent.processConversation, {
      orgId: a.orgId,
      conversationId: conv._id,
    });
    expect(createResponse).toHaveBeenCalledTimes(1);
    const params = createResponse.mock.calls[0][0];
    expect(params).toMatchObject({
      model: "gpt-6-luna",
      store: false,
      reasoning: { effort: "low" },
    });
    expect(params.instructions).toContain("Example Gel");
    expect(JSON.stringify(params)).not.toContain(a.orgId);
    expect(JSON.stringify(params)).not.toContain(a.serviceId);
    expect(send).toHaveBeenCalledTimes(1);
    expect(JSON.parse(send.mock.calls[0][1]!.body as string)).toMatchObject({
      recipient: { id: "client" },
      message: {
        text: "We use Example Gel. Maintenance is usually after 3 weeks.",
      },
    });
    expect(
      (await a.messages()).find(
        (m) => m.providerMessageId === "instagram-sent",
      ),
    ).toMatchObject({ deliveryStatus: "sent", model: "gpt-6-luna" });
  });

  test("executes Luna availability and proposal tools, then confirms without another model call", async () => {
    const t = createBackend(),
      a = await studio(t);
    const response = (name: string, args: unknown, id: string) => ({
      status: "completed",
      output: [
        {
          type: "function_call",
          name,
          call_id: id,
          arguments: JSON.stringify(args),
        },
      ],
      output_text: "",
      usage: { input_tokens: 500, output_tokens: 40 },
    });
    createResponse.mockResolvedValueOnce(
      response(
        "check_availability",
        { service: "service_1", date: "2026-09-29" },
        "availability",
      ),
    );
    createResponse.mockResolvedValueOnce(
      response(
        "prepare_booking",
        {
          service: "service_1",
          slot: "slot_1",
          customerName: "Ana",
          customerPhone: "+38970111222",
        },
        "proposal",
      ),
    );
    let sent = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ message_id: `sent-${++sent}` }), {
            status: 200,
          }),
      ),
    );
    const conv = await a.ingest(
      "request",
      "I want Gel nails tomorrow at 09:00. Ana +38970111222.",
    );
    await t.action(internal.ai.agent.processConversation, {
      orgId: a.orgId,
      conversationId: conv._id,
    });
    expect(createResponse).toHaveBeenCalledTimes(2);
    expect(
      (await a.messages()).find((m) => m.providerMessageId === "sent-1")
        ?.content,
    ).toContain("Reply “Confirm”");
    vi.setSystemTime(NOW + 2_000);
    await a.ingest("confirm", "Confirm");
    await t.action(internal.ai.agent.processConversation, {
      orgId: a.orgId,
      conversationId: conv._id,
    });
    expect(createResponse).toHaveBeenCalledTimes(2);
    expect(
      (await a.messages()).find((m) => m.providerMessageId === "sent-2")
        ?.content,
    ).toContain("appointment is confirmed");
    expect(
      await t.run((ctx) =>
        ctx.db
          .query("bookings")
          .withIndex("by_org", (q) => q.eq("orgId", a.orgId))
          .collect(),
      ),
    ).toHaveLength(1);
  });
});
