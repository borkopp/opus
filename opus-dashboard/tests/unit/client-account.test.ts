import { describe, expect, it } from "vitest";
import {
  clientBookingPath,
  clientSignInDestination,
  clientSignInPath,
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
  it("returns through client sign-in with the exact step and assigned specialist", () => {
    const booking = clientBookingPath("atelier", {
      service: "service",
      staff: "any",
      date: "2026-10-12",
      at: "123",
      slotStaff: "assigned-specialist",
      resume: "details",
      lang: "en",
      name: "Private name",
      phone: "+38970123456",
      note: "Private note",
    });
    const signIn = new URL(clientSignInPath(booking), "https://studio.opus.mk");
    expect(signIn.pathname).toBe("/account/sign-in");
    expect(signIn.searchParams.get("lang")).toBe("en");
    expect(
      clientSignInDestination(signIn.searchParams.get("callbackUrl")!),
    ).toBe(booking);
    const selection = new URL(booking, signIn.origin).searchParams;
    expect(selection.get("slotStaff")).toBe("assigned-specialist");
    expect(selection.get("resume")).toBe("details");
    expect(booking).not.toMatch(/Private|phone|note|name/);
  });
  it("never puts a business or external destination in the client sign-in link", () => {
    for (const destination of [
      "/onboarding",
      "/beauty",
      "https://evil.example",
      "/book/../settings",
    ]) {
      const signIn = new URL(
        clientSignInPath(destination),
        "https://studio.opus.mk",
      );
      expect(signIn.searchParams.get("callbackUrl")).toBe("/account");
    }
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
