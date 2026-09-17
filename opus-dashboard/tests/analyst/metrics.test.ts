import { describe, expect, test } from "vitest";
import type { Doc } from "../../convex/_generated/dataModel";
import type { AnalysisRequest, Schedule } from "../../convex/analyst/contracts";
import { buildReport, type AnalyticsData } from "../../convex/analyst/metrics";
import { availableMinutes } from "../../convex/analyst/schedules";
import {
  comparisonPeriod,
  parseDate,
  resolvePeriod,
} from "../../convex/analyst/periods";
import { compactReport, validateAnswer } from "../../convex/analyst/prompt";

const request: AnalysisRequest = {
  metric: "completed_value",
  groupBy: "day",
  period: { preset: "last_month", startDate: null, endDate: null },
  comparison: null,
  staffName: null,
  serviceName: null,
};
const schedule: Schedule = {
  staff: [{ id: "staff-a", active: true }],
  rules: Array.from({ length: 5 }, (_, i) => ({
    staffId: "staff-a",
    dayOfWeek: i + 1,
    startTime: "09:00",
    endTime: "17:00",
    breaks: [{ startTime: "12:00", endTime: "13:00" }],
  })),
  overrides: [],
};
function booking(
  date: string,
  overrides: Partial<Doc<"bookings">> = {},
): Doc<"bookings"> {
  return {
    _id: `booking-${date}`,
    _creationTime: 0,
    orgId: "org-a",
    customerId: "client-a",
    staffId: "staff-a",
    serviceId: "service-a",
    startAt: parseDate(date) + 10 * 3600000,
    endAt: parseDate(date) + 11 * 3600000,
    priceMinorUnits: 1000,
    currency: "MKD",
    status: "completed",
    source: "manual",
    surgePriceApplied: false,
    isDeleted: false,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  } as Doc<"bookings">;
}
const data = (bookings: Doc<"bookings">[] = []): AnalyticsData => ({
  bookings,
  staff: [{ _id: "staff-a", displayName: "Ana" }] as AnalyticsData["staff"],
  services: [
    { _id: "service-a", name: "Cut" },
    { _id: "service-b", name: "Colour" },
  ] as AnalyticsData["services"],
  firstVisits: null,
  currentSchedule: { complete: true, schedule },
  schedules: [
    { effectiveFrom: parseDate("2026-01-01"), complete: true, schedule },
  ],
});
function report(
  overrides: Partial<AnalysisRequest> = {},
  input = data([booking("2026-08-03")]),
) {
  return buildReport(
    { ...request, ...overrides },
    input,
    { startMs: parseDate("2026-08-01"), endMs: parseDate("2026-09-01") },
    {
      asOf: parseDate("2026-09-16"),
      localNow: parseDate("2026-09-16"),
      timezone: "Europe/Skopje",
      language: "en",
      key: "r1",
    },
  );
}

describe("calendar periods", () => {
  test("last month follows the studio timezone at a UTC month boundary", () => {
    expect(
      resolvePeriod(
        request.period,
        "Europe/Skopje",
        Date.parse("2026-08-31T22:30:00Z"),
      ),
    ).toMatchObject({
      startMs: parseDate("2026-08-01"),
      endMs: parseDate("2026-09-01"),
    });
  });
  test("calendar comparisons preserve whole months and leap boundaries", () => {
    expect(
      comparisonPeriod(
        parseDate("2024-03-01"),
        parseDate("2024-04-01"),
        "previous_period",
      ),
    ).toEqual({
      startMs: parseDate("2024-02-01"),
      endMs: parseDate("2024-03-01"),
    });
    expect(
      comparisonPeriod(
        parseDate("2024-02-29"),
        parseDate("2024-03-01"),
        "previous_year",
      ),
    ).toEqual({
      startMs: parseDate("2023-02-28"),
      endMs: parseDate("2023-03-01"),
    });
  });
  test("partial calendar periods compare matching elapsed days", () => {
    expect(
      comparisonPeriod(
        parseDate("2026-09-01"),
        parseDate("2026-09-17"),
        "previous_period",
        "this_month",
      ),
    ).toEqual({
      startMs: parseDate("2026-08-01"),
      endMs: parseDate("2026-08-17"),
    });
    expect(
      comparisonPeriod(
        parseDate("2026-09-14"),
        parseDate("2026-09-17"),
        "previous_period",
        "this_week",
      ),
    ).toEqual({
      startMs: parseDate("2026-09-07"),
      endMs: parseDate("2026-09-10"),
    });
  });
  test.each(["2026-02-30", "2026-2-1", "2026-13-01", "not-a-date"])(
    "rejects invalid date %s",
    (date) => {
      expect(() => parseDate(date)).toThrow("ANALYST_INVALID_PERIOD");
    },
  );
  test("custom ranges are inclusive and bounded", () => {
    const custom = {
      preset: "custom" as const,
      startDate: "2026-08-03",
      endDate: "2026-08-03",
    };
    expect(
      resolvePeriod(custom, "Europe/Skopje", Date.parse("2026-09-16T00:00Z")),
    ).toMatchObject({
      startMs: parseDate("2026-08-03"),
      endMs: parseDate("2026-08-04"),
    });
    expect(() =>
      resolvePeriod({ ...custom, startDate: "2024-01-01" }, "UTC", Date.now()),
    ).toThrow();
  });
});

describe("deterministic appointment analytics", () => {
  test("zero-booking open days are ranked; closed days are distinguishable", () => {
    const r = report();
    expect(r.total.value).toBe(1000);
    expect(r.rows).toHaveLength(31);
    expect(r.rows.find((r) => r.label === "2026-08-04")).toMatchObject({
      value: 0,
      observedDays: 1,
    });
    expect(r.rows.find((r) => r.label === "2026-08-02")).toMatchObject({
      value: 0,
      observedDays: 0,
    });
  });
  test("completed value excludes cancelled, deleted and unresolved appointments", () => {
    const r = report(
      {},
      data([
        booking("2026-08-03"),
        booking("2026-08-04", { status: "cancelled" }),
        booking("2026-08-05", { isDeleted: true }),
        booking("2026-08-06", { status: "confirmed" }),
      ]),
    );
    expect(r.total).toMatchObject({
      value: 1000,
      appointments: 3,
      completed: 1,
    });
    expect(r.warnings).toContain("unresolved_appointments");
  });
  test("bundles preserve their price and are not double-counted", () => {
    const r = report(
      { groupBy: "service" },
      data([
        booking("2026-08-03", {
          serviceIds: [
            "service-a",
            "service-b",
          ] as Doc<"bookings">["serviceIds"],
        }),
      ]),
    );
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0]).toMatchObject({ label: "Cut + Colour", value: 1000 });
  });
  test("mixed currencies do not produce a money total", () => {
    const r = report(
      {},
      data([booking("2026-08-03"), booking("2026-08-04", { currency: "EUR" })]),
    );
    expect(r.total.value).toBeNull();
    expect(r.warnings).toContain("mixed_currencies");
  });
  test("weekday averages use occurrence counts rather than monthly totals", () => {
    const r = report(
      { groupBy: "weekday" },
      data([booking("2026-08-03", { priceMinorUnits: 5000 })]),
    );
    expect(r.rows.find((r) => r.label === "Monday")).toMatchObject({
      value: 1000,
      observedDays: 5,
    });
    expect(r.total.value).toBe(5000);
  });
  test("past capacity stays unknown without recorded schedule history", () => {
    const input = data();
    input.schedules = [];
    const r = report({ metric: "utilisation" }, input);
    expect(r.total.value).toBeNull();
    expect(r.total.availableMinutes).toBeNull();
    expect(r.warnings).toContain("historical_capacity_unavailable");
  });
  test("uses actual available minutes and excludes cancellations/no-shows", () => {
    const r = report(
      { metric: "utilisation" },
      data([
        booking("2026-08-03"),
        booking("2026-08-04", { status: "cancelled" }),
        booking("2026-08-05", { status: "no_show" }),
      ]),
    );
    expect(r.total.bookedMinutes).toBe(60);
    expect(r.total.availableMinutes).toBe(21 * 420);
    expect(r.total.value).toBe(0.68);
  });
  test("rate denominators exclude unresolved outcomes for no-shows", () => {
    const input = data([
      booking("2026-08-03"),
      booking("2026-08-04", { status: "cancelled" }),
      booking("2026-08-05", { status: "no_show" }),
      booking("2026-08-06", { status: "confirmed" }),
    ]);
    expect(report({ metric: "no_show_rate" }, input).total.value).toBe(50);
    expect(report({ metric: "cancellation_rate" }, input).total.value).toBe(25);
    expect(report({ metric: "no_show_rate" }, data()).total.value).toBeNull();
  });
  test("returning clients are unique and must have a visit before the period", () => {
    const input = data([
      booking("2026-08-03"),
      booking("2026-08-04"),
      booking("2026-08-05", {
        customerId: "client-b" as Doc<"bookings">["customerId"],
      }),
    ]);
    input.firstVisits = new Map([
      ["client-a", parseDate("2026-07-01")],
      ["client-b", parseDate("2026-08-05")],
    ]);
    expect(
      report({ metric: "returning_client_share" }, input).total.value,
    ).toBe(50);
    expect(report({ metric: "returning_clients" }, input).total.value).toBe(1);
  });
  test("rejects ambiguous staff names", () => {
    const input = data();
    input.staff.push({ ...input.staff[0] });
    expect(() => report({ staffName: "Ana" }, input)).toThrow(
      "ANALYST_AMBIGUOUS_FILTER",
    );
  });
});

describe("working hours", () => {
  test("breaks, days off, and overrides affect capacity", () => {
    expect(availableMinutes(schedule, "staff-a", "2026-08-03", 1)).toBe(420);
    expect(
      availableMinutes(
        {
          ...schedule,
          overrides: [
            {
              staffId: "staff-a",
              date: "2026-08-03",
              type: "day_off",
              startTime: null,
              endTime: null,
            },
          ],
        },
        "staff-a",
        "2026-08-03",
        1,
      ),
    ).toBe(0);
    expect(
      availableMinutes(
        {
          ...schedule,
          overrides: [
            {
              staffId: "staff-a",
              date: "2026-08-03",
              type: "custom_hours",
              startTime: "10:00",
              endTime: "13:00",
            },
          ],
        },
        "staff-a",
        "2026-08-03",
        1,
      ),
    ).toBe(180);
  });
  test("overlapping rules do not duplicate capacity", () => {
    expect(
      availableMinutes(
        { ...schedule, rules: [schedule.rules[0], schedule.rules[0]] },
        "staff-a",
        "2026-08-03",
        1,
      ),
    ).toBe(420);
  });
});

describe("answer evidence", () => {
  const answer = {
    text: "The total was [[r1.total]] for [[r1.period]].",
    reportKeys: ["r1"],
    recommendations: [],
    followUps: [],
  };
  test("resolves exact facts and preserves cited reports", () => {
    const parsed = validateAnswer(answer, [report()], "en");
    expect(parsed.text).toContain("10.00");
    expect(parsed.text).not.toContain("[[");
    expect(compactReport(report(), "en").rows).toHaveLength(10);
  });
  test.each([
    "It was 123 MKD.",
    "It was [[r2.total]].",
    "It was [[r1.invented]].",
    "It was [[broken.",
  ])("rejects unsupported answer: %s", (text) => {
    expect(() =>
      validateAnswer({ ...answer, text }, [report()], "en"),
    ).toThrow();
  });
  test("does not allow recommendations without observed appointments", () => {
    expect(() =>
      validateAnswer(
        {
          ...answer,
          recommendations: [
            {
              evidence: "Quiet period",
              suggestion: "Cut prices",
              measurement: "Check demand",
              reportKeys: ["r1"],
            },
          ],
        },
        [report({}, data())],
        "en",
      ),
    ).toThrow();
  });
});
