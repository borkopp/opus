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

const provider = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("openai", () => ({
  default: class {
    responses = { create: provider.create };
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
async function studio(t: Backend, suffix = "a") {
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
    await ctx.db.patch(orgId, { plan: "paid" });
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

describe(
  "business assistant access, usage and workers",
  { timeout: 20000 },
  () => {
    let t: Backend;
    beforeEach(() => {
      t = createBackend();
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-09-16T10:00:00Z"));
      vi.stubEnv("BUSINESS_ANALYST_ENABLED", "true");
      vi.stubEnv("BUSINESS_ANALYST_OPENAI_API_KEY", "test-key-never-sent");
      provider.create.mockReset();
    });
    afterEach(async () => {
      // Drain the action and expiry jobs so no work leaks into another test.
      await t.finishAllScheduledFunctions(vi.runAllTimers);
      vi.useRealTimers();
      vi.unstubAllEnvs();
    });
    test("requires configuration, paid access and manager/owner membership", async () => {
      const s = await studio(t);
      vi.stubEnv("BUSINESS_ANALYST_ENABLED", "false");
      await expect(
        s.owner.mutation(api.analyst.conversations.send, question),
      ).rejects.toThrow("ANALYST_NOT_CONFIGURED");
      await t.run((ctx) => ctx.db.patch(s.orgId, { plan: "free" }));
      await expect(
        s.owner.mutation(api.analyst.conversations.send, question),
      ).rejects.toThrow("ANALYST_PAID_PLAN_REQUIRED");
      await t.run(async (ctx) => {
        await ctx.db.patch(s.orgId, { plan: "paid" });
        await ctx.db.patch(s.staff._id, { role: "staff" });
      });
      await expect(
        s.owner.mutation(api.analyst.conversations.send, question),
      ).rejects.toThrow();
      expect(provider.create).not.toHaveBeenCalled();
    });
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
    test("conversations and saved reports cannot be read across tenants", async () => {
      const a = await studio(t),
        b = await studio(t, "b");
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
    });
    test("managers have their own private history within the same studio", async () => {
      const a = await studio(t),
        b = await studio(t, "b");
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
      ).toMatchObject({ allowed: true, remaining: 199, busy: true });
    });
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
    test("one in-flight analysis survives a UTC month rollover", async () => {
      vi.setSystemTime(new Date("2026-09-30T23:59:00Z"));
      const s = await studio(t);
      await s.owner.mutation(api.analyst.conversations.send, question);
      vi.setSystemTime(new Date("2026-10-01T00:00:00Z"));
      await expect(
        s.owner.mutation(api.analyst.conversations.send, {
          ...question,
          requestId: "unique-request-0002",
        }),
      ).rejects.toThrow("ANALYST_BUSY");
    });
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
    test("worker resolves exact facts, saves evidence, accounts usage and excludes PII", async () => {
      const s = await studio(t);
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
    });
    test("permission revocation stops the provider and refunds the answer allowance", async () => {
      const s = await studio(t);
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
    });
    test("failed calls release reservations once and preserve conservative cost accounting", async () => {
      const s = await studio(t);
      provider.create.mockRejectedValueOnce(
        new Error("Provider failure with PRIVATE detail"),
      );
      const { turnId } = await s.owner.mutation(
        api.analyst.conversations.send,
        { ...question, depth: "deep" },
      );
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
    test("invalid invented figures cannot become an answer and retries are bounded", async () => {
      const s = await studio(t);
      await seedBooking(t, s);
      provider.create
        .mockResolvedValueOnce(toolResponse())
        .mockResolvedValue(
          response(
            [],
            JSON.stringify({ ...answer, text: "You made 9999 MKD." }),
          ),
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
  },
);
