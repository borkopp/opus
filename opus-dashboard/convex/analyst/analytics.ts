import { v, ConvexError } from "convex/values";
import { internalQuery } from "../_generated/server";
import {
  analysisValidator,
  reportValidator,
  type AnalystReport,
} from "./contracts";
import { authorAccess } from "./access";
import { buildReport } from "./metrics";
import { comparisonPeriod, resolvePeriod } from "./periods";
import { loadAnalyticsData } from "./data";

export const analyse = internalQuery({
  args: {
    turnId: v.id("analyst_turns"),
    request: analysisValidator,
    key: v.string(),
  },
  returns: reportValidator,
  handler: async (ctx, { turnId, request, key }): Promise<AnalystReport> => {
    const turn = await ctx.db.get(turnId);
    if (!turn || turn.status !== "running" || turn.expiresAt <= Date.now())
      throw new ConvexError("ANALYST_EXPIRED");
    await authorAccess(ctx, turn);
    if (
      (request.staffName?.length ?? 0) > 100 ||
      (request.serviceName?.length ?? 0) > 100 ||
      !/^r[1-3]$/.test(key)
    ) {
      throw new ConvexError("ANALYST_INVALID_ANALYSIS");
    }
    if (request.groupBy === "service" && request.metric === "utilisation")
      throw new ConvexError("ANALYST_SERVICE_CAPACITY_UNSUPPORTED");
    const orgId = turn.orgId;
    const settings = await ctx.db
      .query("org_settings")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .first();
    const timezone = settings?.timezone ?? "Europe/Skopje";
    const range = resolvePeriod(request.period, timezone, turn.createdAt);
    const previous = comparisonPeriod(
      range.startMs,
      range.endMs,
      request.comparison,
      request.period.preset,
    );
    const data = await loadAnalyticsData(ctx, orgId, request, range, previous);
    const context = {
      asOf: Date.now(),
      localNow: range.localNow,
      timezone,
      language: turn.language,
      key,
    };
    const report = buildReport(request, data, range, context);
    if (!report.currency && !report.warnings.includes("mixed_currencies"))
      report.currency = settings?.currency ?? "MKD";
    if (previous) {
      const comparison = buildReport(request, data, previous, context);
      report.previous = {
        ...previous,
        total: comparison.total,
        currency: comparison.currency ?? settings?.currency ?? "MKD",
      };
      // Never compare different currencies, including one currency per period.
      const comparableCurrency =
        request.metric !== "completed_value" ||
        !comparison.currency ||
        comparison.currency === report.currency;
      if (!comparableCurrency)
        report.warnings.push("comparison_currency_mismatch");
      report.changePercent =
        comparableCurrency &&
        report.total.value !== null &&
        comparison.total.value !== null &&
        comparison.total.value !== 0
          ? Math.round(
              ((report.total.value - comparison.total.value) /
                Math.abs(comparison.total.value)) *
                10000,
            ) / 100
          : null;
      report.warnings = [
        ...new Set([...report.warnings, ...comparison.warnings]),
      ];
    }
    return report;
  },
});
