import type { Doc, Id } from "../_generated/dataModel";

const PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

function summariseMoney(bookings: Doc<"bookings">[]) {
  const currencies = new Set(
    bookings.map((booking) => booking.currency.toUpperCase()),
  );
  const currency = currencies.size === 1 ? [...currencies][0] : null;
  const revenueMinorUnits = currency
    ? bookings.reduce((total, booking) => total + booking.priceMinorUnits, 0)
    : null;

  return { currency, revenueMinorUnits };
}

/** Receives only the authenticated organization's bookings and services. */
export function buildDashboardAnalytics(
  bookings: Doc<"bookings">[],
  services: Doc<"services">[],
  endMs: number,
) {
  const startMs = endMs - PERIOD_MS;
  const previousStartMs = startMs - PERIOD_MS;
  const completed = bookings.filter(
    (booking) =>
      !booking.isDeleted &&
      booking.status === "completed" &&
      booking.startAt < endMs,
  );
  const firstVisitByCustomer = new Map<Id<"customers">, number>();
  for (const booking of completed) {
    firstVisitByCustomer.set(
      booking.customerId,
      Math.min(
        firstVisitByCustomer.get(booking.customerId) ?? Infinity,
        booking.startAt,
      ),
    );
  }

  const current = completed.filter((booking) => booking.startAt >= startMs);
  const previous = completed.filter(
    (booking) =>
      booking.startAt >= previousStartMs && booking.startAt < startMs,
  );

  function summariseClients(
    periodBookings: Doc<"bookings">[],
    periodStartMs: number,
  ) {
    const clients = new Set(
      periodBookings.map((booking) => booking.customerId),
    );
    const newClients = [...clients].filter(
      (id) => (firstVisitByCustomer.get(id) ?? Infinity) >= periodStartMs,
    ).length;
    const returningClients = clients.size - newClients;
    const money = summariseMoney(periodBookings);

    return {
      clients: clients.size,
      newClients,
      returningClients,
      newClientShare: clients.size > 0 ? (newClients / clients.size) * 100 : 0,
      returningClientShare:
        clients.size > 0 ? (returningClients / clients.size) * 100 : 0,
      completedAppointments: periodBookings.length,
      currency: money.currency,
      averageValueMinorUnits:
        money.revenueMinorUnits !== null && periodBookings.length > 0
          ? Math.round(money.revenueMinorUnits / periodBookings.length)
          : null,
    };
  }

  const serviceNames = new Map(
    services.map((service) => [service._id, service.name]),
  );
  const serviceGroups = new Map<
    string,
    {
      ids: Id<"services">[];
      current: Doc<"bookings">[];
      previousCount: number;
    }
  >();

  // A combined booking has one price snapshot. Keep it together instead of
  // attributing the full amount to every service or guessing a price split.
  function getServiceGroup(booking: Doc<"bookings">) {
    const ids = [
      ...new Set(
        booking.serviceIds?.length ? booking.serviceIds : [booking.serviceId],
      ),
    ].sort();
    const key = ids.join("+");
    let group = serviceGroups.get(key);
    if (!group) {
      group = { ids, current: [], previousCount: 0 };
      serviceGroups.set(key, group);
    }
    return group;
  }

  for (const booking of current) getServiceGroup(booking).current.push(booking);
  for (const booking of previous) getServiceGroup(booking).previousCount += 1;

  const rows = [...serviceGroups].map(([id, group]) => {
    const money = summariseMoney(group.current);
    const bookedMs = group.current.reduce(
      (sum, booking) => sum + Math.max(0, booking.endAt - booking.startAt),
      0,
    );
    const hasValidDurations = group.current.every(
      (booking) => booking.endAt > booking.startAt,
    );
    return {
      id,
      names: group.ids.map((serviceId) => serviceNames.get(serviceId) ?? null),
      isCombined: group.ids.length > 1,
      appointments: group.current.length,
      previousAppointments: group.previousCount,
      appointmentChange: group.current.length - group.previousCount,
      ...money,
      revenuePerHourMinorUnits:
        money.revenueMinorUnits !== null && bookedMs > 0 && hasValidDurations
          ? Math.round((money.revenueMinorUnits * 60 * 60 * 1000) / bookedMs)
          : null,
    };
  });
  const currentRows = rows.filter((row) => row.appointments > 0);
  const currentMoney = summariseMoney(current);
  const maxAppointments = Math.max(
    1,
    ...currentRows.map((row) => row.appointments),
  );
  const maxRevenue = Math.max(
    1,
    ...currentRows.map((row) => row.revenueMinorUnits ?? 0),
  );
  const chartRows = currentRows.map((row) => ({
    ...row,
    appointmentBarPct: (row.appointments / maxAppointments) * 100,
    revenueBarPct: ((row.revenueMinorUnits ?? 0) / maxRevenue) * 100,
  }));
  const byAppointments = [...chartRows].sort(
    (a, b) => b.appointments - a.appointments || a.id.localeCompare(b.id),
  );
  const byRevenue = currentMoney.currency
    ? [...chartRows].sort(
        (a, b) =>
          (b.revenueMinorUnits ?? 0) - (a.revenueMinorUnits ?? 0) ||
          b.appointments - a.appointments ||
          a.id.localeCompare(b.id),
      )
    : byAppointments;
  const biggestChange = [...rows]
    .filter((row) => row.appointmentChange !== 0)
    .sort(
      (a, b) =>
        Math.abs(b.appointmentChange) - Math.abs(a.appointmentChange) ||
        b.appointments - a.appointments ||
        a.id.localeCompare(b.id),
    )[0];
  const currentClients = summariseClients(current, startMs);
  const previousClients = summariseClients(previous, previousStartMs);

  return {
    servicePerformance: {
      byAppointments,
      byRevenue,
      canCompareRevenue: currentMoney.currency !== null,
      hasCombinedServices: currentRows.some((row) => row.isCombined),
      insight: biggestChange
        ? {
            names: biggestChange.names,
            appointmentChange: biggestChange.appointmentChange,
          }
        : null,
    },
    clientGrowth: {
      current: currentClients,
      previous: previousClients,
      clientChange: currentClients.clients - previousClients.clients,
    },
  };
}
