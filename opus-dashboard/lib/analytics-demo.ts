import type {
  StudioAnalytics,
  StudioAnalyticsSummary,
} from "./studio-analytics";
import type { AnalyticsFilters } from "./analytics-filters";
import { offsetMonth } from "./analytics-filters";
import type { Id } from "../convex/_generated/dataModel";

/** Synthetic Free-plan preview. No studio/client records are passed to it. */
export function buildAnalyticsDemo(filters: AnalyticsFilters): StudioAnalytics {
  const startMs = Date.parse(`${filters.startMonth}-01T00:00:00Z`);
  const endMs = Date.parse(`${offsetMonth(filters.endMonth, 1)}-01T00:00:00Z`);
  const single = filters.startMonth === filters.endMonth;
  const months =
    (new Date(endMs).getUTCFullYear() - new Date(startMs).getUTCFullYear()) *
      12 +
    new Date(endMs).getUTCMonth() -
    new Date(startMs).getUTCMonth();
  const scale = filters.staffId ? 0.55 : 1;
  const trend: StudioAnalytics["trend"] = [];
  for (let at = startMs, index = 0; at < endMs; index++) {
    const visits = Math.round(
      (single
        ? [5, 8, 6, 10, 9, 4, 0, 7, 11, 8, 6, 10][index % 12]
        : 170 + (index % 4) * 24) * scale,
    );
    trend.push({
      key: new Date(at).toISOString().slice(0, single ? 10 : 7),
      startAt: at,
      appointments: visits + (index % 4 === 0 ? 2 : 1),
      completedVisits: visits,
      appointmentValueMinorUnits: visits * (135000 + (index % 4) * 15000),
    });
    at = single
      ? at + 86_400_000
      : Date.UTC(
          new Date(at).getUTCFullYear(),
          new Date(at).getUTCMonth() + 1,
          1,
        );
  }
  const completedVisits = trend.reduce(
    (sum, point) => sum + point.completedVisits,
    0,
  );
  const appointmentValueMinorUnits = trend.reduce(
    (sum, point) => sum + point.appointmentValueMinorUnits,
    0,
  );
  const totalAppointments = trend.reduce(
    (sum, point) => sum + point.appointments,
    0,
  );
  const visitedClients = Math.round(completedVisits * 0.7);
  const returningClients = Math.round(visitedClients * 0.68);
  const summary: StudioAnalyticsSummary = {
    totalAppointments,
    completedVisits,
    visitedClients,
    returningClients,
    newClients: visitedClients - returningClients,
    returningClientPercent: visitedClients
      ? (returningClients / visitedClients) * 100
      : 0,
    appointmentValueMinorUnits,
    valuedVisits: completedVisits,
    averageAppointmentValueMinorUnits: completedVisits
      ? Math.round(appointmentValueMinorUnits / completedVisits)
      : 0,
    cancelledAppointments: Math.round(
      (totalAppointments - completedVisits) * 0.4,
    ),
    noShowAppointments: Math.round((totalAppointments - completedVisits) * 0.1),
  };
  const previous = { ...summary };
  for (const key of [
    "totalAppointments",
    "completedVisits",
    "visitedClients",
    "newClients",
    "returningClients",
    "valuedVisits",
    "appointmentValueMinorUnits",
  ] as const)
    previous[key] = Math.round(summary[key] * 0.84);
  return {
    studioName: "Demo Studio",
    timezone: "Europe/Skopje",
    generatedAt: endMs,
    currency: "MKD",
    currencies: ["MKD"],
    staff: [
      {
        id: "demo-specialist" as Id<"staff_members">,
        name: "Sample specialist",
        isActive: true,
      },
    ],
    selectedStaffId: filters.staffId
      ? (filters.staffId as Id<"staff_members">)
      : null,
    period: {
      startMonth: filters.startMonth,
      endMonth: filters.endMonth,
      startMs,
      endMs,
    },
    summary,
    previous: {
      period: {
        startMonth: offsetMonth(filters.startMonth, -months),
        endMonth: offsetMonth(filters.startMonth, -1),
        startMs: Date.parse(
          `${offsetMonth(filters.startMonth, -months)}-01T00:00:00Z`,
        ),
        endMs: startMs,
      },
      summary: previous,
    },
    trendGranularity: single ? "day" : "month",
    trend,
    statuses: [
      { status: "completed", count: completedVisits },
      {
        status: "confirmed",
        count:
          totalAppointments -
          completedVisits -
          summary.cancelledAppointments -
          summary.noShowAppointments,
      },
      { status: "checked_in", count: 0 },
      { status: "cancelled", count: summary.cancelledAppointments },
      { status: "no_show", count: summary.noShowAppointments },
    ],
    topServices: [
      "Gel manicure",
      "Cut & blow-dry",
      "Brow shape & tint",
      "Lash lift",
    ].map((name, index) => ({
      id: `demo-service-${index}`,
      name,
      completedVisits:
        index === 3
          ? completedVisits -
            Math.round(completedVisits * 0.38) -
            Math.round(completedVisits * 0.28) -
            Math.round(completedVisits * 0.2)
          : Math.round(completedVisits * [0.38, 0.28, 0.2][index]),
    })),
    clients: [],
  };
}
