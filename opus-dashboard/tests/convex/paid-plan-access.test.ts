import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
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
  const { orgId } = await owner.mutation(api.activation.startBeautyBusiness, {
    name: "Plan Test Studio",
    category: "hair_salon",
  });
  return { owner, orgId };
}

describe("paid-plan feature access", () => {
  let t: TestBackend;

  beforeEach(() => {
    vi.useFakeTimers();
    t = createBackend();
  });
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  test("legacy Free studios retain their existing premium gates", async () => {
    const { owner, orgId } = await createStudio(t);

    await t.run((ctx) => ctx.db.patch(orgId, { trial: undefined }));
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
    ).rejects.toThrow("AI Receptionist requires the paid plan");

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
    ).rejects.toThrow("AI Receptionist requires the paid plan");

    await expect(
      owner.query(api.ai.conversations.listConversations, { orgId }),
    ).rejects.toThrow("AI Receptionist requires the paid plan");
    await expect(
      owner.action(api.ai.agent.preview, { question: "Hello" }),
    ).rejects.toThrow("AI Receptionist requires the paid plan");
  });

  test("new trials grant premium access without recording a paid subscription", async () => {
    const { owner, orgId } = await createStudio(t);
    const org = await t.run((ctx) => ctx.db.get(orgId));
    expect(org?.plan).toBe("free");
    expect(org?.trial).toBeDefined();
    await expect(owner.query(api.users.getMyProfile)).resolves.toMatchObject({
      plan: "paid",
      accessState: "trial",
      trialEndsAt: org!.trial!.endsAt,
    });
    await expect(
      owner.query(api.ai.conversations.listConversations, { orgId }),
    ).resolves.toEqual([]);
    vi.setSystemTime(org!.trial!.endsAt);
    await expect(owner.query(api.users.getMyProfile)).resolves.toMatchObject({
      plan: "free",
      accessState: "expired",
      trialEndsAt: org!.trial!.endsAt,
    });
    await expect(
      owner.query(api.ai.conversations.listConversations, { orgId }),
    ).rejects.toThrow("requires the paid plan");
  });

  test("manually setting paid unlocks authenticated settings and inbox queries", async () => {
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
      owner.query(api.ai.conversations.listConversations, { orgId }),
    ).resolves.toEqual([]);
    await expect(
      t.query(api.ai.conversations.listConversations, { orgId }),
    ).rejects.toThrow("Unauthenticated");
  });
});
