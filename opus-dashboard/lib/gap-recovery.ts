import { ConvexError } from "convex/values";
import en from "@/lib/i18n/en";

export function recoveryErrorMessage(
  error: unknown,
  t: (en: string, mk?: string, sq?: string) => string,
) {
  const message =
    error instanceof ConvexError && typeof error.data === "string"
      ? error.data
      : error instanceof Error
        ? error.message
        : "";

  const known = Object.keys(en.gapRecovery.errors).find((errorKey) =>
    message.includes(errorKey),
  );

  return known ? t(known) : t(en.gapRecovery.defaultError);
}

export function recoveryStatusLabel(
  status: string,
  t: (en: string, mk?: string, sq?: string) => string,
) {
  const label =
    en.gapRecovery.statuses[status] ?? en.gapRecovery.defaultStatus;
  return t(label);
}
