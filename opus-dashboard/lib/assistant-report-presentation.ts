import type {
  AnalystReport,
  Metric,
  ReportRow,
} from "../convex/analyst/contracts";

export type ReportTemplate =
  | "summary"
  | "comparison"
  | "trend"
  | "ranking"
  | "share"
  | "empty"
  | "unavailable";

export type ReportChange = {
  /** Signed percentage change, or percentage-point difference for rates. */
  value: number;
  unit: "percent" | "points";
  direction: "up" | "down" | "flat";
  sentiment: "positive" | "negative" | "neutral";
};

const adverseMetrics = new Set<Metric>([
  "cancellations",
  "no_shows",
  "cancellation_rate",
  "no_show_rate",
]);

function usableValue(value: number | null): value is number {
  return value !== null && Number.isFinite(value);
}

function normalizeQuestion(question: string) {
  return question
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Unicode boundaries keep Macedonian terms usable without matching substrings
// such as "според" ("based on") as an explicit request to compare.
const comparisonIntent =
  /(?:^|[^\p{L}])(?:compar(?:e|es|ed|ing|ison)|versus|vs|според(?:и|ете|ба|би|ено|ува|уваат|ување)|во споредба|разлика|krahas(?:o|oni|im|imi|uar)|kundrejt)(?=$|[^\p{L}])/u;
const ascendingIntent =
  /(?:^|[^\p{L}])(?:lowest|least|fewest|bottom|quietest|weakest|slowest|најмалку|најниск[\p{L}]*|најслаб[\p{L}]*|најтив[\p{L}]*|најмир[\p{L}]*|me pak|me (?:te |i |e )?ulet[\p{L}]*|me (?:te |i |e )?qet[\p{L}]*|me (?:te |i |e )?dobet[\p{L}]*)(?=$|[^\p{L}])/u;
const descendingIntent =
  /(?:^|[^\p{L}])(?:highest|most|top|busiest|strongest|најмногу|највисок[\p{L}]*|најсил[\p{L}]*|најзафат[\p{L}]*|me shume|me (?:te |i |e )?lart[\p{L}]*|me (?:te |i |e )?ngarkuar[\p{L}]*)(?=$|[^\p{L}])/u;
const rankingIntent =
  /(?:^|[^\p{L}])(?:rank|ranked|ranking|ранг[\p{L}]*|rang[\p{L}]*|rendit[\p{L}]*)(?=$|[^\p{L}])/u;
const bestIntent =
  /(?:^|[^\p{L}])(?:best|најдобр[\p{L}]*|me (?:te |i |e )?mir[\p{L}]*)(?=$|[^\p{L}])/u;
const worstIntent =
  /(?:^|[^\p{L}])(?:worst|најлош[\p{L}]*|me (?:te |i |e )?keq[\p{L}]*)(?=$|[^\p{L}])/u;
const groupTerms = {
  day: /(?:^|[^\p{L}])(?:days?|dates?|weekdays?|ден|дена|денови[\p{L}]*|датум[\p{L}]*|dit[\p{L}]*)(?=$|[^\p{L}])/u,
  service:
    /(?:^|[^\p{L}])(?:services?|услуг[\p{L}]*|sherbim[\p{L}]*)(?=$|[^\p{L}])/u,
  staff:
    /(?:^|[^\p{L}])(?:staff|team|employees?|specialists?|тим[\p{L}]*|вработен[\p{L}]*|специјалист[\p{L}]*|staf[\p{L}]*|ekip[\p{L}]*|punonjes[\p{L}]*)(?=$|[^\p{L}])/u,
};

function relevantRankingText(report: AnalystReport, question: string) {
  const group =
    report.request.groupBy === "weekday" ? "day" : report.request.groupBy;
  if (group === "total") return question;
  // A multi-report question can request the weakest day and strongest service.
  // Scope adjectives to their own clause so they do not reverse another report.
  const clauses = question.split(
    /[,;?!/]|(?:^|\s)(?:and|but|и|а|dhe|por)(?=\s|$)/u,
  );
  const relevant = clauses.filter((clause) => groupTerms[group].test(clause));
  if (relevant.length > 0) return relevant.join(" ");
  return Object.values(groupTerms).some((terms) => terms.test(question))
    ? ""
    : question;
}

function rankingDirection(
  report: AnalystReport,
  question: string,
): "asc" | "desc" | null {
  const text = relevantRankingText(report, normalizeQuestion(question));
  if (ascendingIntent.test(text)) return "asc";
  if (descendingIntent.test(text)) return "desc";
  if (bestIntent.test(text))
    return adverseMetrics.has(report.request.metric) ? "asc" : "desc";
  if (worstIntent.test(text))
    return adverseMetrics.has(report.request.metric) ? "desc" : "asc";
  return rankingIntent.test(text) ? "desc" : null;
}

function usableMoney(report: AnalystReport) {
  // Warnings include both periods. A previous mixed-currency period must not
  // hide a usable current total; its own null total blocks comparison separately.
  return report.unit !== "money" || Boolean(report.currency?.trim());
}

/**
 * Whether totals can be compared at all. A zero baseline is valid here even
 * though it cannot produce a relative percentage change.
 */
export function hasReportComparison(report: AnalystReport): boolean {
  if (
    !report.previous ||
    !usableValue(report.total.value) ||
    !usableValue(report.previous.total.value) ||
    !usableMoney(report)
  )
    return false;

  if (report.unit !== "money") return true;
  const currentCurrency = report.currency?.trim().toUpperCase();
  const previousCurrency = report.previous.currency?.trim().toUpperCase();
  return (
    Boolean(currentCurrency) &&
    currentCurrency === previousCurrency &&
    !report.warnings.includes("comparison_currency_mismatch")
  );
}

export function getRankingDirection(
  report: AnalystReport,
  question = "",
): "asc" | "desc" {
  return rankingDirection(report, question) ?? "desc";
}

/** A fresh, stable ordering; unavailable values and known closed days cannot win. */
export function getRankedReportRows(
  report: AnalystReport,
  question = "",
): ReportRow[] {
  if (!usableMoney(report)) return [];
  const sign = getRankingDirection(report, question) === "asc" ? 1 : -1;
  return report.rows
    .filter((row) => usableValue(row.value) && row.observedDays > 0)
    .sort((left, right) => sign * (left.value! - right.value!));
}

export function selectReportTemplate(
  report: AnalystReport,
  question?: string,
): ReportTemplate {
  if (!usableValue(report.total.value) || !usableMoney(report))
    return "unavailable";
  if (report.total.appointments === 0) return "empty";

  const text = normalizeQuestion(question ?? "");
  const compare =
    comparisonIntent.test(text) ||
    (!text &&
      report.request.groupBy === "total" &&
      report.request.comparison !== null);
  if (compare && hasReportComparison(report)) return "comparison";

  const rankedRows = getRankedReportRows(report, question);
  const canRank = report.request.groupBy !== "total" && rankedRows.length > 0;
  if (canRank && rankingDirection(report, text)) return "ranking";

  if (report.request.groupBy === "day" && report.rows.length > 1)
    return "trend";
  if (report.unit === "percent") return "share";
  if (canRank && report.request.groupBy !== "day") return "ranking";
  return "summary";
}

/**
 * Select from the complete saved report before applying the chat's row limit.
 * Stored rows keep their original order so numeric fact references stay valid.
 */
export function previewAssistantReport(
  report: AnalystReport,
  question?: string,
): AnalystReport & { rowCount: number } {
  const template = selectReportTemplate(report, question);
  const rows =
    template === "ranking"
      ? getRankedReportRows(report, question).slice(0, 7)
      : template === "trend"
        ? [...report.rows]
            // Day report labels are ISO dates, independent of display language.
            .sort((left, right) =>
              left.label < right.label ? -1 : left.label > right.label ? 1 : 0,
            )
            .slice(-7)
        : report.rows.slice(0, 7);
  return { ...report, rows, rowCount: report.rows.length };
}

export function getReportChange(report: AnalystReport): ReportChange | null {
  if (!hasReportComparison(report)) return null;
  const current = report.total.value!;
  const previous = report.previous!.total.value!;
  const unit = report.unit === "percent" ? "points" : "percent";
  if (unit === "percent" && previous === 0) return null;

  const difference =
    unit === "points"
      ? current - previous
      : ((current - previous) / Math.abs(previous)) * 100;
  if (!Number.isFinite(difference)) return null;
  const rounded = Math.round(difference * 100) / 100;
  const value = Object.is(rounded, -0) ? 0 : rounded;
  const direction = value > 0 ? "up" : value < 0 ? "down" : "flat";
  const sentiment =
    direction === "flat" || !adverseMetrics.has(report.request.metric)
      ? "neutral"
      : direction === "down"
        ? "positive"
        : "negative";
  return { value, unit, direction, sentiment };
}
