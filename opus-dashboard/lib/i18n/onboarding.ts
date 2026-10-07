import type { DashboardLanguage } from "./types";
import { getTranslations } from "./types";
import { ConvexError } from "convex/values";
import en from "./en";
import mk from "./mk";
import al from "./al";

export const beautyCategories = [
  [
    "barbershop",
    en.onboarding.categories.barbershop.label,
    mk.onboarding.categories.barbershop.label,
    al.onboarding.categories.barbershop.label,
    en.onboarding.categories.barbershop.defaultService,
    mk.onboarding.categories.barbershop.defaultService,
    al.onboarding.categories.barbershop.defaultService,
  ],
  [
    "hair_salon",
    en.onboarding.categories.hair_salon.label,
    mk.onboarding.categories.hair_salon.label,
    al.onboarding.categories.hair_salon.label,
    en.onboarding.categories.hair_salon.defaultService,
    mk.onboarding.categories.hair_salon.defaultService,
    al.onboarding.categories.hair_salon.defaultService,
  ],
  [
    "nail_salon",
    en.onboarding.categories.nail_salon.label,
    mk.onboarding.categories.nail_salon.label,
    al.onboarding.categories.nail_salon.label,
    en.onboarding.categories.nail_salon.defaultService,
    mk.onboarding.categories.nail_salon.defaultService,
    al.onboarding.categories.nail_salon.defaultService,
  ],
  [
    "spa",
    en.onboarding.categories.spa.label,
    mk.onboarding.categories.spa.label,
    al.onboarding.categories.spa.label,
    en.onboarding.categories.spa.defaultService,
    mk.onboarding.categories.spa.defaultService,
    al.onboarding.categories.spa.defaultService,
  ],
  [
    "beauty_salon",
    en.onboarding.categories.beauty_salon.label,
    mk.onboarding.categories.beauty_salon.label,
    al.onboarding.categories.beauty_salon.label,
    en.onboarding.categories.beauty_salon.defaultService,
    mk.onboarding.categories.beauty_salon.defaultService,
    al.onboarding.categories.beauty_salon.defaultService,
  ],
  [
    "lash_studio",
    en.onboarding.categories.lash_studio.label,
    mk.onboarding.categories.lash_studio.label,
    al.onboarding.categories.lash_studio.label,
    en.onboarding.categories.lash_studio.defaultService,
    mk.onboarding.categories.lash_studio.defaultService,
    al.onboarding.categories.lash_studio.defaultService,
  ],
  [
    "brow_bar",
    en.onboarding.categories.brow_bar.label,
    mk.onboarding.categories.brow_bar.label,
    al.onboarding.categories.brow_bar.label,
    en.onboarding.categories.brow_bar.defaultService,
    mk.onboarding.categories.brow_bar.defaultService,
    al.onboarding.categories.brow_bar.defaultService,
  ],
  [
    "tattoo_studio",
    en.onboarding.categories.tattoo_studio.label,
    mk.onboarding.categories.tattoo_studio.label,
    al.onboarding.categories.tattoo_studio.label,
    en.onboarding.categories.tattoo_studio.defaultService,
    mk.onboarding.categories.tattoo_studio.defaultService,
    al.onboarding.categories.tattoo_studio.defaultService,
  ],
  [
    "massage_therapy",
    en.onboarding.categories.massage_therapy.label,
    mk.onboarding.categories.massage_therapy.label,
    al.onboarding.categories.massage_therapy.label,
    en.onboarding.categories.massage_therapy.defaultService,
    mk.onboarding.categories.massage_therapy.defaultService,
    al.onboarding.categories.massage_therapy.defaultService,
  ],
  [
    "wellness_center",
    en.onboarding.categories.wellness_center.label,
    mk.onboarding.categories.wellness_center.label,
    al.onboarding.categories.wellness_center.label,
    en.onboarding.categories.wellness_center.defaultService,
    mk.onboarding.categories.wellness_center.defaultService,
    al.onboarding.categories.wellness_center.defaultService,
  ],
  [
    "personal_trainer",
    en.onboarding.categories.personal_trainer.label,
    mk.onboarding.categories.personal_trainer.label,
    al.onboarding.categories.personal_trainer.label,
    en.onboarding.categories.personal_trainer.defaultService,
    mk.onboarding.categories.personal_trainer.defaultService,
    al.onboarding.categories.personal_trainer.defaultService,
  ],
] as const;

export const DAYS_MK = mk.onboarding.days;
export const DAYS_SQ = al.onboarding.days;
export const DAYS_SHORT_EN = en.onboarding.daysShort;
export const DAYS_SHORT_MK = mk.onboarding.daysShort;
export const DAYS_SHORT_SQ = al.onboarding.daysShort;

export const requirementCopy: Record<string, [string, string, string]> =
  (function () {
    const result: Record<string, [string, string, string]> = {};
    for (const key of Object.keys(en.onboarding.requirements)) {
      result[key] = [
        mk.onboarding.requirements[key].title,
        mk.onboarding.requirements[key].description,
        al.onboarding.requirements[key].description,
      ];
    }
    return result;
  })();

export function onboardingError(
  error: unknown,
  language: DashboardLanguage,
): string {
  const message =
    error instanceof ConvexError && typeof error.data === "string"
      ? error.data
      : error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : "Something went wrong. Try again.";

  const dict = getTranslations(language);
  if (dict.onboarding.errors[message]) {
    return dict.onboarding.errors[message];
  }
  if (language === "en") {
    return message;
  }
  return dict.onboarding.genericError;
}
