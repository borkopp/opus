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
    "code" in error.data &&
    error.data.code === "FREE_STAFF_LIMIT"
  ) {
    return translate(
      language,
      "The Free plan allows 1 active owner and up to 3 active staff members (4 people total). Deactivate a team member or upgrade to OPUS Pro to add more.",
      "Бесплатниот план дозволува 1 активен сопственик и до 3 активни вработени (вкупно 4 лица). Деактивирајте член на тимот или преминете на OPUS Pro за да додадете повеќе.",
    );
  }
  return getErrorMessage(error, fallback);
}
