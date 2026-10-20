import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type {
  StudioAnalytics,
  StudioAnalyticsClient,
  StudioAnalyticsPeriod,
  StudioAnalyticsSummary,
  StudioAnalyticsTrendPoint,
} from "../../lib/studio-analytics";

const DAY_MS = 86_400_000;
const STATUSES = [
  "confirmed",
  "checked_in",
  "completed",
  "cancelled",
  "no_show",
] as const;

function monthIndex(month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))
    throw new ConvexError("Choose valid start and end months.");
  const year = Number(month.slice(0, 4));
  if (year < 2000 || year > 2100)
    throw new ConvexError("Choose months between 2000 and 2100.");
  return year * 12 + Number(month.slice(5)) - 1;
}

function monthStart(index: number) {
  return Date.UTC(Math.floor(index / 12), index % 12, 1);
}

function monthKey(index: number) {
  return new Date(monthStart(index)).toISOString().slice(0, 7);
}

export function analyticsPeriods(startMonth: string, endMonth: string) {
  const start = monthIndex(startMonth);
  const end = monthIndex(endMonth);
  const count = end - start + 1;
  if (count < 1 || count > 12)
    throw new ConvexError("Choose a range of 1 to 12 months.");
  const period: StudioAnalyticsPeriod = {
    startMonth,
    endMonth,
    startMs: monthStart(start),
    endMs: monthStart(end + 1),
  };
  const previous: StudioAnalyticsPeriod = {
    startMonth: monthKey(start - count),
    endMonth: monthKey(start - 1),
    startMs: monthStart(start - count),
    endMs: period.startMs,
  };
  return { period, previous, count };
}

type AnalyticsInput = {
  studioName: string;
  timezone: string;
  generatedAt: number;
  localNow: number;
  defaultCurrency: string;
  currency?: string;
  staffId?: Id<"staff_members">;
  periods: ReturnType<typeof analyticsPeriods>;
  customers: Doc<"customers">[];
  bookings: Doc<"bookings">[];
  completedHistory: Doc<"bookings">[];
  staff: Doc<"staff_members">[];
  services: Doc<"services">[];
};

function summaryFor(
  bookings: Doc<"bookings">[],
  startMs: number,
  firstVisits: Map<string, number>,
  currency: string,
): StudioAnalyticsSummary {
  const completed = bookings.filter(
    (booking) => booking.status === "completed",
  );
  const visitors = new Set(completed.map((booking) => booking.customerId));
  const returningClients = [...visitors].filter(
    (id) => (firstVisits.get(id) ?? Infinity) < startMs,
  ).length;
  const valued = completed.filter((booking) => booking.currency === currency);
  const appointmentValueMinorUnits = valued.reduce(
    (sum, booking) => sum + booking.priceMinorUnits,
    0,
  );
  return {
    totalAppointments: bookings.length,
    completedVisits: completed.length,
    visitedClients: visitors.size,
    newClients: visitors.size - returningClients,
    returningClients,
    returningClientPercent: visitors.size
      ? Math.round((returningClients / visitors.size) * 1000) / 10
      : 0,
    appointmentValueMinorUnits,
    valuedVisits: valued.length,
    averageAppointmentValueMinorUnits: valued.length
      ? Math.round(appointmentValueMinorUnits / valued.length)
      : 0,
    cancelledAppointments: bookings.filter((b) => b.status === "cancelled")
      .length,
    noShowAppointments: bookings.filter((b) => b.status === "no_show").length,
  };
}

export function buildStudioAnalytics(input: AnalyticsInput): StudioAnalytics {
  const { period, previous, count } = input.periods;
  const customers = new Map(
    input.customers
      .filter((customer) => !customer.isDeleted)
      .map((customer) => [customer._id, customer]),
  );
  const eligible = (booking: Doc<"bookings">) =>
    !booking.isDeleted &&
    customers.has(booking.customerId) &&
    // A future appointment marked completed is not yet a completed visit.
    (booking.status !== "completed" || booking.startAt <= input.localNow);
  const firstVisits = new Map<string, number>();
  for (const booking of input.completedHistory) {
    if (!eligible(booking) || booking.status !== "completed") continue;
    firstVisits.set(
      booking.customerId,
      Math.min(
        firstVisits.get(booking.customerId) ?? Infinity,
        booking.startAt,
      ),
    );
  }
  const eligibleBookings = input.bookings.filter(eligible);
  const currencies = [
    ...new Set([
      input.defaultCurrency,
      ...eligibleBookings.map((b) => b.currency),
    ]),
  ].sort();
  const bookings = eligibleBookings.filter(
    (booking) => !input.staffId || booking.staffId === input.staffId,
  );
  const currency = input.currency ?? input.defaultCurrency;
  if (!/^[A-Z]{3}$/.test(currency) || !currencies.includes(currency))
    throw new ConvexError("Choose an available currency.");
  const inPeriod = (range: StudioAnalyticsPeriod) =>
    bookings.filter(
      (booking) =>
        booking.startAt >= range.startMs && booking.startAt < range.endMs,
    );
  const currentBookings = inPeriod(period);
  const trendGranularity = count === 1 ? "day" : "month";
  const trendMap = new Map<string, StudioAnalyticsTrendPoint>();
  for (
    let startAt = period.startMs;
    startAt < period.endMs;
    startAt =
      trendGranularity === "day"
        ? startAt + DAY_MS
        : Date.UTC(
            new Date(startAt).getUTCFullYear(),
            new Date(startAt).getUTCMonth() + 1,
            1,
          )
  ) {
    const key = new Date(startAt)
      .toISOString()
      .slice(0, trendGranularity === "day" ? 10 : 7);
    trendMap.set(key, {
      key,
      startAt,
      appointments: 0,
      completedVisits: 0,
      appointmentValueMinorUnits: 0,
    });
  }
  const clients = new Map<string, StudioAnalyticsClient>();
  const services = new Map(
    input.services.map((service) => [service._id, service]),
  );
  const serviceVisits = new Map<string, number>();
  const statusCounts = new Map<string, number>();
  for (const booking of currentBookings) {
    const key = new Date(booking.startAt)
      .toISOString()
      .slice(0, trendGranularity === "day" ? 10 : 7);
    const point = trendMap.get(key)!;
    point.appointments += 1;
    statusCounts.set(
      booking.status,
      (statusCounts.get(booking.status) ?? 0) + 1,
    );
    if (booking.status !== "completed") continue;
    const value = booking.currency === currency ? booking.priceMinorUnits : 0;
    point.completedVisits += 1;
    point.appointmentValueMinorUnits += value;
    const client = clients.get(booking.customerId) ?? {
      id: booking.customerId,
      name: customers.get(booking.customerId)!.name,
      visits: 0,
      appointmentValueMinorUnits: 0,
      firstVisitAt: firstVisits.get(booking.customerId) ?? booking.startAt,
      lastVisitAt: booking.startAt,
      returning:
        (firstVisits.get(booking.customerId) ?? booking.startAt) <
        period.startMs,
    };
    client.visits += 1;
    client.appointmentValueMinorUnits += value;
    client.lastVisitAt = Math.max(client.lastVisitAt, booking.startAt);
    clients.set(booking.customerId, client);
    for (const id of new Set(booking.serviceIds ?? [booking.serviceId])) {
      if (!services.has(id)) continue;
      serviceVisits.set(id, (serviceVisits.get(id) ?? 0) + 1);
    }
  }
  return {
    studioName: input.studioName,
    timezone: input.timezone,
    generatedAt: input.generatedAt,
    currency,
    currencies,
    selectedStaffId: input.staffId ?? null,
    staff: input.staff
      .filter((member) => !member.isDeleted)
      .map((member) => ({
        id: member._id,
        name: member.displayName,
        isActive: member.isActive,
      }))
      .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id)),
    period,
    summary: summaryFor(currentBookings, period.startMs, firstVisits, currency),
    previous: {
      period: previous,
      summary: summaryFor(
        inPeriod(previous),
        previous.startMs,
        firstVisits,
        currency,
      ),
    },
    trendGranularity,
    trend: [...trendMap.values()],
    statuses: STATUSES.map((status) => ({
      status,
      count: statusCounts.get(status) ?? 0,
    })),
    topServices: [...serviceVisits]
      .map(([id, completedVisits]) => ({
        id,
        name: services.get(id as Id<"services">)!.name,
        completedVisits,
      }))
      .sort(
        (a, b) =>
          b.completedVisits - a.completedVisits ||
          a.name.localeCompare(b.name) ||
          a.id.localeCompare(b.id),
      ),
    clients: [...clients.values()].sort(
      (a, b) =>
        b.visits - a.visits ||
        a.name.localeCompare(b.name) ||
        a.id.localeCompare(b.id),
    ),
  };
}
