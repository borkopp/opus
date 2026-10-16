import { describe, expect, it } from "vitest";
import {
  countReservationStatuses,
  filterReservations,
  matchesReservationSearch,
  reservationStatusFilter,
} from "../../lib/reservation-list";

const guest = {
  customerName: "Élena Šaban",
  customerPhone: "+389 (70) 123-456",
  guestErased: false,
};

describe("reservation list search", () => {
  it.each(["elena", "ÉLENA", "saban ELENA", "  élena   šab  "])(
    "finds name tokens regardless of case, accents or order: %s",
    (query) => expect(matchesReservationSearch(guest, query)).toBe(true),
  );

  it("preserves Cyrillic names and normalises composed characters", () => {
    expect(
      matchesReservationSearch(
        { customerName: "Ѓорѓи Петровски" },
        "ПЕТРОВ ЃОР",
      ),
    ).toBe(true);
    expect(
      matchesReservationSearch({ customerName: "E\u0301lena" }, "élena"),
    ).toBe(true);
  });

  it.each(["70 123", "123-456", "+389 (70)", "(70) 123-456", "７０１２３"])(
    "finds partial phone numbers across formatting: %s",
    (query) => expect(matchesReservationSearch(guest, query)).toBe(true),
  );

  it.each([
    ["+389 (70) 123-456", "070 123 456"],
    ["00389 70 123456", "070 123 456"],
    ["070 123456", "+389 70 123 456"],
    ["070 123456", "00389 70 123 456"],
    ["+389 (70) 123-456", "00389 70 123 456"],
    ["00389 70 123456", "+389 70 123 456"],
    ["+389 2 123 4567", "02 123 4567"],
  ])("finds complete Macedonian %s using %s", (phone, query) => {
    expect(
      matchesReservationSearch({ ...guest, customerPhone: phone }, query),
    ).toBe(true);
  });

  it.each([
    ["+38970123456", "070"],
    ["+38970123456", "0038970"],
    ["070123456", "+389 70"],
    ["0038970123456", "070 123"],
  ])("finds %s while typing its alternate format %s", (phone, query) => {
    expect(
      matchesReservationSearch({ ...guest, customerPhone: phone }, query),
    ).toBe(true);
  });

  it.each([
    ["+38970123456", "00123456"],
    ["+38970123456", "0070123456"],
    ["+38970123456", "071 123456"],
    ["+4470123456", "070 123456"],
    ["+4912345678", "012345678"],
    ["070123456", "+4470123456"],
    ["+389701234567", "070 1234567"],
    [undefined, "070123456"],
  ] as const)(
    "does not strip arbitrary zeroes or countries from %s for %s",
    (phone, query) => {
      expect(
        matchesReservationSearch({ ...guest, customerPhone: phone }, query),
      ).toBe(false);
    },
  );

  it.each(["", "  ", " \n\t "])(
    "does not filter for an empty query: %s",
    (query) => expect(matchesReservationSearch(guest, query)).toBe(true),
  );

  it.each(["+", "( )", "---", "not-a-guest", "elena 123", "elena missing"])(
    "does not match punctuation or incomplete name tokens: %s",
    (query) => expect(matchesReservationSearch(guest, query)).toBe(false),
  );

  it("does not find erased guests by any retained name or contact details", () => {
    const erased = { ...guest, guestErased: true };
    expect(matchesReservationSearch(erased, "elena")).toBe(false);
    expect(matchesReservationSearch(erased, "123456")).toBe(false);
    expect(matchesReservationSearch(erased, " ")).toBe(true);
  });

  it("searches only the reservation's displayed contact and name", () => {
    const reservation = {
      customerName: "Amended Guest",
      customerPhone: undefined,
      guestName: "Historical Guest",
      customerEmail: "private@example.test",
      guestContact: { phone: "+38970000999" },
    };
    expect(matchesReservationSearch(reservation, "amended")).toBe(true);
    expect(matchesReservationSearch(reservation, "historical")).toBe(false);
    expect(matchesReservationSearch(reservation, "private@")).toBe(false);
    expect(matchesReservationSearch(reservation, "000999")).toBe(false);
  });
});

describe("reservation status filters", () => {
  const visits = [
    {
      id: "upcoming",
      ...guest,
      status: "confirmed",
      startAt: Date.UTC(2099, 0),
    },
    { id: "late", ...guest, status: "confirmed", startAt: 0 },
    { id: "arrived", ...guest, status: "confirmed", arrivedAt: 0 },
    { id: "seated", ...guest, status: "seated", arrivedAt: 1 },
    { id: "completed", ...guest, status: "completed", arrivedAt: 1 },
    { id: "cancelled", ...guest, status: "cancelled", arrivedAt: 1 },
    { id: "no-show", ...guest, status: "no_show" },
    { id: "legacy", ...guest, status: "pending" },
  ] as const;

  it("keeps late, unarrived reservations in Upcoming", () => {
    expect(
      filterReservations(visits, { status: "upcoming", search: "" }).map(
        ({ id }) => id,
      ),
    ).toEqual(["upcoming", "late"]);
  });

  it("derives Arrived only for confirmed reservations, including epoch timestamps", () => {
    expect(reservationStatusFilter(visits[2])).toBe("arrived");
    expect(reservationStatusFilter(visits[3])).toBe("seated");
    expect(reservationStatusFilter(visits[4])).toBe("completed");
    expect(reservationStatusFilter(visits[5])).toBe("cancelled");
  });

  it.each([
    ["arrived", "arrived"],
    ["seated", "seated"],
    ["completed", "completed"],
    ["cancelled", "cancelled"],
    ["no_show", "no-show"],
    ["pending", "legacy"],
  ] as const)("keeps %s independently accessible", (status, id) => {
    expect(
      filterReservations(visits, { status, search: "" }).map(
        (visit) => visit.id,
      ),
    ).toEqual([id]);
  });

  it("combines search and status without reordering or changing the source", () => {
    const others = [
      { id: "other", customerName: "Another Guest", status: "seated" as const },
      ...visits,
    ];
    const filtered = filterReservations(others, {
      status: "seated",
      search: "123 456",
    });
    expect(filtered.map(({ id }) => id)).toEqual(["seated"]);
    expect(filtered[0]).toBe(visits[3]);
    expect(others).toHaveLength(9);
    expect(filterReservations(visits, { status: "all", search: "" })).toEqual(
      visits,
    );
  });

  it("counts every matching lifecycle state without conflating arrivals or no-shows", () => {
    expect(countReservationStatuses(visits, "elena")).toEqual({
      all: 8,
      upcoming: 2,
      arrived: 1,
      seated: 1,
      completed: 1,
      cancelled: 1,
      no_show: 1,
      pending: 1,
    });
  });

  it("counts only search matches and retains zero counts for unavailable statuses", () => {
    const matching = [
      { ...guest, status: "seated" as const },
      { ...guest, status: "completed" as const, guestErased: true },
      { customerName: "Another Guest", status: "cancelled" as const },
    ];
    expect(countReservationStatuses(matching, "elena")).toEqual({
      all: 1,
      upcoming: 0,
      arrived: 0,
      seated: 1,
      completed: 0,
      cancelled: 0,
      no_show: 0,
      pending: 0,
    });
    expect(countReservationStatuses(matching, "").all).toBe(3);
    expect(countReservationStatuses(matching, "unknown").all).toBe(0);
    expect(countReservationStatuses([], "").all).toBe(0);
  });
});
