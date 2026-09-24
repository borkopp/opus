import { describe, expect, test } from "vitest";
import {
  buildOverviewRevenue,
  overviewDayStart,
  DAY_MS,
} from "../convex/lib/overviewMetrics";
import { wallClockNow } from "../convex/lib/bookingTime";
import { overviewOccupancy } from "../lib/dashboard-overview";
const today = Date.UTC(2026, 8, 22);
const booking = (
  startAt: number,
  priceMinorUnits = 120000,
  currency = "MKD",
) => ({
  startAt,
  priceMinorUnits,
  currency,
  isDeleted: false,
  status: "completed" as const,
});
describe("Clarity metrics", () => {
  test("uses the studio's calendar date across midnight and DST", () => {
    expect(
      overviewDayStart(
        wallClockNow("Europe/Skopje", Date.UTC(2026, 8, 21, 23)),
      ),
    ).toBe(today);
    expect(
      overviewDayStart(
        wallClockNow("Europe/Skopje", Date.UTC(2026, 9, 25, 23, 30)),
      ),
    ).toBe(Date.UTC(2026, 9, 26));
  });
  test("keeps minor units and assigns each day to one bucket in both periods", () => {
    for (const days of [7, 30] as const) {
      const items = Array.from({ length: days * 2 }, (_, i) =>
        booking(today - i * DAY_MS),
      );
      const result = buildOverviewRevenue(items, today, days, "MKD");
      expect(result.totalMinor).toBe(days * 120000);
      expect(result.previousMinor).toBe(days * 120000);
      expect(
        result.buckets.reduce((sum, b) => sum + (b.valueMinor ?? 0), 0),
      ).toBe(result.totalMinor);
      expect(result.changePct).toBe(0);
    }
  });
  test("excludes cancelled, deleted, future, and out-of-window appointments", () => {
    const result = buildOverviewRevenue(
      [
        booking(today),
        { ...booking(today), status: "cancelled" },
        { ...booking(today), isDeleted: true },
        booking(today + DAY_MS),
        booking(today - 14 * DAY_MS),
      ],
      today,
      7,
      "MKD",
    );
    expect(result.totalMinor).toBe(120000);
    expect(result.previousMinor).toBe(0);
    expect(result.changePct).toBeNull();
  });
  test("never adds or compares different currencies", () => {
    const result = buildOverviewRevenue(
      [booking(today), booking(today - 8 * DAY_MS, 2500, "EUR")],
      today,
      7,
      "MKD",
    );
    expect(result.currency).toBeNull();
    expect(result.totalMinor).toBeNull();
    expect(result.buckets.every((b) => b.valueMinor === null)).toBe(true);
  });
  test("empty studios display zero value in their configured currency", () => {
    expect(buildOverviewRevenue([], today, 7, "EUR")).toMatchObject({
      totalMinor: 0,
      previousMinor: 0,
      currency: "EUR",
      changePct: null,
    });
  });
  test("weights occupancy by available minutes and preserves unknown schedules", () => {
    expect(
      overviewOccupancy([
        {
          staffName: "A",
          bookedMins: 60,
          availableMins: 60,
          utilisationPct: 100,
        },
        {
          staffName: "B",
          bookedMins: 0,
          availableMins: 540,
          utilisationPct: 0,
        },
      ]),
    ).toBe(10);
    expect(
      overviewOccupancy([
        {
          staffName: "A",
          bookedMins: 60,
          availableMins: null,
          utilisationPct: null,
        },
      ]),
    ).toBeNull();
  });
});
