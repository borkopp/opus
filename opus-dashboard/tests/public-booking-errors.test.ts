import { describe, expect, test } from "vitest";
import { publicBookingErrorMessage } from "../lib/public-booking-errors";

describe("public booking errors", () => {
  test("translates a Convex validation error without exposing internals", () => {
    const error = new Error(
      "[CONVEX M(publicBooking:createPublicBooking)] [Request ID: secret] Server Error\n" +
        "Uncaught ConvexError: Enter a valid phone number.\n" +
        "    at handler (../convex/publicBooking.ts:173:26)",
    );

    const message = publicBookingErrorMessage(error);
    expect(message).toBe("Внесете валиден телефонски број.");
    expect(message).not.toContain("CONVEX");
    expect(message).not.toContain("Request ID");
  });

  test("uses a safe generic message for unknown failures", () => {
    expect(publicBookingErrorMessage(new Error("database details"))).toBe(
      "Резервацијата не можеше да се зачува. Обидете се повторно.",
    );
  });
});
