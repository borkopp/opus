import { describe, expect, it } from "vitest";
import {
  closureTimeInput,
  closureTimeOptions,
  resolveClosureTime,
} from "../../lib/reservation-closure-time";

const timezone = "Europe/Skopje";
const instant = Date.parse;

describe("closure endpoints across clock changes", () => {
  it.each([
    ["2026-10-25T00:30:00Z", "earlier"],
    ["2026-10-25T01:30:00Z", "later"],
  ] as const)(
    "preserves saved %s when only the closure reason changes",
    (saved, occurrence) => {
      const value = instant(saved);
      const draft = closureTimeInput(value, timezone);
      expect(draft).toEqual({ value: "2026-10-25T02:30", occurrence });
      expect(resolveClosureTime(draft, timezone, value)).toBe(value);
      expect(resolveClosureTime(draft, timezone)).toBe(value);
    },
  );

  it("can close across the repeated hour with different endpoint occurrences", () => {
    const start = closureTimeInput(instant("2026-10-25T00:45:00Z"), timezone);
    const end = closureTimeInput(instant("2026-10-25T01:15:00Z"), timezone);
    expect(start).toEqual({ value: "2026-10-25T02:45", occurrence: "earlier" });
    expect(end).toEqual({ value: "2026-10-25T02:15", occurrence: "later" });
    expect(
      resolveClosureTime(end, timezone)! - resolveClosureTime(start, timezone)!,
    ).toBe(30 * 60_000);
  });

  it("applies an explicit occurrence change to only that endpoint", () => {
    const saved = instant("2026-10-25T01:30:00Z");
    const draft = closureTimeInput(saved, timezone);
    expect(
      resolveClosureTime({ ...draft, occurrence: "earlier" }, timezone, saved),
    ).toBe(instant("2026-10-25T00:30:00Z"));
    expect(resolveClosureTime(draft, timezone, saved)).toBe(saved);
  });

  it("retains seconds and milliseconds on an unchanged saved endpoint", () => {
    const saved = instant("2026-10-25T01:30:24.123Z");
    expect(
      resolveClosureTime(closureTimeInput(saved, timezone), timezone, saved),
    ).toBe(saved);
    expect(
      resolveClosureTime(
        { value: "2026-10-25T02:45", occurrence: "later" },
        timezone,
        saved,
      ),
    ).toBe(instant("2026-10-25T01:45:00Z"));
  });

  it("rejects a nonexistent spring-forward time rather than shifting it", () => {
    const draft = { value: "2026-03-29T02:30", occurrence: "earlier" as const };
    expect(closureTimeOptions(draft.value, timezone)).toEqual([]);
    expect(resolveClosureTime(draft, timezone)).toBeNull();
  });

  it("handles ordinary times and midnight without inventing a repeated occurrence", () => {
    const saved = instant("2026-10-12T22:00:00Z");
    const draft = closureTimeInput(saved, timezone);
    expect(draft).toEqual({ value: "2026-10-13T00:00", occurrence: "earlier" });
    expect(closureTimeOptions(draft.value, timezone)).toEqual([saved]);
    expect(
      resolveClosureTime({ ...draft, occurrence: "later" }, timezone),
    ).toBe(saved);
    expect(closureTimeInput(undefined, timezone)).toEqual({
      value: "",
      occurrence: "earlier",
    });
  });

  it.each([
    "",
    "2026-10",
    "2026-10-25T",
    "2026-02-30T12:00",
    "2026-10-25T25:00",
  ])("tolerates incomplete local input %s while editing", (value) => {
    expect(closureTimeOptions(value, timezone)).toEqual([]);
  });
});
