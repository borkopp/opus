import { describe, expect, it } from "vitest";
import { clientSignInDestination } from "../../lib/client-account";
import { renderReservationMessage } from "../../convex/lib/reservationEmailTemplates";
import {
  reservationDateTime,
  reservationLocalDate,
  reservationPath,
  reservationTime,
} from "../../lib/reservation-format";

describe("reservation instant display and safe client continuation", () => {
  it("displays actual instants on the venue's day across midnight and DST", () => {
    expect(
      reservationLocalDate("Europe/Skopje", Date.parse("2026-10-12T22:30:00Z")),
    ).toBe("2026-10-13");
    expect(
      reservationTime(Date.parse("2026-10-25T00:30:00Z"), "Europe/Skopje"),
    ).toBe("02:30");
    expect(
      reservationTime(Date.parse("2026-10-25T01:30:00Z"), "Europe/Skopje"),
    ).toBe("02:30");
  });
  it("distinguishes repeated local hours in confirmations and management screens", () => {
    const first = Date.parse("2026-10-25T00:30:00Z");
    const second = Date.parse("2026-10-25T01:30:00Z");
    expect(reservationDateTime(first, "Europe/Skopje")).toContain("GMT+2");
    expect(reservationDateTime(second, "Europe/Skopje")).toContain("GMT+1");
    for (const [startAt, offset] of [
      [first, "GMT+2"],
      [second, "GMT+1"],
    ] as const) {
      const message = renderReservationMessage({
        orgId: "venue",
        reservationId: "reservation",
        revision: 1,
        venue: "Test venue",
        customerName: "Guest",
        startAt,
        endAt: startAt + 30 * 60_000,
        partySize: 2,
        timezone: "Europe/Skopje",
        locale: "en-GB",
        event: "confirmation",
        staff: false,
      });
      expect(message.text).toContain(offset);
    }
  });
  it("preserves public selections through consumer sign-in without private data", () => {
    const path = reservationPath("cafe", {
      date: "2026-10-12",
      partySize: 6,
      startAt: 123,
    });
    expect(clientSignInDestination(path)).toBe(
      "/reserve/cafe?date=2026-10-12&partySize=6&at=123",
    );
    expect(
      clientSignInDestination("/reserve/cafe/manage/reservation_123"),
    ).toBe("/reserve/cafe/manage/reservation_123");
    for (const path of [
      "/reserve/../hospitality",
      "/reserve/cafe/../../settings",
      "/reserve//evil.example",
      "/reserve/cafe/manage/../settings",
      "//evil.example/reserve/cafe",
    ]) {
      expect(clientSignInDestination(path)).toBe("/account");
    }
  });
});
