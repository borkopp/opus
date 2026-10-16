import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import {
  reservationCleaningAttention,
  reservationDisplayTimezone,
  reservationTimingAttention,
  type ReservationTimingAttention,
} from "./reservationAttention";

type Visit = {
  reservationId: Id<"reservations">;
  revision: number;
  guestName: string;
  partySize: number;
  tableLabels: string[];
  startAt: number;
  endAt: number;
  serviceDate: string;
  status: Doc<"reservations">["status"];
  arrivedAt?: number;
  seatedAt?: number;
};
type FloorStatus =
  | "available"
  | "reserved"
  | "occupied"
  | "cleaning"
  | "inactive"
  | "closed"
  | "needs_review";

/** Read the actual physical holds, including unfinished visits from older service dates. */
export async function liveReservationFloor(ctx: QueryCtx, orgId: Id<"orgs">) {
  const asOf = Date.now();
  const [allTables, areas, allAllocations, allClosures, settings, unresolved] =
    await Promise.all([
      ctx.db
        .query("tables")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .collect(),
      ctx.db
        .query("floor_plans")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .collect(),
      ctx.db
        .query("reservation_allocations")
        .withIndex("by_org_active", (q) =>
          q.eq("orgId", orgId).eq("isActive", true),
        )
        .collect(),
      ctx.db
        .query("reservation_closures")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .collect(),
      ctx.db
        .query("reservation_settings")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .unique(),
      Promise.all(
        (["pending", "confirmed", "seated"] as const).map((status) =>
          ctx.db
            .query("reservations")
            .withIndex("by_org_status", (q) =>
              q.eq("orgId", orgId).eq("status", status),
            )
            .collect(),
        ),
      ),
    ]);
  const timezone = reservationDisplayTimezone(settings?.timezone);
  const tables = allTables.filter((table) => !table.isDeleted);
  const tableById = new Map(tables.map((table) => [table._id, table]));
  const reviewTableIds = new Set<Id<"tables">>();
  for (const reservation of unresolved.flat().filter((row) => !row.isDeleted)) {
    const assigned = reservation.tableIds?.length
      ? reservation.tableIds
      : [reservation.tableId];
    const validAllocation = (tableId: Id<"tables">) =>
      allAllocations.some(
        (row) =>
          !row.isDeleted &&
          row.reservationId === reservation._id &&
          row.tableId === tableId &&
          row.revision === reservation.revision &&
          row.kind !== "cleaning",
      );
    if (
      reservation.schemaVersion !== 2 ||
      reservation.timeModel !== "utc" ||
      !reservation.tableIds?.length ||
      assigned.some((id) => !validAllocation(id))
    ) {
      const affected = assigned.filter((id) => tableById.has(id));
      // An unassigned legacy visit blocks readiness for the whole venue.
      for (const id of affected.length
        ? affected
        : tables.map((table) => table._id))
        reviewTableIds.add(id);
    }
  }
  const activeAreas = new Set(
    areas
      .filter((area) => !area.isDeleted && area.isActive)
      .map((area) => area._id),
  );
  const allocations = allAllocations.filter(
    (row) => !row.isDeleted && (row.requiresRelease || row.endAt > asOf),
  );
  const closures = allClosures.filter(
    (row) => !row.isDeleted && row.startAt <= asOf && row.endAt > asOf,
  );
  const visits = new Map<Id<"reservations">, Visit>();
  const timings = new Map<
    Id<"reservations">,
    ReservationTimingAttention | null
  >();
  await Promise.all(
    [...new Set(allocations.map((row) => row.reservationId))].map(
      async (id) => {
        const row = await ctx.db.get(id);
        if (
          !row ||
          row.orgId !== orgId ||
          row.isDeleted ||
          row.schemaVersion !== 2 ||
          row.timeModel !== "utc" ||
          !row.serviceDate ||
          !row.revision
        )
          return;
        const customer = await ctx.db.get(row.customerId);
        const ownCustomer =
          customer?.orgId === orgId && !customer.isDeleted ? customer : null;
        timings.set(
          id,
          reservationTimingAttention(row, settings?.noShowGraceMins, asOf),
        );
        visits.set(id, {
          reservationId: id,
          revision: row.revision,
          guestName: ownCustomer
            ? (row.guestName ?? ownCustomer.name)
            : "Anonymised guest",
          partySize: row.partySize,
          // Allocation IDs are canonicalized for conflicts, not display order.
          tableLabels: [...(row.tableIds ?? [])]
            .sort((a, b) => {
              const first = tableById.get(a);
              const second = tableById.get(b);
              return (
                (first?.sortOrder ?? 0) - (second?.sortOrder ?? 0) ||
                (first?.label ?? "Table").localeCompare(
                  second?.label ?? "Table",
                  "en",
                  { numeric: true },
                )
              );
            })
            .map((tableId) => tableById.get(tableId)?.label ?? "Table"),
          startAt: row.startAt,
          endAt: row.endAt,
          serviceDate: row.serviceDate,
          status: row.status,
          arrivedAt: row.arrivedAt,
          seatedAt: row.seatedAt,
        });
      },
    ),
  );
  return {
    asOf,
    timezone,
    tables: tables
      .sort(
        (a, b) =>
          (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
          a.label.localeCompare(b.label),
      )
      .map((table) => {
        const rows = allocations.filter((row) => row.tableId === table._id);
        const holds = rows.filter((row) => row.requiresRelease);
        const occupied = holds.filter(
          (row) =>
            row.kind !== "cleaning" &&
            visits.get(row.reservationId)?.status === "seated",
        );
        const cleaningRows = holds.filter(
          (row) =>
            row.kind === "cleaning" &&
            ["seated", "completed"].includes(
              visits.get(row.reservationId)?.status ?? "",
            ),
        );
        const current = occupied.length
          ? visits.get(occupied[0].reservationId)!
          : null;
        const cleaning = cleaningRows.map((row) => ({
          ...visits.get(row.reservationId)!,
          readyAt: row.endAt,
          canRelease: reservationCleaningAttention(row.endAt, asOf).canRelease,
        }));
        const nextAllocation = rows
          .filter(
            (row) =>
              !row.requiresRelease &&
              visits.get(row.reservationId)?.status === "confirmed",
          )
          .sort((a, b) => a.startAt - b.startAt)[0];
        const next = nextAllocation
          ? visits.get(nextAllocation.reservationId)!
          : null;
        const closure = closures.find(
          (row) => !row.tableIds.length || row.tableIds.includes(table._id),
        );
        const inactive =
          table.isActive === false ||
          table.status === "inactive" ||
          !activeAreas.has(table.floorPlanId);
        // Never offer a release button for inconsistent holds or legacy status-only occupancy.
        const needsReview =
          reviewTableIds.has(table._id) ||
          holds.length > 1 ||
          holds.length !== occupied.length + cleaningRows.length ||
          rows.some(
            (row) =>
              !row.requiresRelease &&
              (row.kind === "cleaning" ||
                visits.get(row.reservationId)?.status !== "confirmed"),
          ) ||
          (!holds.length && ["occupied", "cleaning"].includes(table.status));
        const status: FloorStatus = needsReview
          ? "needs_review"
          : current
            ? "occupied"
            : cleaning.length
              ? "cleaning"
              : inactive
                ? "inactive"
                : closure
                  ? "closed"
                  : nextAllocation && nextAllocation.startAt <= asOf
                    ? "reserved"
                    : "available";
        return {
          tableId: table._id,
          status,
          inactive,
          current,
          cleaning,
          next,
          overdue: Boolean(
            current && timings.get(current.reservationId)?.kind === "overdue",
          ),
          late: Boolean(
            next && timings.get(next.reservationId)?.kind === "late_arrival",
          ),
          closure: closure
            ? {
                reason: closure.reason,
                startAt: closure.startAt,
                endAt: closure.endAt,
              }
            : null,
        };
      }),
  };
}
