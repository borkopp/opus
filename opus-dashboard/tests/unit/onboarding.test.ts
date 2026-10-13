import { expect, test } from "vitest";
import {
  ONBOARDING_STEPS,
  PRO_ONBOARDING_STEPS,
  onboardingStep,
  validateFirstService,
  onboardingIndustry,
  onboardingChoicePath,
  hospitalityHome,
} from "../../lib/onboarding";

test("owner name is the third step in both onboarding flows", () => {
  expect(ONBOARDING_STEPS).toEqual([
    "business",
    "category",
    "owner",
    "location",
    "service",
    "hours",
    "review",
  ]);
  expect(PRO_ONBOARDING_STEPS).toEqual([
    "business",
    "category",
    "owner",
    "location",
    "service",
    "hours",
  ]);
  expect(onboardingStep("business-name")).toBe("business");
  expect(onboardingStep("business-category")).toBe("category");
  expect(onboardingStep("category")).toBe("category");
  expect(onboardingStep("owner")).toBe("owner");
});

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

test("business selection is resumable and reversible without losing beauty Pro intent", () => {
  const search = "plan=pro&team=5&currency=eur&step=service-duration";
  const selected = onboardingChoicePath(search, "hospitality");
  const url = new URL(selected, "https://studio.opus.mk");
  expect(url.pathname).toBe("/onboarding");
  expect(Object.fromEntries(url.searchParams)).toEqual({
    plan: "pro",
    team: "5",
    currency: "eur",
    industry: "hospitality",
  });
  expect(onboardingIndustry(url.searchParams.get("industry"))).toBe(
    "hospitality",
  );
  expect(onboardingChoicePath(url.search)).toBe(
    "/onboarding?plan=pro&team=5&currency=eur",
  );
  expect(onboardingChoicePath("", "beauty_wellness")).toBe(
    "/onboarding?industry=beauty_wellness",
  );
  expect(onboardingIndustry("restaurant")).toBeNull();
  expect(onboardingIndustry(null)).toBeNull();
});

test("a created venue opens its dashboard without requiring publication", () => {
  expect(hospitalityHome(false, "owner")).toBe("/hospitality/setup");
  expect(hospitalityHome(false, "manager")).toBe("/hospitality/setup");
  expect(hospitalityHome(false, "staff")).toBe("/hospitality");
  expect(hospitalityHome(true, "owner")).toBe("/hospitality");
  expect(hospitalityHome(true, "manager")).toBe("/hospitality");
});
