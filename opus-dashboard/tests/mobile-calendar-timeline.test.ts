import { describe, expect, it } from "vitest";
import type { MobileAppointment } from "../../shared/mobile";
import { dayOf, studioWallClock } from "../../opus-mobile/src/lib/format";
import {
  HOUR_HEIGHT,
  MIN_EVENT_HEIGHT,
  TIMELINE_HEIGHT,
  TIMELINE_INSET,
  startAtFromParam,
  timelineBlocks,
  timelineScrollOffset,
} from "../../opus-mobile/src/lib/calendar-timeline";

const day = Date.UTC(2026, 9, 3);
function appointment(
  id: string,
  startMinute: number,
  duration: number,
): MobileAppointment {
  return {
    id,
    customerId: id,
    customerName: id,
    customerEmail: null,
    customerPhone: null,
    staffId: id,
    staffName: id,
    serviceIds: ["service"],
    serviceName: "Haircut",
    startAt: day + startMinute * 60_000,
    endAt: day + (startMinute + duration) * 60_000,
    priceMinorUnits: 120000,
    currency: "MKD",
    status: "confirmed",
    note: null,
  };
}

describe("mobile calendar overlap geometry", () => {
  it("places concurrent appointments in separate lanes and reuses a free lane", () => {
    const blocks = timelineBlocks(
      [
        appointment("first", 540, 60),
        appointment("second", 570, 60),
        appointment("third", 600, 30),
        appointment("later", 660, 60),
      ],
      day,
    );
    expect(blocks.map(({ lane, lanes }) => [lane, lanes])).toEqual([
      [0, 2],
      [1, 2],
      [0, 2],
      [0, 1],
    ]);
    expect(blocks[0].top).toBe(TIMELINE_INSET + 9 * HOUR_HEIGHT);
  });
  it("keeps connected overlaps aligned across three lanes", () => {
    const blocks = timelineBlocks(
      [
        appointment("long", 540, 120),
        appointment("middle", 570, 60),
        appointment("short", 600, 30),
        appointment("next", 660, 30),
      ],
      day,
    );
    expect(blocks.map((b) => b.lanes)).toEqual([3, 3, 3, 1]);
  });
  it("separates short appointments whose minimum touch areas overlap", () => {
    const blocks = timelineBlocks(
      [appointment("a", 540, 5), appointment("b", 550, 5)],
      day,
    );
    expect(blocks.every((b) => b.height >= MIN_EVENT_HEIGHT)).toBe(true);
    expect(blocks.map((b) => b.lane)).toEqual([0, 1]);
  });
  it("clips cross-midnight events while keeping the last touch area in the content", () => {
    const blocks = timelineBlocks(
      [appointment("previous", -30, 60), appointment("last", 1435, 30)],
      day,
    );
    expect(blocks[0].top).toBe(TIMELINE_INSET);
    expect(blocks[1].top + blocks[1].height).toBeLessThanOrEqual(
      TIMELINE_HEIGHT,
    );
  });
  it("ignores invalid/outside events and leaves the original array unchanged", () => {
    const events = [
      appointment("late", 600, 30),
      appointment("early", 540, 30),
      appointment("other", 1440, 30),
      appointment("invalid", 600, -30),
    ];
    expect(timelineBlocks(events, day).map((b) => b.appointment.id)).toEqual([
      "early",
      "late",
    ]);
    expect(events[0].id).toBe("late");
  });
});

describe("studio time and calendar positioning", () => {
  it("uses the studio clock rather than the device timezone", () => {
    const instant = Date.UTC(2026, 9, 3, 22, 15);
    expect(studioWallClock("Europe/Skopje", instant)).toBe(
      Date.UTC(2026, 9, 4, 0, 15),
    );
    expect(studioWallClock("America/New_York", instant)).toBe(
      Date.UTC(2026, 9, 3, 18, 15),
    );
    expect(dayOf(studioWallClock("Europe/Skopje", instant))).toBe(
      day + 86_400_000,
    );
  });
  it("handles studio daylight-saving transitions", () => {
    expect(studioWallClock("Europe/Skopje", Date.UTC(2026, 2, 29, 0, 59))).toBe(
      Date.UTC(2026, 2, 29, 1, 59),
    );
    expect(studioWallClock("Europe/Skopje", Date.UTC(2026, 2, 29, 1, 0))).toBe(
      Date.UTC(2026, 2, 29, 3, 0),
    );
    expect(studioWallClock("Europe/Skopje", Date.UTC(2026, 9, 25, 0, 30))).toBe(
      studioWallClock("Europe/Skopje", Date.UTC(2026, 9, 25, 1, 30)),
    );
  });
  it("positions today around now with an hour of context, even with earlier appointments", () => {
    expect(
      timelineScrollOffset(
        day,
        day + 12.5 * 3_600_000,
        [appointment("early", 540, 30)],
        300,
      ),
    ).toBe(TIMELINE_INSET + 11.5 * HOUR_HEIGHT);
  });
  it("opens another date around the earliest appointment or the morning if empty", () => {
    const tomorrow = day + 86_400_000;
    expect(
      timelineScrollOffset(
        day,
        tomorrow,
        [appointment("later", 720, 30), appointment("first", 540, 30)],
        300,
      ),
    ).toBe(TIMELINE_INSET + 8 * HOUR_HEIGHT);
    expect(timelineScrollOffset(day, tomorrow, [], 300)).toBe(
      TIMELINE_INSET + 8 * HOUR_HEIGHT,
    );
  });
  it("clamps the viewport at both ends of the day", () => {
    expect(timelineScrollOffset(day, day, [], 300)).toBe(0);
    expect(timelineScrollOffset(day, day + 1439 * 60_000, [], 500)).toBe(
      TIMELINE_HEIGHT - 500,
    );
    expect(timelineScrollOffset(day, day + 1439 * 60_000, [], 5000)).toBe(0);
  });
  it("accepts booking prefills only as valid integer timestamps within the chosen day", () => {
    expect(startAtFromParam(String(day + 9 * 3_600_000), day)).toBe(
      day + 9 * 3_600_000,
    );
    for (const input of [
      undefined,
      "",
      " ",
      "NaN",
      "Infinity",
      String(day - 1),
      String(day + 86_400_000),
      String(day + 0.5),
    ]) {
      expect(startAtFromParam(input, day)).toBeNull();
    }
  });
});
