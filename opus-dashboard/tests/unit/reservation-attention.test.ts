import { describe, expect, it } from "vitest";
import {
  reservationCleaningAttention,
  reservationTimingAttention,
} from "../../convex/lib/reservationAttention";

const MINUTE = 60_000;
const START = Date.UTC(2026, 9, 16, 10);
const visit = {
  schemaVersion: 2,
  timeModel: "utc" as const,
  status: "confirmed" as const,
  startAt: START,
  endAt: START + 90 * MINUTE,
};

describe("reservation attention timing", () => {
  it.each([
    [-1, null],
    [0, null],
    [15 * MINUTE - 1, null],
    [15 * MINUTE, { kind: "late_arrival", minutes: 15 }],
    [16 * MINUTE - 1, { kind: "late_arrival", minutes: 15 }],
    [16 * MINUTE, { kind: "late_arrival", minutes: 16 }],
  ])(
    "uses the exact arrival grace boundary at offset %i",
    (offset, expected) => {
      expect(reservationTimingAttention(visit, 15, START + offset)).toEqual(
        expected,
      );
    },
  );

  it.each([0, -10, Number.NaN, Number.POSITIVE_INFINITY])(
    "uses the existing zero-grace fallback for %s",
    (grace) => {
      expect(reservationTimingAttention(visit, grace, START)).toEqual({
        kind: "late_arrival",
        minutes: 0,
      });
    },
  );

  it("uses the validated settings default of 15 minutes when grace is missing", () => {
    expect(
      reservationTimingAttention(visit, undefined, START + 5 * MINUTE),
    ).toBeNull();
    expect(
      reservationTimingAttention(visit, undefined, START + 15 * MINUTE),
    ).toEqual({ kind: "late_arrival", minutes: 15 });
  });

  it.each([0, START - MINUTE, START + MINUTE])(
    "does not label an arrived guest late, including arrival timestamp %s",
    (arrivedAt) => {
      expect(
        reservationTimingAttention({ ...visit, arrivedAt }, 15, visit.endAt),
      ).toBeNull();
    },
  );

  it.each([
    [15 * MINUTE + 1, null],
    [15 * MINUTE, { kind: "ending_soon", minutes: 15 }],
    [MINUTE + 1, { kind: "ending_soon", minutes: 2 }],
    [1, { kind: "ending_soon", minutes: 1 }],
    [0, { kind: "overdue", minutes: 0 }],
    [-MINUTE + 1, { kind: "overdue", minutes: 0 }],
    [-MINUTE, { kind: "overdue", minutes: 1 }],
  ])(
    "distinguishes ending soon and overdue with %i ms remaining",
    (remaining, expected) => {
      expect(
        reservationTimingAttention(
          { ...visit, status: "seated" },
          15,
          visit.endAt - remaining,
        ),
      ).toEqual(expected);
    },
  );

  it.each(["pending", "completed", "cancelled", "no_show"] as const)(
    "never marks %s visits late or overdue",
    (status) => {
      expect(
        reservationTimingAttention(
          { ...visit, status },
          15,
          visit.endAt + 24 * 60 * MINUTE,
        ),
      ).toBeNull();
    },
  );

  it.each([
    { schemaVersion: undefined },
    { schemaVersion: 1 },
    { timeModel: undefined },
    { startAt: Number.NaN },
    { endAt: Number.POSITIVE_INFINITY },
    { endAt: START },
    { endAt: START - 1 },
  ])("does not infer time from legacy or invalid intervals: %o", (patch) => {
    expect(
      reservationTimingAttention(
        { ...visit, status: "seated", ...patch },
        15,
        visit.endAt,
      ),
    ).toBeNull();
  });

  it.each([
    ["2026-10-24T22:30:00Z", "2026-10-25T01:30:00Z"],
    ["2026-03-28T23:30:00Z", "2026-03-29T02:30:00Z"],
  ])("uses elapsed UTC time through overnight and DST: %s", (start, end) => {
    const overnight = {
      ...visit,
      status: "seated" as const,
      startAt: Date.parse(start),
      endAt: Date.parse(end),
    };
    expect(
      reservationTimingAttention(overnight, 15, overnight.endAt - 15 * MINUTE),
    ).toEqual({ kind: "ending_soon", minutes: 15 });
    expect(
      reservationTimingAttention(overnight, 15, overnight.endAt + 5 * MINUTE),
    ).toEqual({ kind: "overdue", minutes: 5 });
  });
});

describe("cleaning attention", () => {
  it.each([
    [15 * MINUTE, false, 15],
    [MINUTE + 1, false, 2],
    [1, false, 1],
    [0, true, 0],
    [-24 * 60 * MINUTE, true, 0],
  ])(
    "keeps an explicit release required at %i ms remaining",
    (remaining, canRelease, minutesUntilReady) => {
      expect(reservationCleaningAttention(START, START - remaining)).toEqual({
        canRelease,
        minutesUntilReady,
      });
    },
  );
});
