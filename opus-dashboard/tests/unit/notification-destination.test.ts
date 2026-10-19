import { describe, expect, it } from "vitest";
import {
  consumeNotificationDestination,
  updateNotificationDestination,
} from "@/lib/notification-destination";

const empty = { scope: "studio", id: null, date: null };

describe("notification destination commands", () => {
  it("applies a date-only link after a booking and allows reopening the same date", () => {
    const booking = updateNotificationDestination(undefined, {
      ...empty,
      id: "booking-a",
      date: "2026-10-19",
    });
    const date = updateNotificationDestination(booking, {
      ...empty,
      date: "2026-10-22",
    });
    expect(date).toMatchObject({ id: null, date: "2026-10-22", revision: 1 });
    const consumed = updateNotificationDestination(date, empty);
    expect(consumed).toMatchObject({
      id: null,
      date: "2026-10-22",
      revision: 1,
    });
    const reopened = updateNotificationDestination(consumed, {
      ...empty,
      date: "2026-10-22",
    });
    expect(reopened.revision).toBe(2);
  });

  it("retains a consumed booking until another command or studio change", () => {
    const request = { ...empty, id: "booking-a", date: "2026-10-19" };
    const opened = updateNotificationDestination(undefined, request);
    const consumed = updateNotificationDestination(opened, empty);
    expect(consumed).toMatchObject({ ...request, revision: 0 });
    expect(updateNotificationDestination(consumed, empty)).toBe(consumed);
    expect(updateNotificationDestination(consumed, request).revision).toBe(1);
    expect(
      updateNotificationDestination(consumed, { ...empty, scope: "other" }),
    ).toMatchObject({ scope: "other", id: null, date: null, revision: 1 });
  });

  it("consumes a date-only command while preserving unrelated URL state", () => {
    expect(
      consumeNotificationDestination(
        "https://studio.opus.mk/beauty/bookings?date=2026-10-22&view=week#calendar",
        "booking",
        { id: null, date: "2026-10-22" },
      ),
    ).toBe("/beauty/bookings?view=week#calendar");
  });

  it("does not consume a newer date for the same booking", () => {
    expect(
      consumeNotificationDestination(
        "https://studio.opus.mk/beauty/bookings?booking=a&date=2026-10-23",
        "booking",
        { id: "a", date: "2026-10-22" },
      ),
    ).toBeNull();
  });

  it("consumes conversations independently from calendar parameters", () => {
    expect(
      consumeNotificationDestination(
        "https://studio.opus.mk/ai-inbox?conversation=a&date=2026-10-22",
        "conversation",
        { id: "a", date: null },
      ),
    ).toBe("/ai-inbox?date=2026-10-22");
  });
});
