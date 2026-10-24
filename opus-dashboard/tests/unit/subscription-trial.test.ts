import { describe, expect, test } from "vitest";
import {
  addUtcCalendarMonths,
  createSubscriptionTrial,
} from "../../../shared/subscription-trial";
import {
  getSubscriptionAccess,
  hasPaidAccess,
  isBookingAccessAllowed,
  requireBookingSubscription,
} from "../../convex/lib/subscriptionAccess";

describe("two calendar month subscription trial", () => {
  test.each([
    ["2026-10-24T14:15:16.789Z", "2026-12-24T14:15:16.789Z"],
    ["2026-12-31T23:59:59.999Z", "2027-02-28T23:59:59.999Z"],
    ["2023-12-31T10:00:00.000Z", "2024-02-29T10:00:00.000Z"],
    ["2026-07-31T10:00:00.000Z", "2026-09-30T10:00:00.000Z"],
    ["2026-01-31T10:00:00.000Z", "2026-03-31T10:00:00.000Z"],
  ])("starts %s and ends %s without a fixed-day conversion", (start, end) => {
    expect(createSubscriptionTrial(Date.parse(start))).toEqual({
      startedAt: Date.parse(start),
      endsAt: Date.parse(end),
    });
  });

  test("rejects invalid timestamps and calendar month increments", () => {
    expect(() => createSubscriptionTrial(Number.NaN)).toThrow();
    expect(() => createSubscriptionTrial(Number.POSITIVE_INFINITY)).toThrow();
    expect(() => addUtcCalendarMonths(0, -1)).toThrow();
    expect(() => addUtcCalendarMonths(0, 1.5)).toThrow();
  });
});

describe("subscription access", () => {
  const trial = createSubscriptionTrial(Date.parse("2026-10-24T10:00:00Z"));

  test("absence of a trial preserves existing Free and paid behavior", () => {
    expect(getSubscriptionAccess({ plan: "free" })).toEqual({
      accessState: "legacy_free",
      trialEndsAt: null,
      hasPaidAccess: false,
      effectivePlan: "free",
    });
    expect(isBookingAccessAllowed({ plan: "free" })).toBe(true);
    expect(getSubscriptionAccess({ plan: "paid" }).accessState).toBe("paid");
  });

  test("the stored expiry applies exactly, without a scheduled mutation", () => {
    const org = { plan: "free" as const, trial };
    expect(hasPaidAccess(org, trial.startedAt)).toBe(true);
    expect(hasPaidAccess(org, trial.endsAt - 1)).toBe(true);
    expect(getSubscriptionAccess(org, trial.endsAt)).toMatchObject({
      accessState: "expired",
      effectivePlan: "free",
      trialEndsAt: trial.endsAt,
    });
    expect(isBookingAccessAllowed(org, trial.endsAt)).toBe(false);
    expect(() => requireBookingSubscription(org, trial.endsAt)).toThrow(
      "SUBSCRIPTION_REQUIRED",
    );
  });

  test("verified paid access takes priority without deleting the trial snapshot", () => {
    expect(
      getSubscriptionAccess({ plan: "paid", trial }, trial.endsAt + 1),
    ).toMatchObject({
      accessState: "paid",
      trialEndsAt: trial.endsAt,
      hasPaidAccess: true,
    });
    expect(
      getSubscriptionAccess({ plan: "free", trial }, trial.endsAt + 1)
        .accessState,
    ).toBe("expired");
  });

  test.each([
    { startedAt: trial.startedAt, endsAt: Number.NaN },
    { startedAt: Number.NaN, endsAt: trial.endsAt },
    { startedAt: trial.startedAt, endsAt: trial.startedAt },
    { startedAt: trial.endsAt, endsAt: trial.startedAt },
    { startedAt: trial.startedAt + 1, endsAt: trial.endsAt },
  ])("malformed or not-yet-started trial fails closed: %j", (invalidTrial) => {
    const org = { plan: "free" as const, trial: invalidTrial };
    expect(getSubscriptionAccess(org, trial.startedAt).accessState).toBe(
      "expired",
    );
    expect(isBookingAccessAllowed(org, trial.startedAt)).toBe(false);
  });
});
