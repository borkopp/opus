import { ConvexError } from "convex/values";
import { getErrorMessage } from "@/lib/file-validation";
import { getTranslations, type DashboardLanguage } from "@/lib/i18n/types";

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
    const dict = getTranslations(language);
    const code = error.data.code as keyof typeof dict.staffErrors;
    if (dict.staffErrors[code]) {
      return dict.staffErrors[code];
    }
  }
  return getErrorMessage(error, fallback);
}
