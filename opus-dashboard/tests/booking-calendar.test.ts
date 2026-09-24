import { describe, expect, it } from "vitest";
import { getBookingDateCounts } from "../lib/booking-calendar";

describe("booking calendar indicators", () => {
  it("groups bookings by studio date, including times near midnight", () => {
    const counts = getBookingDateCounts([
      { startAt: Date.UTC(2026, 8, 22, 0, 15), status: "confirmed" },
      { startAt: Date.UTC(2026, 8, 22, 23, 45), status: "completed" },
      { startAt: Date.UTC(2026, 8, 23, 0, 15), status: "confirmed" },
    ]);

    expect([...counts]).toEqual([
      ["2026-09-22", 2],
      ["2026-09-23", 1],
    ]);
    expect(counts.has("2026-09-21")).toBe(false);
  });

  it("marks a rescheduled appointment only on its new calendar date", () => {
    const counts = getBookingDateCounts([
      {
        startAt: Date.UTC(2026, 8, 22, 10),
        status: "cancelled",
        cancellationReason: "Rescheduled",
      },
      { startAt: Date.UTC(2026, 8, 23, 10), status: "confirmed" },
    ]);

    expect([...counts]).toEqual([["2026-09-23", 1]]);
  });

  it("includes past and cancelled bookings that remain in the calendar", () => {
    const counts = getBookingDateCounts([
      { startAt: Date.UTC(2026, 8, 22, 9), status: "completed" },
      { startAt: Date.UTC(2026, 8, 22, 10), status: "no_show" },
      {
        startAt: Date.UTC(2026, 8, 22, 11),
        status: "cancelled",
        cancellationReason: "Cancelled by customer",
      },
    ]);

    expect(counts.get("2026-09-22")).toBe(3);
    expect(getBookingDateCounts([]).size).toBe(0);
  });
});
