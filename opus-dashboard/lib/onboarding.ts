import type { FunctionReturnType } from "convex/server";
import type { api } from "@/convex/_generated/api";
import type { beautyCategories } from "./i18n/onboarding";

export type ActivationState = NonNullable<
  FunctionReturnType<typeof api.activation.getState>
>;
export type BeautyCategory = (typeof beautyCategories)[number][0];
export type WizardStep =
  | "business"
  | "category"
  | "owner"
  | "location"
  | "service"
  | "hours"
  | "review";
export const ONBOARDING_STEPS: WizardStep[] = [
  "business",
  "category",
  "owner",
  "location",
  "service",
  "hours",
  "review",
];
export const PRO_ONBOARDING_STEPS = ONBOARDING_STEPS.slice(0, -1);

// Preserve bookmarks and unfinished sessions from the longer wizard.
const STEP_ALIASES: Record<string, WizardStep> = {
  business: "business",
  "business-name": "business",
  "business-category": "category",
  category: "category",
  owner: "owner",
  location: "location",
  service: "service",
  "service-name": "service",
  "service-price": "service",
  "service-duration": "service",
  hours: "hours",
  "hours-0": "hours",
  theme: "review",
  storefront: "review",
  review: "review",
};
export function onboardingStep(value: string | null): WizardStep | null {
  return value ? (STEP_ALIASES[value] ?? null) : null;
}

export interface ServiceDraft {
  name: string;
  price: string;
  durationMins: number;
}
export function validateFirstService(
  service: ServiceDraft,
  slotDurationMins: number,
) {
  if (service.name.trim().length < 2) return "name";
  if (
    !/^\d+([.,]\d{1,2})?$/.test(service.price.trim()) ||
    !Number.isSafeInteger(
      Math.round(Number(service.price.replace(",", ".")) * 100),
    )
  )
    return "price";
  if (
    !Number.isInteger(service.durationMins) ||
    service.durationMins <= 0 ||
    service.durationMins % slotDurationMins !== 0
  )
    return "duration";
  return null;
}

export type OnboardingIndustry = "beauty_wellness" | "hospitality";

export function onboardingIndustry(
  value: string | null,
): OnboardingIndustry | null {
  return value === "beauty_wellness" || value === "hospitality" ? value : null;
}

/** Selection is only a URL draft. The persisted organization remains authoritative. */
export function onboardingChoicePath(
  search: string,
  industry?: OnboardingIndustry,
) {
  const params = new URLSearchParams(search);
  params.delete("step");
  if (industry) params.set("industry", industry);
  else params.delete("industry");
  const query = params.toString();
  return `/onboarding${query ? `?${query}` : ""}`;
}

/** Creating a venue completes onboarding; publication is configured in the dashboard. */
export function hospitalityHome(hasVenue: boolean, role?: string) {
  return hasVenue || role === "staff" ? "/hospitality" : "/hospitality/setup";
}
