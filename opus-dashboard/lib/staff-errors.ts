import { ConvexError } from "convex/values";
import { getErrorMessage } from "@/lib/file-validation";
import { translate, type DashboardLanguage } from "@/lib/i18n/types";

export function getStaffErrorMessage(
  error: unknown,
  fallback: string,
  language: DashboardLanguage,
) {
  if (
    error instanceof ConvexError &&
    typeof error.data === "object" &&
    error.data !== null &&
    "code" in error.data
  ) {
    if (error.data.code === "FREE_STAFF_LIMIT") {
      return translate(
        language,
        "The Free plan allows 1 active owner and up to 3 active staff members (4 people total). Deactivate a team member or upgrade to OPUS Pro to add more.",
        "Бесплатниот план дозволува 1 активен сопственик и до 3 активни вработени (вкупно 4 лица). Деактивирајте член на тимот или преминете на OPUS Pro за да додадете повеќе.",
        "Plani Falas lejon 1 pronar aktiv dhe deri në 3 anëtarë stafi aktivë (gjithsej 4 persona). Çaktivizoni një anëtar të ekipit ose kaloni në OPUS Pro për të shtuar më shumë.",
      );
    }
    if (error.data.code === "PRO_STAFF_LIMIT") {
      return translate(
        language,
        "The Pro plan allows up to 12 active team members. Deactivate a team member to add more.",
        "Pro дозволува најмногу 12 активни членови на тимот. Деактивирајте член на тимот за да додадете повеќе.",
        "Plani Pro lejon deri në 12 anëtarë aktivë të ekipit. Çaktivizoni një anëtar të ekipit për të shtuar më shumë.",
      );
    }
  }
  return getErrorMessage(error, fallback);
}
