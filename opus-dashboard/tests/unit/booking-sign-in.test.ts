import { describe, expect, it } from "vitest";
import {
  bookingResumeStep,
  parseBookingSignInDetails,
} from "../../lib/booking-sign-in";

const now = 1_800_000_000_000;
const path =
  "/book/atelier?service=cut&staff=any&date=2026-10-12&at=123&slotStaff=staff&resume=details&lang=en";
const details = {
  path,
  savedAt: now,
  name: "Client Name",
  email: "client@example.com",
  phone: "+38970123456",
  note: "Please call first",
};

describe("private booking draft during sign-in", () => {
  it("restores private details only for the matching booking return", () => {
    expect(
      parseBookingSignInDetails(JSON.stringify(details), path, now),
    ).toEqual(details);
    expect(
      parseBookingSignInDetails(
        JSON.stringify(details),
        "/book/another-studio",
        now,
      ),
    ).toBeNull();
    expect(
      parseBookingSignInDetails(JSON.stringify(details), `${path}&at=456`, now),
    ).toBeNull();
  });
  it("discards expired, malformed, or future drafts", () => {
    for (const draft of [
      null,
      "not-json",
      "null",
      JSON.stringify({ ...details, savedAt: now - 30 * 60 * 1000 - 1 }),
      JSON.stringify({ ...details, savedAt: now + 1 }),
      JSON.stringify({ ...details, phone: 123 }),
      JSON.stringify({ ...details, note: null }),
    ])
      expect(parseBookingSignInDetails(draft, path, now)).toBeNull();
  });
  it("resumes only known booking steps", () => {
    for (const step of ["service", "staff", "datetime", "details"])
      expect(bookingResumeStep(step)).toBe(step);
    for (const step of [undefined, "onboarding", "confirmed", ""])
      expect(bookingResumeStep(step)).toBeUndefined();
  });
});
