import { describe, expect, test } from "vitest";
import {
  buildQuickBookingSlots,
  rangeFitsFreeInterval,
} from "../../convex/lib/quickBooking";

const minute = (value: number) => value * 60_000;

describe("quick booking slots", () => {
  test("uses the preferred duration and falls back to the smallest interval at a gap tail", () => {
    const slots = buildQuickBookingSlots({
      freeIntervals: [{ startAt: minute(9 * 60), endAt: minute(9 * 60 + 45) }],
      dayStartAt: 0,
      slotDurationMins: 15,
      quickBookingDurationMins: 30,
      bufferTimeMins: 0,
    });

    expect(
      slots.map(
        ({ startAt, durationMins, availableDurationMins, isFallback }) => ({
          startMinute: startAt / 60_000,
          durationMins,
          availableDurationMins,
          isFallback,
        }),
      ),
    ).toEqual([
      {
        startMinute: 540,
        durationMins: 30,
        availableDurationMins: 45,
        isFallback: false,
      },
      {
        startMinute: 555,
        durationMins: 30,
        availableDurationMins: 30,
        isFallback: false,
      },
      {
        startMinute: 570,
        durationMins: 15,
        availableDurationMins: 15,
        isFallback: true,
      },
    ]);
  });

  test("reserves the configured buffer before exposing a hover target", () => {
    const slots = buildQuickBookingSlots({
      freeIntervals: [{ startAt: minute(540), endAt: minute(585) }],
      dayStartAt: 0,
      slotDurationMins: 15,
      quickBookingDurationMins: 30,
      bufferTimeMins: 10,
    });

    expect(
      slots.map((slot) => [slot.startAt / 60_000, slot.durationMins]),
    ).toEqual([
      [540, 30],
      [555, 15],
    ]);
  });

  test("returns nothing when the smallest interval cannot fit", () => {
    expect(
      buildQuickBookingSlots({
        freeIntervals: [{ startAt: 0, endAt: minute(14) }],
        dayStartAt: 0,
        slotDurationMins: 15,
        quickBookingDurationMins: 30,
        bufferTimeMins: 0,
      }),
    ).toEqual([]);
  });

  test("validates the final service duration against the same free interval", () => {
    const freeIntervals = [{ startAt: minute(540), endAt: minute(600) }];

    expect(rangeFitsFreeInterval(freeIntervals, minute(540), 45, 15)).toBe(
      true,
    );
    expect(rangeFitsFreeInterval(freeIntervals, minute(540), 60, 15)).toBe(
      false,
    );
  });
});
