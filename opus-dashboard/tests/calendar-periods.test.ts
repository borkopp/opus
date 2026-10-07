import { describe, expect, it } from "vitest";
import {
  CALENDAR_DAY as DAY,
  calendarDays,
  calendarRange,
  calendarWeekStart,
  calendarEventBlocks,
  shiftCalendarPeriod,
} from "../../shared/calendar";
const date = (value: string) => Date.parse(value + "T00:00:00Z");
const keys = (days: number[]) =>
  days.map((day) => new Date(day).toISOString().slice(0, 10));
describe("studio calendar periods", () => {
  it("uses Monday weeks across month and year boundaries", () => {
    expect(keys(calendarDays(date("2027-01-01"), "week"))).toEqual([
      "2026-12-28",
      "2026-12-29",
      "2026-12-30",
      "2026-12-31",
      "2027-01-01",
      "2027-01-02",
      "2027-01-03",
    ]);
    expect(calendarWeekStart(date("2026-10-04"))).toBe(date("2026-09-28"));
  });
  it.each([
    ["2027-02-14", 28],
    ["2024-02-29", 35],
    ["2026-03-15", 42],
    ["2026-10-04", 35],
  ])("fills whole weeks for %s including outside-month cells", (day, count) => {
    const days = calendarDays(date(day as string), "month");
    expect(days).toHaveLength(count as number);
    expect(new Date(days[0]).getUTCDay()).toBe(1);
    expect(new Date(days[days.length - 1]).getUTCDay()).toBe(0);
    const { startAt, endAt } = calendarRange(date(day as string), "month");
    expect(startAt).toBe(days[0]);
    expect(endAt).toBe(days[days.length - 1] + DAY);
  });
  it("clamps month navigation at February and wraps the year", () => {
    expect(shiftCalendarPeriod(date("2026-01-31"), "month", 1)).toBe(
      date("2026-02-28"),
    );
    expect(shiftCalendarPeriod(date("2024-01-31"), "month", 1)).toBe(
      date("2024-02-29"),
    );
    expect(shiftCalendarPeriod(date("2026-12-31"), "month", 1)).toBe(
      date("2027-01-31"),
    );
  });
  it("keeps studio dates stable over daylight-saving transitions", () => {
    for (const day of ["2026-03-29", "2026-10-25"]) {
      const days = calendarDays(date(day), "week");
      expect(
        days.every(
          (value, index) => index === 0 || value - days[index - 1] === DAY,
        ),
      ).toBe(true);
      expect(calendarRange(date(day), "week").endAt - days[0]).toBe(7 * DAY);
    }
  });
  it("clips overnight events, preserves overlaps and ignores malformed ranges", () => {
    const day = date("2026-10-04");
    const rows = [
      { id: "overnight", startAt: day - 30 * 60000, endAt: day + 30 * 60000 },
      { id: "overlap", startAt: day + 15 * 60000, endAt: day + 45 * 60000 },
      { id: "invalid", startAt: day + 50 * 60000, endAt: day + 45 * 60000 },
    ];
    const blocks = calendarEventBlocks(rows, day, {
      hourHeight: 60,
      minimumHeight: 10,
      key: (a) => a.id,
    });
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toMatchObject({ top: 0, height: 27, lane: 0, lanes: 2 });
    expect(blocks[1]).toMatchObject({ top: 15, lane: 1, lanes: 2 });
  });
});
