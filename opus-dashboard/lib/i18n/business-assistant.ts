import type { Metric } from "@/convex/analyst/contracts";
import type { DashboardLanguage } from "./types";
import { getTranslations } from "./types";
import en from "./en";
import mk from "./mk";
import al from "./al";

export const analystMetricLabels: Record<
  Metric,
  Record<DashboardLanguage, string>
> = (function () {
  const result: Record<string, Record<DashboardLanguage, string>> = {};
  for (const metric of Object.keys(en.analyst.metrics) as Metric[]) {
    result[metric] = {
      en: en.analyst.metrics[metric],
      mk: mk.analyst.metrics[metric],
      sq: al.analyst.metrics[metric],
    };
  }
  return result as Record<Metric, Record<DashboardLanguage, string>>;
})();

export function getAnalystMetricLabel(
  metric: Metric,
  language: DashboardLanguage,
): string {
  const dict = getTranslations(language);
  return dict.analyst.metrics[metric] ?? metric;
}

export function analystWarning(
  code: string,
  language: DashboardLanguage,
): string {
  const dict = getTranslations(language);
  return dict.analyst.warnings[code] ?? code;
}

export function analystError(
  error: unknown,
  language: DashboardLanguage,
): string {
  const text = error instanceof Error ? error.message : String(error);
  const code = text.match(/ANALYST_[A-Z_]+/)?.[0] ?? "";
  const dict = getTranslations(language);
  return dict.analyst.errors[code] ?? dict.analyst.genericError;
}
