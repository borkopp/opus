import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { convexTest } from "convex-test";
import { api, internal } from "../../convex/_generated/api";
import schema from "../../convex/schema";
import { convexModules } from "../../convex-test.setup";
import {
  ANALYST_LIMITS,
  ANALYST_MODELS,
  usageMonth,
} from "../../convex/analyst/limits";
import type { AnalysisRequest } from "../../convex/analyst/contracts";

const provider = vi.hoisted(() => ({
  create: vi.fn(),
  delta: vi.fn(),
  abort: vi.fn(),
}));
vi.mock("openai", () => ({
  default: class {
    responses = {
      create: async (params: unknown) => {
        const result = await provider.create(params);
        return {
          controller: { abort: provider.abort },
          async *[Symbol.asyncIterator]() {
            let snapshot = "";
            for (const delta of result.output_text.match(/[\s\S]{1,12}/g) ??
              []) {
              snapshot += delta;
              yield { type: "response.output_text.delta", delta };
              await provider.delta(snapshot);
            }
            yield {
              type: "response.completed",
              response: {
                ...result,
                output: result.output_text
                  ? [
                      ...result.output,
                      {
                        type: "message",
                        role: "assistant",
                        status: "completed",
                        content: [
                          {
                            type: "output_text",
                            text: result.output_text,
                            annotations: [],
                          },
                        ],
                      },
                    ]
                  : result.output,
              },
            };
          },
        };
      },
    };
  },
}));
const createBackend = () => convexTest(schema, convexModules);
type Backend = ReturnType<typeof createBackend>;
const request: AnalysisRequest = {
  metric: "completed_value",
  groupBy: "day",
  period: { preset: "last_month", startDate: null, endDate: null },
  comparison: null,
  staffName: null,
  serviceName: null,
};
const question = {
  question: "What was my weakest day last month?",
  language: "en" as const,
  depth: "standard" as const,
  requestId: "unique-request-0001",
};
const answer = {
  text: "The total was [[r1.total]].",
  reportKeys: ["r1"],
  recommendations: [],
  followUps: [],
};
function response(output: unknown[], output_text = "") {
  return {
    status: "completed",
    output,
    output_text,
    usage: { input_tokens: 1000, output_tokens: 200 },
  };
}
function toolResponse(analysis = request) {
  return response([
    {
      type: "function_call",
      name: "analyse_period",
      call_id: "call_1",
      arguments: JSON.stringify(analysis),
    },
  ]);
}
async function studio(
  t: Backend,
  suffix = "a",
  plan: "free" | "paid" = "paid",
) {
  const owner = t.withIdentity({
    subject: `owner-${suffix}`,
    email: `owner-${suffix}@example.com`,
    name: `Owner ${suffix}`,
  });
  await owner.mutation(api.users.ensureUser);
  const { orgId } = await owner.mutation(api.activation.startBeautyBusiness, {
    name: `Studio ${suffix}`,
    category: "hair_salon",
  });
  const staff = await t.run(async (ctx) => {
    await ctx.db.patch(orgId, { plan });
    return (
      await ctx.db
        .query("staff_members")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .collect()
    )[0];
  });
  const serviceId = await t.run((ctx) =>
    ctx.db.insert("services", {
      orgId,
      name: "Cut",
      durationMins: 60,
      priceMinorUnits: 1200,
      currency: "MKD",
      staffIds: [staff._id],
      isOpusVisible: true,
      isActive: true,
      isDeleted: false,
      popularityScore: 0,
      sortOrder: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  );
  return { owner, orgId, serviceId, staff };
}
async function seedBooking(
  t: Backend,
  setup: Awaited<ReturnType<typeof studio>>,
  currency = "MKD",
  date = "2026-08-03",
) {
  return t.run(async (ctx) => {
    const now = Date.now();
    const customerId = await ctx.db.insert("customers", {
      orgId: setup.orgId,
      name: "PRIVATE_CLIENT_NAME",
      email: "private@example.com",
      phone: "+38970111111",
      totalVisits: 1,
      totalSpendMinorUnits: 1200,
      noShowCount: 0,
      noShowRiskScore: 0,
      whatsappOptIn: false,
      marketingOptIn: false,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });
    const startAt = Date.parse(`${date}T10:00:00Z`);
    return ctx.db.insert("bookings", {
      orgId: setup.orgId,
      customerId,
      staffId: setup.staff._id,
      serviceId: setup.serviceId,
      startAt,
      endAt: startAt + 3600000,
      priceMinorUnits: 1200,
      currency,
      status: "completed",
      source: "manual",
      staffNote: "PRIVATE_BOOKING_NOTE",
      surgePriceApplied: false,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });
  });
}
async function usage(
  t: Backend,
  orgId: Awaited<ReturnType<typeof studio>>["orgId"],
) {
  return t.run((ctx) =>
    ctx.db
      .query("analyst_usage")
      .withIndex("by_org_month", (q) =>
        q.eq("orgId", orgId).eq("monthStartMs", usageMonth(Date.now()).startMs),
      )
      .first(),
  );
}

describe("AI Assistant access, usage and workers", { timeout: 20000 }, () => {
  let t: Backend;
  beforeEach(() => {
    t = createBackend();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-16T10:00:00Z"));
    vi.stubEnv("BUSINESS_ANALYST_ENABLED", "true");
    vi.stubEnv("BUSINESS_ANALYST_OPENAI_API_KEY", "test-key-never-sent");
    provider.create.mockReset();
    provider.delta.mockReset();
    provider.abort.mockReset();
  });
  afterEach(async () => {
    // Drain the action and expiry jobs so no work leaks into another test.
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });
  test("requires configuration and manager/owner membership on both plans", async () => {
    const s = await studio(t);
    vi.stubEnv("BUSINESS_ANALYST_ENABLED", "false");
    await expect(
      s.owner.mutation(api.analyst.conversations.send, question),
    ).rejects.toThrow("ANALYST_NOT_CONFIGURED");
    await t.run((ctx) => ctx.db.patch(s.orgId, { plan: "free" }));
    await expect(
      s.owner.mutation(api.analyst.conversations.send, question),
    ).rejects.toThrow("ANALYST_NOT_CONFIGURED");
    await t.run(async (ctx) => {
      await ctx.db.patch(s.orgId, { plan: "paid" });
      await ctx.db.patch(s.staff._id, { role: "staff" });
    });
    await expect(
      s.owner.mutation(api.analyst.conversations.send, question),
    ).rejects.toThrow();
    expect(provider.create).not.toHaveBeenCalled();
  });
  test("Free rejects Detailed requests before reserving allowance or calling the provider", async () => {
    const s = await studio(t, "a", "free");
    expect(
      await s.owner.query(api.analyst.conversations.getAccess),
    ).toMatchObject({
      allowed: true,
      paid: false,
      remaining: 3,
      limit: 3,
      deepRemaining: 0,
      deepLimit: 0,
      deepBudgetAvailable: false,
      busy: false,
    });
    await expect(
      s.owner.mutation(api.analyst.conversations.send, {
        ...question,
        depth: "deep",
      }),
    ).rejects.toThrow("ANALYST_DETAILED_PLAN_REQUIRED");
    expect(await usage(t, s.orgId)).toBeNull();
    expect(await s.owner.query(api.analyst.conversations.list)).toEqual([]);
    expect(provider.create).not.toHaveBeenCalled();
  });
  test("Free shares three Fast answers across owners, managers and conversations, then resets next month", async () => {
    const s = await studio(t, "a", "free");
    const manager = await studio(t, "manager");
    await t.run(async (ctx) => {
      await ctx.db.patch(manager.staff._id, {
        orgId: s.orgId,
        role: "manager",
      });
      await ctx.db.patch(manager.staff.userId!, { activeOrgId: s.orgId });
    });
    provider.create.mockResolvedValue(
      response(
        [],
        JSON.stringify({
          text: "Which period would you like to explore?",
          reportKeys: [],
          recommendations: [],
          followUps: [],
        }),
      ),
    );
    for (let i = 0; i < 3; i++) {
      const author = i === 1 ? manager.owner : s.owner;
      const input = { ...question, requestId: `free-request-000${i}` };
      const sent = await author.mutation(api.analyst.conversations.send, input);
      expect(
        await author.mutation(api.analyst.conversations.send, input),
      ).toEqual(sent);
      expect(
        await s.owner.query(api.analyst.conversations.getAccess),
      ).toMatchObject({
        remaining: 2 - i,
        busy: true,
      });
      await t.action(internal.analyst.agent.run, { turnId: sent.turnId });
      expect(
        await author.query(api.analyst.conversations.get, {
          conversationId: sent.conversationId,
        }),
      ).toMatchObject({
        turns: [{ status: "completed", depth: "standard" }],
      });
    }
    expect(await usage(t, s.orgId)).toMatchObject({
      answers: 3,
      deepAnswers: 0,
      reservedMicroUsd: 0,
    });
    for (const author of [s.owner, manager.owner]) {
      expect(
        await author.query(api.analyst.conversations.getAccess),
      ).toMatchObject({ remaining: 0, busy: false });
      await expect(
        author.mutation(api.analyst.conversations.send, {
          ...question,
          requestId: "free-request-over-limit",
        }),
      ).rejects.toThrow("ANALYST_ALLOWANCE_REACHED");
    }
    expect(provider.create).toHaveBeenCalledTimes(3);
    expect(await s.owner.query(api.analyst.conversations.list)).toHaveLength(2);
    expect(
      await manager.owner.query(api.analyst.conversations.list),
    ).toHaveLength(1);
    vi.setSystemTime(new Date("2026-10-01T00:00:00Z"));
    expect(
      await s.owner.query(api.analyst.conversations.getAccess),
    ).toMatchObject({
      remaining: 3,
      resetAt: Date.parse("2026-11-01T00:00:00Z"),
    });
    const next = await s.owner.mutation(api.analyst.conversations.send, {
      ...question,
      requestId: "free-request-new-month",
    });
    await t.action(internal.analyst.agent.run, { turnId: next.turnId });
    expect(await usage(t, s.orgId)).toMatchObject({ answers: 1 });
  });
  test("Free reserves the final answer before a simultaneous submission can use it", async () => {
    const s = await studio(t, "a", "free");
    await t.run((ctx) =>
      ctx.db.insert("analyst_usage", {
        orgId: s.orgId,
        monthStartMs: usageMonth(Date.now()).startMs,
        answers: 2,
        deepAnswers: 0,
        spentMicroUsd: 0,
        reservedMicroUsd: 0,
        updatedAt: Date.now(),
      }),
    );
    const attempts = await Promise.allSettled(
      ["free-concurrent-0001", "free-concurrent-0002"].map((requestId) =>
        s.owner.mutation(api.analyst.conversations.send, {
          ...question,
          requestId,
        }),
      ),
    );
    expect(
      attempts.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      attempts.filter((result) => result.status === "rejected"),
    ).toHaveLength(1);
    expect(await usage(t, s.orgId)).toMatchObject({
      answers: 3,
      reservedMicroUsd: ANALYST_MODELS.standard.reservation,
    });
  });
  test("Free failures refund the prompt once and retain billable cost", async () => {
    const s = await studio(t, "a", "free");
    provider.create.mockRejectedValueOnce(new Error("Provider unavailable"));
    const { turnId } = await s.owner.mutation(
      api.analyst.conversations.send,
      question,
    );
    await t.action(internal.analyst.agent.run, { turnId });
    await t.action(internal.analyst.agent.run, { turnId });
    expect(await usage(t, s.orgId)).toMatchObject({
      answers: 0,
      deepAnswers: 0,
      reservedMicroUsd: 0,
      spentMicroUsd: ANALYST_MODELS.standard.reservation,
    });
    expect(
      await s.owner.query(api.analyst.conversations.getAccess),
    ).toMatchObject({ remaining: 3 });
    expect(provider.create).toHaveBeenCalledTimes(1);
  });
  test("plan changes keep existing usage and preserve the Pro allowance", async () => {
    const s = await studio(t, "a", "free");
    await t.run((ctx) =>
      ctx.db.insert("analyst_usage", {
        orgId: s.orgId,
        monthStartMs: usageMonth(Date.now()).startMs,
        answers: 3,
        deepAnswers: 0,
        spentMicroUsd: 0,
        reservedMicroUsd: 0,
        updatedAt: Date.now(),
      }),
    );
    await t.run((ctx) => ctx.db.patch(s.orgId, { plan: "paid" }));
    expect(
      await s.owner.query(api.analyst.conversations.getAccess),
    ).toMatchObject({
      remaining: 197,
      limit: 200,
      deepRemaining: 20,
      deepLimit: 20,
    });
    const { turnId } = await s.owner.mutation(api.analyst.conversations.send, {
      ...question,
      depth: "deep",
    });
    await t.run((ctx) => ctx.db.patch(s.orgId, { plan: "free" }));
    await t.action(internal.analyst.agent.run, { turnId });
    expect(provider.create).not.toHaveBeenCalled();
    expect(await usage(t, s.orgId)).toMatchObject({
      answers: 3,
      deepAnswers: 0,
      reservedMicroUsd: 0,
    });
    expect(
      await s.owner.query(api.analyst.conversations.getAccess),
    ).toMatchObject({ remaining: 0, limit: 3 });
  });
  test.each(["standard", "deep"] as const)(
    "downgrade blocks an in-flight %s answer beyond Free access",
    async (depth) => {
      const s = await studio(t);
      await t.run((ctx) =>
        ctx.db.insert("analyst_usage", {
          orgId: s.orgId,
          monthStartMs: usageMonth(Date.now()).startMs,
          answers: 3,
          deepAnswers: 0,
          spentMicroUsd: 0,
          reservedMicroUsd: 0,
          updatedAt: Date.now(),
        }),
      );
      const { turnId } = await s.owner.mutation(
        api.analyst.conversations.send,
        { ...question, depth },
      );
      provider.create.mockImplementationOnce(async () => {
        await t.run((ctx) => ctx.db.patch(s.orgId, { plan: "free" }));
        return response(
          [],
          JSON.stringify({
            text: "Here is your answer.",
            reportKeys: [],
            recommendations: [],
            followUps: [],
          }),
        );
      });
      await t.action(internal.analyst.agent.run, { turnId });
      expect(provider.create).toHaveBeenCalledTimes(1);
      expect(await t.run((ctx) => ctx.db.get(turnId))).toMatchObject({
        status: "failed",
        errorCode: "ANALYST_ACCESS_CHANGED",
      });
      expect(await usage(t, s.orgId)).toMatchObject({
        answers: 3,
        deepAnswers: 0,
        reservedMicroUsd: 0,
      });
    },
  );
  test("replays the same request exactly once and rejects changed content", async () => {
    const s = await studio(t);
    const first = await s.owner.mutation(
      api.analyst.conversations.send,
      question,
    );
    expect(
      await s.owner.mutation(api.analyst.conversations.send, question),
    ).toEqual(first);
    await expect(
      s.owner.mutation(api.analyst.conversations.send, {
        ...question,
        question: "Different",
      }),
    ).rejects.toThrow("ANALYST_REQUEST_CONFLICT");
    expect(await usage(t, s.orgId)).toMatchObject({
      answers: 1,
      reservedMicroUsd: ANALYST_MODELS.standard.reservation,
    });
  });
  test.each(["free", "paid"] as const)(
    "%s: conversations and saved reports cannot be read across tenants",
    async (plan) => {
      const a = await studio(t, "a", plan),
        b = await studio(t, "b", plan);
      const sent = await a.owner.mutation(
        api.analyst.conversations.send,
        question,
      );
      await expect(
        b.owner.query(api.analyst.conversations.get, {
          conversationId: sent.conversationId,
        }),
      ).rejects.toThrow("ANALYST_NOT_FOUND");
      await expect(
        b.owner.query(api.analyst.conversations.getReport, {
          turnId: sent.turnId,
        }),
      ).rejects.toThrow("ANALYST_NOT_FOUND");
      await expect(
        b.owner.mutation(api.analyst.conversations.send, {
          ...question,
          conversationId: sent.conversationId,
        }),
      ).rejects.toThrow("ANALYST_NOT_FOUND");
      expect(await b.owner.query(api.analyst.conversations.list)).toEqual([]);
    },
  );
  test.each(["free", "paid"] as const)(
    "%s: managers have their own private history within the same studio",
    async (plan) => {
      const a = await studio(t, "a", plan),
        b = await studio(t, "b", plan);
      await t.run(async (ctx) => {
        await ctx.db.patch(b.staff._id, { orgId: a.orgId, role: "manager" });
        await ctx.db.patch(b.staff.userId!, { activeOrgId: a.orgId });
      });
      const sent = await a.owner.mutation(
        api.analyst.conversations.send,
        question,
      );
      expect(await b.owner.query(api.analyst.conversations.list)).toEqual([]);
      await expect(
        b.owner.query(api.analyst.conversations.get, {
          conversationId: sent.conversationId,
        }),
      ).rejects.toThrow("ANALYST_NOT_FOUND");
      expect(
        await b.owner.query(api.analyst.conversations.getAccess),
      ).toMatchObject({
        allowed: true,
        remaining: plan === "paid" ? 199 : 2,
        busy: true,
      });
    },
  );
  test("schedule writes preserve history and feed the dashboard's real capacity", async () => {
    vi.setSystemTime(new Date("2026-09-13T10:00:00Z"));
    const s = await studio(t);
    for (const dayOfWeek of [1, 2, 3])
      await s.owner.mutation(api.availability.setAvailabilityRule, {
        orgId: s.orgId,
        staffId: s.staff._id,
        dayOfWeek,
        startTime: "09:00",
        endTime: "17:00",
        breaks: [{ startTime: "12:00", endTime: "13:00" }],
        isActive: true,
      });
    vi.setSystemTime(new Date("2026-09-14T10:00:00Z"));
    await s.owner.mutation(api.availabilityOverrides.createOverride, {
      orgId: s.orgId,
      staffId: s.staff._id,
      date: "2026-09-15",
      type: "day_off",
    });
    vi.setSystemTime(new Date("2026-09-16T10:00:00Z"));
    await seedBooking(t, s, "MKD", "2026-09-14");
    const widget = await s.owner.query(api.dashboard.getStaffUtilisation);
    expect(widget[0]).toMatchObject({
      bookedMins: 60,
      availableMins: 840,
      utilisationPct: 7.14,
    });
    const { turnId } = await s.owner.mutation(
      api.analyst.conversations.send,
      question,
    );
    await t.mutation(internal.analyst.conversations.claim, { turnId });
    const report = await t.query(internal.analyst.analytics.analyse, {
      turnId,
      request: {
        ...request,
        metric: "utilisation",
        groupBy: "staff",
        period: { preset: "this_week", startDate: null, endDate: null },
      },
      key: "r1",
    });
    expect(report.total.value).toBe(widget[0].utilisationPct);
    expect(report.total.availableMinutes).toBe(widget[0].availableMins);
    const versions = await t.run((ctx) =>
      ctx.db
        .query("analyst_schedule_versions")
        .withIndex("by_org", (q) => q.eq("orgId", s.orgId))
        .collect(),
    );
    expect(versions.length).toBeGreaterThan(3);
    expect(versions[0].schedule.overrides).toEqual([]);
  });
  test("dedicated worker queries contain only the author's tenant", async () => {
    const a = await studio(t),
      b = await studio(t, "b");
    await seedBooking(t, a);
    await seedBooking(t, b);
    const { turnId } = await a.owner.mutation(
      api.analyst.conversations.send,
      question,
    );
    await t.mutation(internal.analyst.conversations.claim, { turnId });
    const report = await t.query(internal.analyst.analytics.analyse, {
      turnId,
      request,
      key: "r1",
    });
    expect(report.total).toMatchObject({ value: 1200, appointments: 1 });
  });
  test.each(["free", "paid"] as const)(
    "%s: one in-flight analysis survives a UTC month rollover",
    async (plan) => {
      vi.setSystemTime(new Date("2026-09-30T23:59:00Z"));
      const s = await studio(t, "a", plan);
      await s.owner.mutation(api.analyst.conversations.send, question);
      vi.setSystemTime(new Date("2026-10-01T00:00:00Z"));
      await expect(
        s.owner.mutation(api.analyst.conversations.send, {
          ...question,
          requestId: "unique-request-0002",
        }),
      ).rejects.toThrow("ANALYST_BUSY");
    },
  );
  test.each(["answers", "deepAnswers", "spentMicroUsd"] as const)(
    "enforces the %s ceiling before a provider call",
    async (field) => {
      const s = await studio(t);
      await t.run((ctx) =>
        ctx.db.insert("analyst_usage", {
          orgId: s.orgId,
          monthStartMs: usageMonth(Date.now()).startMs,
          answers: 0,
          deepAnswers: 0,
          spentMicroUsd: 0,
          reservedMicroUsd: 0,
          updatedAt: Date.now(),
          [field]:
            field === "spentMicroUsd"
              ? ANALYST_LIMITS.monthlyMicroUsd
              : field === "answers"
                ? 200
                : 20,
        }),
      );
      await expect(
        s.owner.mutation(api.analyst.conversations.send, {
          ...question,
          depth: "deep",
        }),
      ).rejects.toThrow("ANALYST_ALLOWANCE_REACHED");
      expect(provider.create).not.toHaveBeenCalled();
    },
  );
  test.each(["free", "paid"] as const)(
    "%s: worker resolves exact facts, saves evidence, accounts usage and excludes PII",
    async (plan) => {
      const s = await studio(t, "a", plan);
      const bookingId = await seedBooking(t, s);
      provider.create
        .mockResolvedValueOnce(toolResponse())
        .mockResolvedValueOnce(response([], JSON.stringify(answer)));
      const { turnId, conversationId } = await s.owner.mutation(
        api.analyst.conversations.send,
        question,
      );
      await t.action(internal.analyst.agent.run, { turnId });
      const result = await s.owner.query(api.analyst.conversations.get, {
        conversationId,
      });
      expect(result.turns[0]).toMatchObject({
        status: "completed",
        answer: { reportKeys: ["r1"] },
      });
      expect(result.turns[0].answer?.text).toContain("12.00");
      expect(
        await s.owner.query(api.analyst.conversations.getReport, { turnId }),
      ).toMatchObject({ reports: [{ total: { value: 1200 } }] });
      expect(await usage(t, s.orgId)).toMatchObject({
        answers: 1,
        reservedMicroUsd: 0,
        spentMicroUsd: 880,
      });
      const payloads = JSON.stringify(provider.create.mock.calls);
      for (const secret of [
        bookingId,
        s.orgId,
        s.staff._id,
        "PRIVATE_CLIENT_NAME",
        "private@example.com",
        "+38970111111",
        "PRIVATE_BOOKING_NOTE",
      ])
        expect(payloads).not.toContain(secret);
      expect(provider.create.mock.calls[0][0]).toMatchObject({
        store: false,
        model: ANALYST_MODELS.standard.name,
      });
      // Saved facts are a snapshot even if booking status changes afterwards.
      await t.run((ctx) => ctx.db.patch(bookingId, { status: "cancelled" }));
      expect(
        (await s.owner.query(api.analyst.conversations.getReport, { turnId }))
          .reports[0].total.value,
      ).toBe(1200);
    },
  );
  test.each(["free", "paid"] as const)(
    "%s: permission revocation stops the provider and refunds the answer allowance",
    async (plan) => {
      const s = await studio(t, "a", plan);
      const { turnId } = await s.owner.mutation(
        api.analyst.conversations.send,
        question,
      );
      await t.run((ctx) => ctx.db.patch(s.staff._id, { role: "staff" }));
      await t.action(internal.analyst.agent.run, { turnId });
      expect(provider.create).not.toHaveBeenCalled();
      expect(await usage(t, s.orgId)).toMatchObject({
        answers: 0,
        reservedMicroUsd: 0,
      });
    },
  );
  test("failed calls release reservations once and preserve conservative cost accounting", async () => {
    const s = await studio(t);
    provider.create.mockRejectedValueOnce(
      new Error("Provider failure with PRIVATE detail"),
    );
    const { turnId } = await s.owner.mutation(api.analyst.conversations.send, {
      ...question,
      depth: "deep",
    });
    await t.action(internal.analyst.agent.run, { turnId });
    await t.action(internal.analyst.agent.run, { turnId });
    expect(provider.create).toHaveBeenCalledTimes(1);
    expect(await usage(t, s.orgId)).toMatchObject({
      answers: 0,
      deepAnswers: 0,
      reservedMicroUsd: 0,
      spentMicroUsd: ANALYST_MODELS.deep.reservation,
    });
    expect(await t.run((ctx) => ctx.db.get(turnId))).toMatchObject({
      status: "failed",
      errorCode: "ANALYST_PROVIDER_UNAVAILABLE",
    });
  });
  test.each(["free", "paid"] as const)(
    "%s streams resolved text before completion without spending another prompt",
    async (plan) => {
      const s = await studio(t, "a", plan);
      const other = await studio(t, "other");
      await seedBooking(t, s);
      const rawAnswer = {
        ...answer,
        text: "Your completed appointment value was [[r1.total]]. This reflects recorded appointments, rather than collected payments.",
      };
      provider.create
        .mockResolvedValueOnce(toolResponse())
        .mockResolvedValueOnce(response([], JSON.stringify(rawAnswer)));
      const sent = await s.owner.mutation(
        api.analyst.conversations.send,
        question,
      );
      const partials: string[] = [];
      provider.delta.mockImplementation(async () => {
        vi.setSystemTime(Date.now() + ANALYST_LIMITS.streamIntervalMs);
        const current = await s.owner.query(api.analyst.conversations.get, {
          conversationId: sent.conversationId,
        });
        expect(current.turns[0].status).toBe("running");
        expect(current.turns[0].answer).toBeUndefined();
        expect(current.turns[0].reports).toEqual([]);
        if (current.turns[0].streamedText)
          partials.push(current.turns[0].streamedText);
        expect(await usage(t, s.orgId)).toMatchObject({ answers: 1 });
        await expect(
          other.owner.query(api.analyst.conversations.get, {
            conversationId: sent.conversationId,
          }),
        ).rejects.toThrow("ANALYST_NOT_FOUND");
      });
      await t.action(internal.analyst.agent.run, { turnId: sent.turnId });
      expect(new Set(partials).size).toBeGreaterThan(3);
      expect(partials.some((text) => text.includes("12.00"))).toBe(true);
      for (const text of partials)
        expect(text).not.toMatch(/\[\[|\]\]|reportKeys/);
      const complete = await s.owner.query(api.analyst.conversations.get, {
        conversationId: sent.conversationId,
      });
      expect(complete.turns[0]).toMatchObject({
        status: "completed",
        answer: { reportKeys: ["r1"] },
      });
      expect(complete.turns[0].streamedText).toBeUndefined();
      expect(await usage(t, s.orgId)).toMatchObject({
        answers: 1,
        reservedMicroUsd: 0,
        spentMicroUsd: 880,
      });
      expect(
        provider.create.mock.calls.every(([params]) => params.stream === true),
      ).toBe(true);
    },
  );
  test("bounds stream writes while still saving the complete answer", async () => {
    const s = await studio(t);
    const text = "A useful studio answer. ".repeat(100);
    provider.create.mockResolvedValueOnce(
      response([], JSON.stringify({ ...answer, reportKeys: [], text })),
    );
    const sent = await s.owner.mutation(
      api.analyst.conversations.send,
      question,
    );
    const partials = new Set<string>();
    provider.delta.mockImplementation(async () => {
      vi.setSystemTime(Date.now() + ANALYST_LIMITS.streamIntervalMs);
      const turn = await t.run((ctx) => ctx.db.get(sent.turnId));
      if (turn?.streamedText) partials.add(turn.streamedText);
    });
    await t.action(internal.analyst.agent.run, { turnId: sent.turnId });
    expect(partials.size).toBe(ANALYST_LIMITS.maxStreamUpdates);
    expect(await t.run((ctx) => ctx.db.get(sent.turnId))).toMatchObject({
      status: "completed",
      answer: { text },
    });
  });
  test("a disconnected stream clears the draft and refunds the prompt once", async () => {
    const s = await studio(t, "a", "free");
    provider.create.mockResolvedValueOnce(
      response(
        [],
        JSON.stringify({
          ...answer,
          reportKeys: [],
          text: "I can help you understand your studio and its appointments.",
        }),
      ),
    );
    const sent = await s.owner.mutation(
      api.analyst.conversations.send,
      question,
    );
    provider.delta.mockImplementation(async () => {
      const turn = await t.run((ctx) => ctx.db.get(sent.turnId));
      if (turn?.streamedText) throw new Error("Stream disconnected");
    });
    await t.action(internal.analyst.agent.run, { turnId: sent.turnId });
    await t.action(internal.analyst.agent.run, { turnId: sent.turnId });
    const turn = await t.run((ctx) => ctx.db.get(sent.turnId));
    expect(turn).toMatchObject({
      status: "failed",
      errorCode: "ANALYST_PROVIDER_UNAVAILABLE",
    });
    expect(turn?.streamedText).toBeUndefined();
    expect(provider.abort).toHaveBeenCalledOnce();
    expect(await usage(t, s.orgId)).toMatchObject({
      answers: 0,
      reservedMicroUsd: 0,
      spentMicroUsd: ANALYST_MODELS.standard.reservation,
    });
  });
  test("revoking access during a stream aborts further updates and clears the draft", async () => {
    const s = await studio(t);
    provider.create.mockResolvedValueOnce(
      response(
        [],
        JSON.stringify({
          ...answer,
          reportKeys: [],
          text: "I can help you understand your studio and its appointments.",
        }),
      ),
    );
    const sent = await s.owner.mutation(
      api.analyst.conversations.send,
      question,
    );
    provider.delta.mockImplementation(async () => {
      vi.setSystemTime(Date.now() + ANALYST_LIMITS.streamIntervalMs);
      const turn = await t.run((ctx) => ctx.db.get(sent.turnId));
      if (turn?.streamedText)
        await t.run((ctx) => ctx.db.patch(s.staff._id, { role: "staff" }));
    });
    await t.action(internal.analyst.agent.run, { turnId: sent.turnId });
    const turn = await t.run((ctx) => ctx.db.get(sent.turnId));
    expect(turn).toMatchObject({
      status: "failed",
      errorCode: "ANALYST_ACCESS_CHANGED",
    });
    expect(turn?.streamedText).toBeUndefined();
    expect(provider.abort).toHaveBeenCalledOnce();
    expect(await usage(t, s.orgId)).toMatchObject({
      answers: 0,
      reservedMicroUsd: 0,
    });
  });
  test("invalid streamed figures are withheld and a corrected retry replaces the draft", async () => {
    const s = await studio(t);
    await seedBooking(t, s);
    provider.create
      .mockResolvedValueOnce(toolResponse())
      .mockResolvedValueOnce(
        response(
          [],
          JSON.stringify({
            ...answer,
            text: "Your completed appointment value was 9999 MKD.",
          }),
        ),
      )
      .mockImplementationOnce(async () => {
        const current = await s.owner.query(api.analyst.conversations.get, {
          conversationId: sent.conversationId,
        });
        expect(current.turns[0].streamedText).toBeUndefined();
        return response([], JSON.stringify(answer));
      });
    const sent = await s.owner.mutation(
      api.analyst.conversations.send,
      question,
    );
    provider.delta.mockImplementation(async () => {
      vi.setSystemTime(Date.now() + ANALYST_LIMITS.streamIntervalMs);
      const turn = await t.run((ctx) => ctx.db.get(sent.turnId));
      expect(turn?.streamedText ?? "").not.toMatch(/9999|\[\[|\]\]/);
    });
    await t.action(internal.analyst.agent.run, { turnId: sent.turnId });
    expect(await t.run((ctx) => ctx.db.get(sent.turnId))).toMatchObject({
      status: "completed",
      answer: { text: expect.stringContaining("12.00") },
    });
    expect(await usage(t, s.orgId)).toMatchObject({
      answers: 1,
      spentMicroUsd: 1320,
    });
  });
  test("invalid invented figures cannot become an answer and retries are bounded", async () => {
    const s = await studio(t);
    await seedBooking(t, s);
    provider.create
      .mockResolvedValueOnce(toolResponse())
      .mockResolvedValue(
        response([], JSON.stringify({ ...answer, text: "You made 9999 MKD." })),
      );
    const { turnId } = await s.owner.mutation(
      api.analyst.conversations.send,
      question,
    );
    await t.action(internal.analyst.agent.run, { turnId });
    expect(provider.create).toHaveBeenCalledTimes(3);
    expect(await t.run((ctx) => ctx.db.get(turnId))).toMatchObject({
      status: "failed",
      errorCode: "ANALYST_INVALID_RESPONSE",
    });
    expect(await usage(t, s.orgId)).toMatchObject({
      answers: 0,
      spentMicroUsd: 1320,
    });
  });
  test("expiry refunds a pending turn without charging a model call", async () => {
    const s = await studio(t);
    const { turnId } = await s.owner.mutation(
      api.analyst.conversations.send,
      question,
    );
    vi.setSystemTime(Date.now() + ANALYST_LIMITS.leaseMs + 1);
    await t.mutation(internal.analyst.conversations.expire, { turnId });
    expect(await usage(t, s.orgId)).toMatchObject({
      answers: 0,
      reservedMicroUsd: 0,
      spentMicroUsd: 0,
    });
  });
  test("comparisons preserve each currency rather than relabeling money", async () => {
    const s = await studio(t);
    await seedBooking(t, s);
    await seedBooking(t, s, "EUR", "2026-07-03");
    const { turnId } = await s.owner.mutation(
      api.analyst.conversations.send,
      question,
    );
    await t.mutation(internal.analyst.conversations.claim, { turnId });
    const report = await t.query(internal.analyst.analytics.analyse, {
      turnId,
      request: { ...request, comparison: "previous_period" },
      key: "r1",
    });
    expect(report).toMatchObject({
      currency: "MKD",
      previous: { currency: "EUR" },
      changePercent: null,
    });
    expect(report.warnings).toContain("comparison_currency_mismatch");
  });
});
