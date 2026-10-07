import type { DashboardLanguage } from "./types";
import { getTranslations } from "./types";
import mk from "./mk";
import al from "./al";

export const HANDOFF_REASONS_MK = mk.handoffReasons;
export const HANDOFF_REASONS_SQ = al.handoffReasons;

export function getHandoffReason(
  language: DashboardLanguage,
  reason: string,
): string {
  const dict = getTranslations(language);
  return dict.handoffReasons[reason] ?? reason;
}
