import { ConvexError } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type {
  AnalysisRequest,
  AnalystReport,
  ReportRow,
  Schedule,
} from "./contracts";
import { availableMinutes } from "./schedules";
import { dateKey, DAY_MS } from "./periods";

export type AnalyticsData = {
  bookings: Doc<"bookings">[];
  staff: Pick<Doc<"staff_members">, "_id" | "displayName">[];
  services: Pick<Doc<"services">, "_id" | "name">[];
  firstVisits: Map<string, number> | null;
  schedules: { effectiveFrom: number; complete: boolean; schedule: Schedule }[];
  currentSchedule: { complete: boolean; schedule: Schedule };
};

type Bucket = {
  bookings: Doc<"bookings">[];
  dates: Set<string>;
  capacity: number;
  capacityKnown: boolean;
};
const round = (n: number) => Math.round(n * 100) / 100;
const normalise = (name: string) =>
  name.trim().normalize("NFKC").toLocaleLowerCase();

function namedId(items: { id: string; name: string }[], name: string | null) {
  if (!name) return null;
  const matches = items.filter(
    (item) => normalise(item.name) === normalise(name),
  );
  if (matches.length !== 1) throw new ConvexError("ANALYST_AMBIGUOUS_FILTER");
  return matches[0].id;
}

/** Shared deterministic aggregation for chat and the saved report UI. */
export function buildReport(
  request: AnalysisRequest,
  data: AnalyticsData,
  range: { startMs: number; endMs: number },
  context: {
    asOf: number;
    localNow: number;
    timezone: string;
    language: "en" | "mk";
    key: string;
  },
): AnalystReport {
  const { startMs, endMs } = range;
  const warnings = new Set<string>();
  const staffId = namedId(
    data.staff.map((s) => ({ id: s._id, name: s.displayName })),
    request.staffName,
  );
  const serviceId = namedId(
    data.services.map((s) => ({ id: s._id, name: s.name })),
    request.serviceName,
  );
  const staffNames = new Map(
    data.staff.map((s) => [String(s._id), s.displayName]),
  );
  const serviceNames = new Map(
    data.services.map((s) => [String(s._id), s.name]),
  );
  const serviceIds = (b: Doc<"bookings">) =>
    [...new Set(b.serviceIds?.length ? b.serviceIds : [b.serviceId])].sort();
  const bookings = data.bookings.filter(
    (b) =>
      !b.isDeleted &&
      b.startAt >= startMs &&
      b.startAt < endMs &&
      (!staffId || b.staffId === staffId) &&
      (!serviceId ||
        serviceIds(b).includes(serviceId as Doc<"services">["_id"])),
  );
  const completed = bookings.filter(
    (b) => b.status === "completed" && b.startAt < context.localNow,
  );
  const currencies = new Set(completed.map((b) => b.currency.toUpperCase()));
  const currency = currencies.size === 1 ? [...currencies][0] : null;
  if (currencies.size > 1) warnings.add("mixed_currencies");
  if (bookings.length < 10) warnings.add("small_sample");
  if (
    bookings.some((b) => b.status === "confirmed" && b.endAt < context.localNow)
  )
    warnings.add("unresolved_appointments");
  if (endMs > Math.floor(context.localNow / DAY_MS) * DAY_MS)
    warnings.add("includes_current_or_future_day");
  if (completed.some((b) => serviceIds(b).length > 1))
    warnings.add("combined_services");
  if (request.metric === "completed_value")
    warnings.add("appointment_value_not_payments");
  if (["returning_client_share", "returning_clients"].includes(request.metric))
    warnings.add("recorded_history_only");
  if (serviceId && request.metric === "utilisation")
    throw new ConvexError("ANALYST_SERVICE_CAPACITY_UNSUPPORTED");

  const buckets = new Map<string, { label: string; bucket: Bucket }>();
  const make = (): Bucket => ({
    bookings: [],
    dates: new Set(),
    capacity: 0,
    capacityKnown: true,
  });
  const total = make();
  const get = (key: string, label: string) => {
    let item = buckets.get(key);
    if (!item) {
      item = { label, bucket: make() };
      buckets.set(key, item);
    }
    return item.bucket;
  };
  const weekdayName = (day: number) =>
    new Intl.DateTimeFormat(context.language === "mk" ? "mk-MK" : "en-GB", {
      weekday: "long",
      timeZone: "UTC",
    }).format(Date.UTC(2026, 0, 4 + day));
  const groupForDate = (dateMs: number) =>
    request.groupBy === "weekday"
      ? [
          String(new Date(dateMs).getUTCDay()),
          weekdayName(new Date(dateMs).getUTCDay()),
        ]
      : [dateKey(dateMs), dateKey(dateMs)];

  // Populate zero-booking days too. Historical dates without a recorded
  // schedule remain unknown; they are never silently classified as closed.
  const versions = [...data.schedules].sort(
    (a, b) => a.effectiveFrom - b.effectiveFrom,
  );
  for (let day = startMs; day < endMs; day += DAY_MS) {
    const date = dateKey(day);
    const weekday = new Date(day).getUTCDay();
    const today = Math.floor(context.localNow / DAY_MS) * DAY_MS;
    const eligible = versions.filter((s) => s.effectiveFrom < day + DAY_MS);
    const selected = day >= today ? data.currentSchedule : eligible[eligible.length - 1];
    const known = Boolean(
      selected?.complete &&
      (day >= today || (versions[0]?.effectiveFrom ?? Infinity) <= day),
    );
    if (!known) warnings.add("historical_capacity_unavailable");
    let dayCapacity = 0;
    let dayKnown = known;
    const staff =
      selected?.schedule.staff ?? data.currentSchedule.schedule.staff;
    for (const member of staff) {
      if (staffId && member.id !== staffId) continue;
      const capacity =
        known && selected
          ? availableMinutes(selected.schedule, member.id, date, weekday)
          : null;
      dayCapacity += capacity ?? 0;
      dayKnown &&= capacity !== null;
      if (request.groupBy === "staff") {
        const bucket = get(
          member.id,
          staffNames.get(member.id) ??
            (context.language === "mk"
              ? "Поранешен член на тимот"
              : "Former team member"),
        );
        bucket.capacity += capacity ?? 0;
        bucket.capacityKnown &&= capacity !== null;
        if (capacity === null || capacity > 0) bucket.dates.add(date);
      }
    }
    total.capacity += dayCapacity;
    total.capacityKnown &&= dayKnown;
    if (!dayKnown || dayCapacity > 0) total.dates.add(date);
    if (request.groupBy === "day" || request.groupBy === "weekday") {
      const [key, label] = groupForDate(day);
      const bucket = get(key, label);
      bucket.capacity += dayCapacity;
      bucket.capacityKnown &&= dayKnown;
      if (!dayKnown || dayCapacity > 0) bucket.dates.add(date);
    }
  }
  for (const booking of bookings) {
    total.bookings.push(booking);
    const date = dateKey(booking.startAt);
    total.dates.add(date);
    let bucket: Bucket | undefined;
    if (request.groupBy === "staff")
      bucket = get(booking.staffId, staffNames.get(booking.staffId) ?? "—");
    else if (request.groupBy === "service") {
      const ids = serviceIds(booking);
      bucket = get(
        ids.join("+"),
        ids.map((id) => serviceNames.get(id) ?? "—").join(" + "),
      );
      bucket.capacityKnown = false;
    } else if (request.groupBy !== "total") {
      const [key, label] = groupForDate(booking.startAt);
      bucket = get(key, label);
    }
    if (bucket) {
      bucket.bookings.push(booking);
      bucket.dates.add(date);
    }
  }
  if (request.groupBy === "weekday") warnings.add("weekday_average");

  function summarise(
    bucket: Bucket,
    label: string,
    averageWeekday = false,
  ): ReportRow {
    const done = bucket.bookings.filter(
      (b) => b.status === "completed" && b.startAt < context.localNow,
    );
    const cancelled = bucket.bookings.filter(
      (b) => b.status === "cancelled",
    ).length;
    const noShows = bucket.bookings.filter(
      (b) => b.status === "no_show",
    ).length;
    // An empty period is zero; a mixed-currency period has no monetary total.
    const money =
      currencies.size <= 1
        ? done.reduce((sum, b) => sum + b.priceMinorUnits, 0)
        : null;
    const booked = bucket.bookings
      .filter((b) => b.status !== "cancelled" && b.status !== "no_show")
      .reduce((sum, b) => sum + Math.max(0, b.endAt - b.startAt) / 60_000, 0);
    const days = bucket.dates.size;
    const clients = new Set(done.map((b) => String(b.customerId)));
    const returning = [...clients].filter(
      (id) => (data.firstVisits?.get(id) ?? Infinity) < startMs,
    ).length;
    let value: number | null;
    switch (request.metric) {
      case "completed_value":
        value = money;
        break;
      case "appointments":
        value = bucket.bookings.length;
        break;
      case "completed_appointments":
        value = done.length;
        break;
      case "cancellations":
        value = cancelled;
        break;
      case "no_shows":
        value = noShows;
        break;
      case "cancellation_rate":
        value = bucket.bookings.length
          ? round((cancelled / bucket.bookings.length) * 100)
          : null;
        break;
      case "no_show_rate":
        value =
          done.length + noShows
            ? round((noShows / (done.length + noShows)) * 100)
            : null;
        break;
      case "utilisation":
        value =
          bucket.capacityKnown && bucket.capacity > 0
            ? round((booked / bucket.capacity) * 100)
            : null;
        break;
      case "returning_clients":
        value = data.firstVisits ? returning : null;
        break;
      case "returning_client_share":
        value =
          data.firstVisits && clients.size
            ? round((returning / clients.size) * 100)
            : null;
        break;
    }
    if (
      averageWeekday &&
      [
        "completed_value",
        "appointments",
        "completed_appointments",
        "cancellations",
        "no_shows",
      ].includes(request.metric)
    ) {
      value =
        value !== null && days > 0
          ? request.metric === "completed_value"
            ? Math.round(value / days)
            : round(value / days)
          : null;
    }
    if (request.metric === "utilisation" && value !== null && value > 100)
      warnings.add("capacity_exceeded");
    return {
      label,
      value,
      appointments: bucket.bookings.length,
      completed: done.length,
      cancelled,
      noShows,
      bookedMinutes: round(booked),
      availableMinutes: bucket.capacityKnown ? bucket.capacity : null,
      completedValueMinor: money,
      observedDays: days,
    };
  }
  const rows = [...buckets.values()].map(({ bucket, label }) =>
    summarise(bucket, label, request.groupBy === "weekday"),
  );
  const totalRow = summarise(
    total,
    context.language === "mk" ? "Вкупно" : "Total",
  );
  const unit =
    request.metric === "completed_value"
      ? "money"
      : [
            "appointments",
            "completed_appointments",
            "cancellations",
            "no_shows",
            "returning_clients",
          ].includes(request.metric)
        ? "count"
        : "percent";
  return {
    key: context.key,
    request,
    startMs,
    endMs,
    asOf: context.asOf,
    timezone: context.timezone,
    currency,
    unit,
    total: totalRow,
    rows,
    previous: null,
    changePercent: null,
    warnings: [...warnings],
  };
}
