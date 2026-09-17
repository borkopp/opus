import { v, type Infer } from "convex/values";

export const metricValidator = v.union(
  v.literal("completed_value"),
  v.literal("appointments"),
  v.literal("completed_appointments"),
  v.literal("cancellations"),
  v.literal("no_shows"),
  v.literal("cancellation_rate"),
  v.literal("no_show_rate"),
  v.literal("utilisation"),
  v.literal("returning_client_share"),
  v.literal("returning_clients"),
);
export const groupValidator = v.union(
  v.literal("total"),
  v.literal("day"),
  v.literal("weekday"),
  v.literal("staff"),
  v.literal("service"),
);
export const periodValidator = v.object({
  preset: v.union(
    v.literal("this_month"),
    v.literal("last_month"),
    v.literal("this_week"),
    v.literal("last_week"),
    v.literal("last_90_days"),
    v.literal("next_week"),
    v.literal("custom"),
  ),
  startDate: v.union(v.string(), v.null()),
  endDate: v.union(v.string(), v.null()),
});
export const analysisValidator = v.object({
  metric: metricValidator,
  groupBy: groupValidator,
  period: periodValidator,
  comparison: v.union(
    v.literal("previous_period"),
    v.literal("previous_year"),
    v.null(),
  ),
  staffName: v.union(v.string(), v.null()),
  serviceName: v.union(v.string(), v.null()),
});
export type AnalysisRequest = Infer<typeof analysisValidator>;
export type Metric = AnalysisRequest["metric"];

export const reportRowValidator = v.object({
  label: v.string(),
  value: v.union(v.number(), v.null()),
  appointments: v.number(),
  completed: v.number(),
  cancelled: v.number(),
  noShows: v.number(),
  bookedMinutes: v.number(),
  availableMinutes: v.union(v.number(), v.null()),
  completedValueMinor: v.union(v.number(), v.null()),
  observedDays: v.number(),
});
export const reportValidator = v.object({
  key: v.string(),
  request: analysisValidator,
  startMs: v.number(),
  endMs: v.number(),
  asOf: v.number(),
  timezone: v.string(),
  currency: v.union(v.string(), v.null()),
  unit: v.union(v.literal("money"), v.literal("percent"), v.literal("count")),
  total: reportRowValidator,
  rows: v.array(reportRowValidator),
  previous: v.union(
    v.object({
      startMs: v.number(),
      endMs: v.number(),
      total: reportRowValidator,
      currency: v.union(v.string(), v.null()),
    }),
    v.null(),
  ),
  changePercent: v.union(v.number(), v.null()),
  warnings: v.array(v.string()),
});
export type AnalystReport = Infer<typeof reportValidator>;
export type ReportRow = Infer<typeof reportRowValidator>;

export const answerValidator = v.object({
  text: v.string(),
  reportKeys: v.array(v.string()),
  recommendations: v.array(
    v.object({
      evidence: v.string(),
      suggestion: v.string(),
      measurement: v.string(),
      reportKeys: v.array(v.string()),
    }),
  ),
  followUps: v.array(v.string()),
});
export type AnalystAnswer = Infer<typeof answerValidator>;
export const depthValidator = v.union(v.literal("standard"), v.literal("deep"));

export const scheduleValidator = v.object({
  staff: v.array(v.object({ id: v.string(), active: v.boolean() })),
  rules: v.array(
    v.object({
      staffId: v.string(),
      dayOfWeek: v.number(),
      startTime: v.string(),
      endTime: v.string(),
      breaks: v.array(v.object({ startTime: v.string(), endTime: v.string() })),
    }),
  ),
  overrides: v.array(
    v.object({
      staffId: v.string(),
      date: v.string(),
      type: v.union(v.literal("day_off"), v.literal("custom_hours")),
      startTime: v.union(v.string(), v.null()),
      endTime: v.union(v.string(), v.null()),
    }),
  ),
});
export type Schedule = Infer<typeof scheduleValidator>;
