export type BookingResumeStep = "service" | "staff" | "datetime" | "details";

export function bookingResumeStep(
  value?: string,
): BookingResumeStep | undefined {
  return value === "service" ||
    value === "staff" ||
    value === "datetime" ||
    value === "details"
    ? value
    : undefined;
}

export const BOOKING_SIGN_IN_DRAFT_KEY = "opus-booking-sign-in-draft";

export type BookingSignInDetails = {
  path: string;
  savedAt: number;
  name: string;
  email: string;
  phone: string;
  note: string;
};

/** Private details stay in this browser tab, never in the return URL. */
export function parseBookingSignInDetails(
  serialized: string | null,
  path: string,
  now = Date.now(),
): BookingSignInDetails | null {
  if (!serialized) return null;
  try {
    const draft: unknown = JSON.parse(serialized);
    if (!draft || typeof draft !== "object") return null;
    const value = draft as Partial<BookingSignInDetails>;
    if (
      value.path !== path ||
      typeof value.savedAt !== "number" ||
      !Number.isFinite(value.savedAt) ||
      value.savedAt > now ||
      now - value.savedAt > 30 * 60 * 1000 ||
      typeof value.name !== "string" ||
      typeof value.email !== "string" ||
      typeof value.phone !== "string" ||
      typeof value.note !== "string"
    )
      return null;
    return value as BookingSignInDetails;
  } catch {
    return null;
  }
}
