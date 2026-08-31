import { describe, expect, test } from "vitest";
import { formatPrice } from "../lib/format-price";

describe("formatPrice", () => {
  test("falls back without throwing for legacy invalid locale and currency values", () => {
    expect(() => formatPrice(1_234, "legacy", "not_a_locale")).not.toThrow();
    expect(formatPrice(1_234, "legacy", "not_a_locale")).toBe("12.34 LEGACY");
    expect(formatPrice(1_234, "", "not_a_locale", false)).toBe("12 MKD");
  });
});
