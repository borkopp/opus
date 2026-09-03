import { beforeEach, describe, expect, test } from "vitest";
import { convexTest } from "convex-test";
import { api } from "../../convex/_generated/api";
import schema from "../../convex/schema";
import { convexModules } from "../../convex-test.setup";

const createBackend = () => convexTest(schema, convexModules);
type TestBackend = ReturnType<typeof createBackend>;

const ownerIdentity = {
  subject: "paid-plan-owner",
  email: "owner@example.com",
  name: "Studio Owner",
};

async function createStudio(t: TestBackend) {
  const owner = t.withIdentity(ownerIdentity);
  await owner.mutation(api.users.ensureUser);
  const orgId = await owner.mutation(api.activation.startBeautyBusiness, {
    name: "Plan Test Studio",
    category: "hair_salon",
  });
  return { owner, orgId };
}

describe("paid-plan feature access", () => {
  let t: TestBackend;

  beforeEach(() => {
    t = createBackend();
  });

  test("new studios default to free and premium entry points reject access", async () => {
    const { owner, orgId } = await createStudio(t);

    const storedOrg = await t.run(async (ctx) => ctx.db.get(orgId));
    expect(storedOrg?.plan).toBe("free");
    await expect(owner.query(api.users.getMyProfile)).resolves.toMatchObject({
      orgId,
      plan: "free",
    });

    await expect(
      owner.mutation(api.orgSettings.updateGapOptimizerSettings, {
        orgId,
        gapOptimizerEnabled: true,
        gapOptimizerMinGapMins: 30,
      }),
    ).rejects.toThrow("Gap optimizer requires the paid plan");

    await expect(
      owner.mutation(api.orgSettings.updateAiSettings, {
        orgId,
        aiEnabled: true,
        aiPersonaName: "Aria",
        aiConfidenceThreshold: 0.7,
      }),
    ).rejects.toThrow("AI front desk requires the paid plan");

    await expect(
      owner.query(api.ai.gapOptimizerHelpers.getTodaySummary, { orgId }),
    ).rejects.toThrow("Gap optimizer requires the paid plan");

    await expect(
      owner.action(api.ai.gapOptimizer.scanDayForOrg, {
        orgId,
        detectedBy: "manual_scan",
      }),
    ).rejects.toThrow("Gap optimizer requires the paid plan");

    await expect(
      owner.query(api.dashboard.getAIPerformance, {
        orgId,
        startMs: 0,
        endMs: Date.now(),
      }),
    ).rejects.toThrow("AI front desk requires the paid plan");

    await expect(
      t.mutation(api.ai.conversations.createConversation, {
        orgId,
        channel: "webchat",
        channelThreadId: "free-plan-session",
      }),
    ).rejects.toThrow("AI front desk requires the paid plan");

    const existingConversationId = await t.run(async (ctx) => {
      const now = Date.now();
      return await ctx.db.insert("ai_conversations", {
        orgId,
        channel: "webchat",
        channelThreadId: "pre-downgrade-session",
        status: "active",
        bookingIds: [],
        totalInputTokens: 0,
        totalOutputTokens: 0,
        createdAt: now,
        updatedAt: now,
      });
    });

    await expect(
      t.action(api.ai.agent.processMessagePublic, {
        orgId,
        conversationId: existingConversationId,
        userMessage: "Can I book tomorrow?",
        channel: "webchat",
      }),
    ).rejects.toThrow("AI front desk requires the paid plan");
  });

  test("manually setting paid unlocks settings, queries, and AI runtime creation", async () => {
    const { owner, orgId } = await createStudio(t);

    await t.run(async (ctx) => {
      await ctx.db.patch(orgId, { plan: "paid", updatedAt: Date.now() });
    });

    await expect(owner.query(api.users.getMyProfile)).resolves.toMatchObject({
      orgId,
      plan: "paid",
    });

    await expect(
      owner.mutation(api.orgSettings.updateGapOptimizerSettings, {
        orgId,
        gapOptimizerEnabled: true,
        gapOptimizerMinGapMins: 45,
      }),
    ).resolves.toBe(true);

    await expect(
      owner.mutation(api.orgSettings.updateAiSettings, {
        orgId,
        aiEnabled: true,
        aiPersonaName: "Aria",
        aiConfidenceThreshold: 0.75,
        aiWebchatEnabled: true,
      }),
    ).resolves.toBe(true);

    await expect(
      owner.query(api.ai.gapOptimizerHelpers.getTodaySummary, { orgId }),
    ).resolves.toMatchObject({ enabled: true });

    await expect(
      owner.query(api.dashboard.getAIPerformance, {
        orgId,
        startMs: 0,
        endMs: Date.now(),
      }),
    ).resolves.toMatchObject({ aiEnabled: true });

    await expect(
      t.mutation(api.ai.conversations.createConversation, {
        orgId,
        channel: "webchat",
        channelThreadId: "paid-plan-session",
      }),
    ).resolves.toBeDefined();
  });
});
