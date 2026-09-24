import type { Doc } from "../_generated/dataModel";

export type ClientSegment = "all" | "returning" | "unvisited";
export type ClientSort = "recent" | "visits" | "name";
export type ClientValue = { currency: string; amountMinorUnits: number };
export type ClientRecord = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  createdAt: number;
  visits: number;
  firstVisitAt: number | null;
  lastVisitAt: number | null;
  completedValue: ClientValue[];
};
export type ClientAppointment = {
  id: string;
  startAt: number;
  endAt: number;
  status: Doc<"bookings">["status"];
  services: string[];
  staffName: string;
  priceMinorUnits: number;
  currency: string;
};
export type ClientProfile = {
  client: ClientRecord;
  upcoming: ClientAppointment[];
  history: ClientAppointment[];
  cancelled: number;
  noShows: number;
  favouriteService: string | null;
};
export type ClientDirectory = {
  clients: ClientRecord[];
  total: number;
  page: number;
  pageSize: number;
  summary: {
    clients: number;
    completedVisits: number;
    returningClients: number;
  };
};
export const CLIENT_PAGE_SIZE = 20;

type Customer = Pick<
  Doc<"customers">,
  "_id" | "name" | "email" | "phone" | "avatarUrl" | "createdAt" | "isDeleted"
>;
type Visit = Pick<
  Doc<"bookings">,
  | "customerId"
  | "status"
  | "startAt"
  | "isDeleted"
  | "priceMinorUnits"
  | "currency"
>;

export function clientRecord(
  customer: Customer,
  visits: readonly Visit[],
  now: number,
): ClientRecord {
  const completed = visits.filter(
    (visit) =>
      !visit.isDeleted && visit.status === "completed" && visit.startAt <= now,
  );
  const amounts = new Map<string, number>();
  for (const visit of completed) {
    amounts.set(
      visit.currency,
      (amounts.get(visit.currency) ?? 0) + visit.priceMinorUnits,
    );
  }
  const times = completed.map((visit) => visit.startAt);
  return {
    id: customer._id,
    name: customer.name,
    email: customer.email ?? null,
    phone: customer.phone ?? null,
    avatarUrl: customer.avatarUrl ?? null,
    createdAt: customer.createdAt,
    visits: completed.length,
    firstVisitAt: times.length ? Math.min(...times) : null,
    lastVisitAt: times.length ? Math.max(...times) : null,
    completedValue: [...amounts]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([currency, amountMinorUnits]) => ({ currency, amountMinorUnits })),
  };
}

export function selectClients(
  clients: ClientRecord[],
  options: {
    search: string;
    segment: ClientSegment;
    sort: ClientSort;
    page: number;
  },
): ClientDirectory {
  const search = options.search.trim().normalize("NFKC").toLowerCase();
  const phoneSearch = /^[+\d\s().-]+$/.test(search)
    ? search.replace(/\D/g, "").replace(/^00/, "").replace(/^0/, "")
    : "";
  const matches = clients
    .filter((client) => {
      if (options.segment === "returning" && client.visits < 2) return false;
      if (options.segment === "unvisited" && client.visits !== 0) return false;
      if (!search) return true;
      const text = `${client.name} ${client.email ?? ""}`
        .normalize("NFKC")
        .toLowerCase();
      return (
        search.split(/\s+/).every((part) => text.includes(part)) ||
        Boolean(
          phoneSearch && client.phone?.replace(/\D/g, "").includes(phoneSearch),
        )
      );
    })
    .sort((a, b) => {
      if (options.sort === "visits" && a.visits !== b.visits)
        return b.visits - a.visits;
      if (options.sort === "recent" && a.lastVisitAt !== b.lastVisitAt)
        return (b.lastVisitAt ?? 0) - (a.lastVisitAt ?? 0);
      return a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
    });
  const page = Math.min(
    Math.max(0, Math.floor(options.page)),
    Math.max(0, Math.ceil(matches.length / CLIENT_PAGE_SIZE) - 1),
  );
  return {
    clients: matches.slice(
      page * CLIENT_PAGE_SIZE,
      (page + 1) * CLIENT_PAGE_SIZE,
    ),
    total: matches.length,
    page,
    pageSize: CLIENT_PAGE_SIZE,
    summary: {
      clients: clients.length,
      completedVisits: clients.reduce((sum, client) => sum + client.visits, 0),
      returningClients: clients.filter((client) => client.visits > 1).length,
    },
  };
}

export function buildClientRecords(
  customers: Customer[],
  visits: Visit[],
  now: number,
) {
  const byCustomer = new Map<string, Visit[]>();
  for (const visit of visits) {
    const items = byCustomer.get(visit.customerId) ?? [];
    items.push(visit);
    byCustomer.set(visit.customerId, items);
  }
  return customers
    .filter((customer) => !customer.isDeleted)
    .map((customer) =>
      clientRecord(customer, byCustomer.get(customer._id) ?? [], now),
    );
}
