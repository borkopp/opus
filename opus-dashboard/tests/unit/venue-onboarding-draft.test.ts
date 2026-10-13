import { describe, expect, it } from "vitest";
import {
  emptyVenueDraft,
  parseVenueDraft,
  serializeVenueDraft,
  validVenueName,
  venueDraftKey,
} from "../../lib/venue-onboarding-draft";

const now = 1_800_000_000_000;
const day = 24 * 60 * 60 * 1000;

describe("private venue onboarding draft", () => {
  it("isolates a new business draft by verified account and current business", () => {
    const keys = [
      venueDraftKey("owner-a"),
      venueDraftKey("owner-b"),
      venueDraftKey("owner-a", "beauty-a"),
      venueDraftKey("owner-a", "beauty-b"),
    ];
    expect(new Set(keys).size).toBe(4);
    expect(venueDraftKey("owner:a", "business/b")).toContain(
      "owner%3Aa:business%2Fb",
    );
  });

  it("restores the in-progress step and explicit selection within one day", () => {
    const draft = {
      name: "Café Luna",
      type: "cafe" as const,
      step: 2 as const,
    };
    const stored = serializeVenueDraft(draft, now);
    expect(parseVenueDraft(stored, now + 1000)).toEqual(draft);
    expect(parseVenueDraft(stored, now + day)).toEqual(emptyVenueDraft());
  });

  it("does not preselect a venue type for a new account", () => {
    expect(parseVenueDraft(null, now)).toEqual({
      name: "",
      type: null,
      step: 1,
    });
  });

  it.each([null, "", "{", "null", "[]", '"hello"', "x".repeat(2001)])(
    "ignores malformed or oversized browser storage %s",
    (stored) => expect(parseVenueDraft(stored, now)).toEqual(emptyVenueDraft()),
  );

  it("does not restore expired, unversioned, or indefinitely retained data", () => {
    const draft = {
      name: "Luna",
      type: "restaurant",
      step: 2,
      version: 1,
      expiresAt: now + day,
    };
    expect(
      parseVenueDraft(JSON.stringify({ ...draft, version: 0 }), now),
    ).toEqual(emptyVenueDraft());
    expect(
      parseVenueDraft(JSON.stringify({ ...draft, expiresAt: now - 1 }), now),
    ).toEqual(emptyVenueDraft());
    expect(
      parseVenueDraft(
        JSON.stringify({ ...draft, expiresAt: now + day + 1 }),
        now,
      ),
    ).toEqual(emptyVenueDraft());
    expect(
      parseVenueDraft(JSON.stringify({ ...draft, name: "x".repeat(121) }), now),
    ).toEqual(emptyVenueDraft());
  });

  it("revalidates restored input before allowing the type step", () => {
    const draft = {
      name: " X ",
      type: "hotel",
      step: 2,
      version: 1,
      expiresAt: now + 1000,
    };
    expect(parseVenueDraft(JSON.stringify(draft), now)).toEqual({
      name: " X ",
      type: null,
      step: 1,
    });
  });
});

describe("venue name boundary", () => {
  it.each(["", "  ", "X", " X ", "x".repeat(121)])("rejects %s", (name) => {
    expect(validVenueName(name)).toBe(false);
  });
  it.each(["AB", "  Café Luna  ", "x".repeat(120)])("accepts %s", (name) => {
    expect(validVenueName(name)).toBe(true);
  });
});
