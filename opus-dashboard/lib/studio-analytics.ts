import type { Id } from "../convex/_generated/dataModel";

export type StudioAnalyticsPeriod = {
  startMonth: string;
  endMonth: string;
  /** UTC-shaped studio wall-clock boundaries. The end is exclusive. */
  startMs: number;
  endMs: number;
};

export type StudioAnalyticsSummary = {
  totalAppointments: number;
  completedVisits: number;
  visitedClients: number;
  newClients: number;
  returningClients: number;
  returningClientPercent: number;
  /** Completed appointment prices in the selected currency, not payments. */
  appointmentValueMinorUnits: number;
  /** Completed visits priced in the selected currency. */
  valuedVisits: number;
  averageAppointmentValueMinorUnits: number;
  cancelledAppointments: number;
  noShowAppointments: number;
};

export type StudioAnalyticsTrendPoint = {
  /** YYYY-MM-DD for a single month; YYYY-MM for longer ranges. */
  key: string;
  startAt: number;
  appointments: number;
  completedVisits: number;
  appointmentValueMinorUnits: number;
};

export type StudioAnalyticsClient = {
  id: string;
  name: string;
  visits: number;
  appointmentValueMinorUnits: number;
  firstVisitAt: number;
  lastVisitAt: number;
  /** At least one completed studio visit before the selected period. */
  returning: boolean;
};

export type StudioAnalytics = {
  studioName: string;
  timezone: string;
  generatedAt: number;
  currency: string;
  currencies: string[];
  staff: { id: Id<"staff_members">; name: string; isActive: boolean }[];
  selectedStaffId: Id<"staff_members"> | null;
  period: StudioAnalyticsPeriod;
  summary: StudioAnalyticsSummary;
  previous: {
    period: StudioAnalyticsPeriod;
    summary: StudioAnalyticsSummary;
  };
  trendGranularity: "day" | "month";
  trend: StudioAnalyticsTrendPoint[];
  statuses: {
    status: "confirmed" | "checked_in" | "completed" | "cancelled" | "no_show";
    count: number;
  }[];
  /** All represented services, sorted by completed visits. A bundle counts once
   * for each included service; its full price is never duplicated per service. */
  topServices: { id: string; name: string; completedVisits: number }[];
  /** Completed visitors in the selected period; contact details stay in CRM. */
  clients: StudioAnalyticsClient[];
};
