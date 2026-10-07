import { describe, expect, it } from "vitest";
import {
  clientBookingPath,
  clientSignInDestination,
} from "../../lib/client-account";

describe("client sign-in destinations", () => {
  it("keeps booking and recovery selections when moving to the shared origin", () => {
    expect(
      clientBookingPath("atelier", {
        service: ["service", "ignored"],
        staff: "any",
        date: "2026-10-12",
        at: "123",
        offer: "offer-proof",
        lang: "sq",
        email: "private@example.com",
        callbackUrl: "https://evil.example",
      }),
    ).toBe(
      "/book/atelier?service=service&staff=any&date=2026-10-12&at=123&offer=offer-proof&lang=sq",
    );
  });
  it("ignores unsupported language values without losing the booking selection", () => {
    expect(
      clientBookingPath("atelier", { service: "service", lang: "unknown" }),
    ).toBe("/book/atelier?service=service");
  });
  it("preserves a single-booking claim and selected public studio booking", () => {
    expect(clientSignInDestination("/account?claim=appointment")).toBe(
      "/account?claim=appointment",
    );
    const booking =
      "/book/atelier?service=service&staff=staff&date=2026-10-12&at=123";
    expect(clientSignInDestination(booking)).toBe(booking);
  });
  it.each([
    undefined,
    "//evil.example",
    "https://evil.example",
    "/\\evil.example",
    "/account\n",
    "/settings",
    "/onboarding",
    "/account/sign-in",
    "/book",
    "/book/../settings",
  ])(
    "keeps unsafe or business destinations in the client area: %s",
    (input) => {
      expect(clientSignInDestination(input)).toBe("/account");
    },
  );
});
