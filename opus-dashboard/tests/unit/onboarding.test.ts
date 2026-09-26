import { expect, test } from "vitest";
import { onboardingStep, validateFirstService } from "../../lib/onboarding";

test.each(["service-name", "service-price", "service-duration"])(
  "old %s links reach the combined service form",
  (step) => {
    expect(onboardingStep(step)).toBe("service");
  },
);
test("theme no longer blocks launch", () =>
  expect(onboardingStep("theme")).toBe("review"));
test.each(["", "-1", "1e3", "10.999", "90071992547409910"])(
  "rejects invalid or unsafe service price %s",
  (price) => {
    expect(
      validateFirstService({ name: "Haircut", durationMins: 30, price }, 15),
    ).toBe("price");
  },
);
test("accepts Macedonian decimal prices and prevents incompatible durations", () => {
  expect(
    validateFirstService(
      { name: "Haircut", durationMins: 30, price: "500,50" },
      15,
    ),
  ).toBeNull();
  expect(
    validateFirstService(
      { name: "Haircut", durationMins: 20, price: "500" },
      15,
    ),
  ).toBe("duration");
});
