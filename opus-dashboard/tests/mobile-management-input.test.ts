import { describe, expect, it } from "vitest";
import {
  priceInput,
  priceMinorUnits,
} from "../../opus-mobile/src/lib/management";
describe("mobile service price entry", () => {
  it("parses decimal commas and dots directly into exact minor units", () => {
    expect(priceMinorUnits("19,90")).toBe(1990);
    expect(priceMinorUnits("19.9")).toBe(1990);
    expect(priceMinorUnits("0")).toBe(0);
    expect(priceMinorUnits(priceInput(133250))).toBe(133250);
    expect(priceMinorUnits("0.29")).toBe(29);
  });
  it("rejects fractions below a minor unit, negative values and unsafe integers", () => {
    for (const value of [
      "",
      "-1",
      "1.001",
      "1e3",
      "Infinity",
      "9007199254740991",
    ])
      expect(priceMinorUnits(value)).toBeNull();
  });
});
