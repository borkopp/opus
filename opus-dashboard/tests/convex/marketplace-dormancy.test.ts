import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { convexTest } from "convex-test";
import { api, internal } from "../../convex/_generated/api";
import schema from "../../convex/schema";
import { convexModules } from "../../convex-test.setup";

describe("dormant marketplace boundary", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    // Authorized photo import/receptionist credentials must not enable legacy
    // discovery, anonymous chat or unrelated background model spending.
    vi.stubEnv("OPENAI_API_KEY", "test-configured-openai-key");
    vi.stubEnv("ANTHROPIC_API_KEY", "test-configured-anthropic-key");
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  test("rejects public discovery and mobile chat before provider calls or conversation writes", async () => {
    const t = convexTest(schema, convexModules);
    const request = { query: "Find dinner for two", sessionId: "old-client" };
    await expect(
      t.action(api.marketplace.retrieve.retrieve, request),
    ).rejects.toThrow("MARKETPLACE_UNAVAILABLE");
    await expect(
      t.action(api.marketplace.chatMobile.chat, request),
    ).rejects.toThrow("MARKETPLACE_UNAVAILABLE");
    expect(fetchMock).not.toHaveBeenCalled();
    const conversations = await t.run((ctx) =>
      ctx.db.query("marketplace_conversations").collect(),
    );
    expect(conversations).toEqual([]);
  });

  test("blocks public access and forged messages while preserving existing history", async () => {
    const t = convexTest(schema, convexModules);
    const conversationId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("marketplace_conversations", {
        sessionId: "private-legacy-session",
        totalInputTokens: 0,
        totalOutputTokens: 0,
        isDeleted: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      await ctx.db.insert("marketplace_messages", {
        conversationId: id,
        role: "user",
        content: "Preserved private history",
        createdAt: Date.now(),
      });
      return id;
    });
    await expect(
      t.query(api.marketplace.messages.listMessages, { conversationId }),
    ).rejects.toThrow("MARKETPLACE_UNAVAILABLE");
    for (const endpoint of [
      api.marketplace.messages.persistUserTurn,
      api.marketplace.messages.persistAssistantTurn,
    ]) {
      await expect(
        t.mutation(endpoint, { conversationId, content: "Forged message" }),
      ).rejects.toThrow("MARKETPLACE_UNAVAILABLE");
    }
    const messages = await t.run((ctx) =>
      ctx.db
        .query("marketplace_messages")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", conversationId),
        )
        .collect(),
    );
    expect(messages).toHaveLength(1);
    expect(messages[0].content).toBe("Preserved private history");
  });

  test("queued embedding, backfill and reputation jobs do no model or scheduling work", async () => {
    const t = convexTest(schema, convexModules);
    for (const entityType of ["org", "service", "reputation"] as const) {
      await expect(
        t.action(internal.marketplace.embeddings.embedEntity, {
          entityType,
          entityId: "legacy-queued-entity",
        }),
      ).resolves.toEqual({ skipped: "marketplace-disabled" });
    }
    await expect(
      t.action(internal.marketplace.embeddings.backfillAll, {}),
    ).resolves.toMatchObject({ scheduled: 0 });
    await expect(
      t.action(internal.marketplace.embeddings.refreshAllReputations, {}),
    ).resolves.toEqual({ scheduled: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(
      await t.run((ctx) =>
        ctx.db.system.query("_scheduled_functions").collect(),
      ),
    ).toEqual([]);
  });
});
