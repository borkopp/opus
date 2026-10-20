import { describe, expect, test } from "vitest";
import type { AnalystReport, ReportRow } from "../../convex/analyst/contracts";
import {
  getRankedReportRows,
  getRankingDirection,
  getReportChange,
  hasReportComparison,
  previewAssistantReport,
  selectReportTemplate,
} from "../../lib/assistant-report-presentation";

function row(label: string, value: number | null): ReportRow {
  return {
    label,
    value,
    appointments: 20,
    completed: 16,
    cancelled: 3,
    noShows: 1,
    bookedMinutes: 480,
    availableMinutes: 600,
    completedValueMinor: 960000,
    observedDays: 4,
  };
}

function report(overrides: Partial<AnalystReport> = {}): AnalystReport {
  return {
    key: "r1",
    request: {
      metric: "appointments",
      groupBy: "total",
      period: { preset: "last_month", startDate: null, endDate: null },
      comparison: null,
      staffName: null,
      serviceName: null,
    },
    startMs: Date.UTC(2026, 8, 1),
    endMs: Date.UTC(2026, 9, 1),
    asOf: Date.UTC(2026, 9, 1),
    timezone: "Europe/Skopje",
    currency: "MKD",
    unit: "count",
    total: row("Total", 20),
    rows: [],
    previous: {
      startMs: Date.UTC(2026, 7, 1),
      endMs: Date.UTC(2026, 8, 1),
      total: row("Total", 16),
      currency: "MKD",
    },
    changePercent: 25,
    warnings: [],
    ...overrides,
  };
}

function grouped(
  groupBy: AnalystReport["request"]["groupBy"],
  overrides: Partial<AnalystReport> = {},
) {
  const source = report(overrides);
  source.request = { ...source.request, groupBy };
  source.rows = [row("First", 12), row("Second", 8)];
  return source;
}

describe("assistant report template selection", () => {
  test("uses the available shape instead of making all reports comparisons", () => {
    expect(selectReportTemplate(report(), "How many appointments?")).toBe(
      "summary",
    );
    expect(selectReportTemplate(grouped("service"))).toBe("ranking");
    expect(selectReportTemplate(grouped("day"))).toBe("trend");
    expect(selectReportTemplate(grouped("staff", { unit: "percent" }))).toBe(
      "share",
    );
    expect(selectReportTemplate(grouped("day", { unit: "percent" }))).toBe(
      "trend",
    );
  });

  test("uses a report's requested comparison as a fallback without question text", () => {
    const source = report();
    source.request.comparison = "previous_period";
    expect(selectReportTemplate(source)).toBe("comparison");
    expect(selectReportTemplate(source, "How many appointments?")).toBe(
      "summary",
    );
    source.request.groupBy = "service";
    source.rows = [row("First", 20)];
    expect(selectReportTemplate(source)).toBe("ranking");
  });

  test.each([
    "Compare this month versus last month.",
    "Спореди го овој месец со минатиот.",
    "Krahaso këtë muaj me muajin e kaluar.",
  ])("prioritizes an explicit compatible comparison: %s", (question) => {
    const source = grouped("day", { unit: "percent" });
    expect(selectReportTemplate(source, question)).toBe("comparison");
    source.previous = null;
    expect(selectReportTemplate(source, question)).toBe("trend");
  });

  test("does not confuse 'based on' with Macedonian comparison intent", () => {
    expect(
      selectReportTemplate(grouped("service"), "Преглед според услугите."),
    ).toBe("ranking");
  });

  test.each([
    "Which day had the fewest appointments?",
    "Which day was quietest?",
    "Кој ден имаше најмалку термини?",
    "Cila ditë kishte më pak termine?",
  ])("lets a weakest-day question choose ranking: %s", (question) => {
    expect(selectReportTemplate(grouped("day"), question)).toBe("ranking");
    expect(getRankingDirection(grouped("day"), question)).toBe("asc");
  });

  test.each([
    "Which services were booked most?",
    "Кои услуги имаат најмногу термини?",
    "Cilat shërbime kanë më shumë termine?",
  ])("can rank rates when the user explicitly asks: %s", (question) => {
    const source = grouped("service", { unit: "percent" });
    expect(selectReportTemplate(source, question)).toBe("ranking");
    expect(getRankingDirection(source, question)).toBe("desc");
  });

  test("does not invent a ranking when only a total exists", () => {
    expect(selectReportTemplate(report(), "Which day was the quietest?")).toBe(
      "summary",
    );
    const source = grouped("staff", { unit: "percent" });
    source.rows = [row("Unknown", null)];
    expect(
      selectReportTemplate(source, "Which staff had the highest rate?"),
    ).toBe("share");
  });

  test("keeps a usable category total when all detail rows are unavailable or closed", () => {
    const source = grouped("service");
    source.rows = [
      row("Unknown", null),
      { ...row("Closed", 0), observedDays: 0 },
    ];
    expect(selectReportTemplate(source, "Which service was weakest?")).toBe(
      "summary",
    );
    expect(selectReportTemplate(source)).toBe("summary");
  });

  test("shows a single date as a summary unless a ranking was requested", () => {
    const source = grouped("day");
    source.rows = [row("2026-09-01", 20)];
    expect(selectReportTemplate(source)).toBe("summary");
    expect(selectReportTemplate(source, "Which day was weakest?")).toBe(
      "ranking",
    );
  });

  test("unavailable and empty data take priority over the requested chart", () => {
    const source = grouped("service");
    source.total.value = null;
    expect(
      selectReportTemplate(source, "Compare the most booked services"),
    ).toBe("unavailable");
    source.total = { ...row("Total", 0), appointments: 0 };
    expect(selectReportTemplate(source, "Compare with last month")).toBe(
      "empty",
    );
    source.total.value = Number.NaN;
    expect(selectReportTemplate(source)).toBe("unavailable");
  });

  test("mixed or unknown currencies are unavailable only for monetary reports", () => {
    const source = grouped("service", {
      unit: "money",
      currency: null,
      warnings: ["mixed_currencies"],
    });
    expect(selectReportTemplate(source)).toBe("unavailable");
    expect(getRankedReportRows(source)).toEqual([]);
    source.warnings = [];
    source.currency = null;
    expect(selectReportTemplate(source)).toBe("unavailable");
    source.unit = "count";
    source.warnings = ["mixed_currencies"];
    expect(selectReportTemplate(source)).toBe("ranking");
  });

  test("keeps a valid current monetary report when only the previous period mixed currencies", () => {
    const source = grouped("service", {
      unit: "money",
      currency: "MKD",
      warnings: ["mixed_currencies", "appointment_value_not_payments"],
    });
    source.previous!.total.value = null;
    // The backend may fill the prior period's currency with the studio default,
    // but its unavailable total must still prevent comparison.
    source.previous!.currency = "MKD";
    expect(selectReportTemplate(source, "Compare with last month")).toBe(
      "ranking",
    );
    expect(getRankedReportRows(source)).toHaveLength(2);
    expect(hasReportComparison(source)).toBe(false);
    expect(getReportChange(source)).toBeNull();
    source.request.groupBy = "total";
    expect(selectReportTemplate(source, "Compare with last month")).toBe(
      "summary",
    );
  });

  test("currency mismatch keeps usable current data without a comparison", () => {
    const source = report({ unit: "money" });
    source.previous!.currency = "EUR";
    expect(selectReportTemplate(source, "Compare last month")).toBe("summary");
    expect(getReportChange(source)).toBeNull();
  });
});

describe("assistant report ranking", () => {
  test.each([
    "Show the weakest day and strongest service.",
    "Покажи го најслабиот ден и најсилната услуга.",
    "Trego ditën më të dobët dhe shërbimin më të fortë.",
  ])("keeps multiple report intents separate: %s", (question) => {
    expect(getRankingDirection(grouped("day"), question)).toBe("asc");
    expect(getRankingDirection(grouped("service"), question)).toBe("desc");
  });

  test("does not transfer an explicit weak-day direction to staff rows", () => {
    expect(
      getRankingDirection(grouped("staff"), "Which weekday was the weakest?"),
    ).toBe("desc");
  });

  test("excludes unknown values and closed days, keeps ties stable and source order intact", () => {
    const source = grouped("weekday");
    source.rows = [
      row("Tuesday", 8),
      row("Wednesday", null),
      { ...row("Sunday", 0), observedDays: 0 },
      row("Monday", 4),
      row("Thursday", 4),
      row("Friday", Number.NaN),
    ];
    const original = [...source.rows];
    expect(
      getRankedReportRows(source, "Which day was weakest?").map(
        (entry) => entry.label,
      ),
    ).toEqual(["Monday", "Thursday", "Tuesday"]);
    expect(getRankedReportRows(source).map((entry) => entry.label)).toEqual([
      "Tuesday",
      "Monday",
      "Thursday",
    ]);
    expect(source.rows).toEqual(original);
  });

  test("best/worst respects adverse metrics while literal highest/lowest keeps numeric meaning", () => {
    const source = grouped("staff");
    source.request.metric = "cancellation_rate";
    expect(getRankingDirection(source, "Which staff have the best rate?")).toBe(
      "asc",
    );
    expect(
      getRankingDirection(source, "Which staff have the worst rate?"),
    ).toBe("desc");
    expect(
      getRankingDirection(source, "Which staff have the highest rate?"),
    ).toBe("desc");
    source.request.metric = "completed_appointments";
    expect(
      getRankingDirection(source, "Which staff have the best result?"),
    ).toBe("desc");
  });
});

describe("assistant report previews", () => {
  test("finds the same winner as the expanded ranking beyond the first seven rows", () => {
    const source = grouped("service");
    source.rows = Array.from({ length: 10 }, (_, index) =>
      row(`Service ${index + 1}`, index + 1),
    );
    source.rows.unshift(row("Unknown service", null));
    const original = structuredClone(source);
    const question = "Which services were booked most?";
    const preview = previewAssistantReport(source, question);
    const ranked = getRankedReportRows(source, question);
    expect(preview.rows).toEqual(ranked.slice(0, 7));
    expect(preview.rows[0].label).toBe("Service 10");
    expect(preview.rowCount).toBe(11);
    expect(preview.rows).toHaveLength(7);
    expect(source).toEqual(original);
    expect(preview.rows).not.toBe(source.rows);
  });

  test("finds the weakest observed day without allowing a closed day to win", () => {
    const source = grouped("day");
    source.rows = Array.from({ length: 10 }, (_, index) =>
      row(`2026-09-${String(index + 1).padStart(2, "0")}`, 10 - index),
    );
    source.rows.unshift({
      ...row("2026-08-31", 0),
      observedDays: 0,
    });
    const preview = previewAssistantReport(source, "Which day was weakest?");
    expect(preview.rows[0].label).toBe("2026-09-10");
    expect(preview.rows.some((entry) => entry.label === "2026-08-31")).toBe(
      false,
    );
    expect(preview.rowCount).toBe(11);
  });

  test("ends a trend chronologically and retains null gaps without reordering saved facts", () => {
    const source = grouped("day");
    source.rows = Array.from({ length: 10 }, (_, index) =>
      row(
        `2026-09-${String(index + 1).padStart(2, "0")}`,
        index === 7 ? null : index + 1,
      ),
    ).reverse();
    const original = structuredClone(source);
    const preview = previewAssistantReport(
      source,
      "Show daily appointments for September.",
    );
    expect(preview.rows.map((entry) => entry.label)).toEqual([
      "2026-09-04",
      "2026-09-05",
      "2026-09-06",
      "2026-09-07",
      "2026-09-08",
      "2026-09-09",
      "2026-09-10",
    ]);
    expect(preview.rows[4].value).toBeNull();
    expect(preview.rowCount).toBe(10);
    expect(source).toEqual(original);
  });

  test("retains the trend template when the latest seven dates all have unknown values", () => {
    const source = grouped("day", { unit: "percent" });
    source.rows = Array.from({ length: 10 }, (_, index) =>
      row(
        `2026-09-${String(index + 1).padStart(2, "0")}`,
        index < 3 ? 4 : null,
      ),
    );
    const preview = previewAssistantReport(source);
    expect(preview.rows.every((entry) => entry.value === null)).toBe(true);
    expect(selectReportTemplate(preview)).toBe("trend");
    expect(preview.total.value).toBe(20);
  });

  test("preserves original detail order for non-ranking and non-trend templates", () => {
    const source = grouped("service", { unit: "percent" });
    source.rows = Array.from({ length: 9 }, (_, index) =>
      row(`Service ${index + 1}`, index * 2),
    );
    const preview = previewAssistantReport(source);
    expect(selectReportTemplate(source)).toBe("share");
    expect(preview.rows).toEqual(source.rows.slice(0, 7));
    expect(preview.rowCount).toBe(9);
    expect(preview.total).toBe(source.total);
  });
});

describe("assistant report change", () => {
  test("calculates count change from the totals without assuming improvement", () => {
    const source = report({ changePercent: 999 });
    expect(getReportChange(source)).toEqual({
      value: 25,
      unit: "percent",
      direction: "up",
      sentiment: "neutral",
    });
    source.total.value = 16;
    expect(getReportChange(source)).toEqual({
      value: 0,
      unit: "percent",
      direction: "flat",
      sentiment: "neutral",
    });
  });

  test("uses percentage points for rates, including a zero previous rate", () => {
    const source = report({ unit: "percent", total: row("Total", 6.67) });
    source.request.metric = "cancellation_rate";
    source.previous!.total.value = 9.76;
    expect(getReportChange(source)).toEqual({
      value: -3.09,
      unit: "points",
      direction: "down",
      sentiment: "positive",
    });
    source.previous!.total.value = 0;
    expect(getReportChange(source)).toEqual({
      value: 6.67,
      unit: "points",
      direction: "up",
      sentiment: "negative",
    });
  });

  test.each(["count", "money"] as const)(
    "zero %s baselines can be shown side by side without a relative change",
    (unit) => {
      const source = report({ unit });
      source.previous!.total.value = 0;
      expect(hasReportComparison(source)).toBe(true);
      expect(selectReportTemplate(source, "Compare last month")).toBe(
        "comparison",
      );
      expect(getReportChange(source)).toBeNull();
    },
  );

  test.each(["returning_client_share", "utilisation"] as const)(
    "does not infer business improvement from a higher %s",
    (metric) => {
      const source = report({ unit: "percent" });
      source.request.metric = metric;
      expect(getReportChange(source)?.sentiment).toBe("neutral");
    },
  );

  test.each(["cancellations", "no_shows"] as const)(
    "inverts sentiment for %s",
    (metric) => {
      const source = report();
      source.request.metric = metric;
      expect(getReportChange(source)?.sentiment).toBe("negative");
      source.total.value = 12;
      expect(getReportChange(source)?.sentiment).toBe("positive");
    },
  );

  test.each([null, "", "EUR"])(
    "does not calculate a monetary change with previous currency %s",
    (currency) => {
      const source = report({ unit: "money" });
      source.previous!.currency = currency;
      expect(hasReportComparison(source)).toBe(false);
      expect(getReportChange(source)).toBeNull();
    },
  );

  test("allows a known same-currency comparison and keeps value sentiment neutral", () => {
    const source = report({ unit: "money" });
    source.request.metric = "completed_value";
    source.previous!.currency = "mkd";
    expect(getReportChange(source)).toMatchObject({
      value: 25,
      sentiment: "neutral",
    });
    source.warnings = ["comparison_currency_mismatch"];
    expect(getReportChange(source)).toBeNull();
  });

  test("never treats missing or nonfinite totals as zero", () => {
    const source = report();
    source.previous!.total.value = null;
    expect(getReportChange(source)).toBeNull();
    source.previous!.total.value = Number.POSITIVE_INFINITY;
    expect(getReportChange(source)).toBeNull();
    source.previous!.total.value = 16;
    source.total.value = null;
    expect(getReportChange(source)).toBeNull();
    source.total.value = 20;
    source.previous = null;
    expect(getReportChange(source)).toBeNull();
  });
});
