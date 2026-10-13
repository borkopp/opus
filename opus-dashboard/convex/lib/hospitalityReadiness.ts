import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { isHospitalityOrg } from "./hospitalityAccess";
import { validateReservationSettings } from "./hospitalitySettingsValidation";

export async function getHospitalityReadiness(
  ctx: Pick<QueryCtx, "db">,
  org: Doc<"orgs">,
) {
  const [settings, areas, tables, combinations, reservations, allocations] =
    await Promise.all([
      ctx.db
        .query("reservation_settings")
        .withIndex("by_org", (q) => q.eq("orgId", org._id))
        .first(),
      ctx.db
        .query("floor_plans")
        .withIndex("by_org", (q) => q.eq("orgId", org._id))
        .collect(),
      ctx.db
        .query("tables")
        .withIndex("by_org", (q) => q.eq("orgId", org._id))
        .collect(),
      ctx.db
        .query("table_combinations")
        .withIndex("by_org", (q) => q.eq("orgId", org._id))
        .collect(),
      Promise.all(
        (["pending", "confirmed", "seated"] as const).map((status) =>
          ctx.db
            .query("reservations")
            .withIndex("by_org_status", (q) =>
              q.eq("orgId", org._id).eq("status", status),
            )
            .collect(),
        ),
      ).then((rows) => rows.flat()),
      ctx.db
        .query("reservation_allocations")
        .withIndex("by_org_active", (q) =>
          q.eq("orgId", org._id).eq("isActive", true),
        )
        .collect(),
    ]);
  const activeAllocations = allocations.filter(
    (allocation) => !allocation.isDeleted,
  );
  const activeAreas = new Set(
    areas
      .filter((area) => !area.isDeleted && area.isActive)
      .map((area) => area._id),
  );
  const activeTables = tables.filter(
    (table) =>
      !table.isDeleted &&
      table.isActive !== false &&
      table.status !== "inactive" &&
      Number.isInteger(table.capacity) &&
      table.capacity > 0 &&
      (!["occupied", "cleaning"].includes(table.status) ||
        activeAllocations.some(
          (allocation) =>
            allocation.tableId === table._id && allocation.requiresRelease,
        )) &&
      activeAreas.has(table.floorPlanId),
  );
  let rulesValid = Boolean(
    settings?.schemaVersion === 2 && settings.servicePeriods?.length,
  );
  if (settings) {
    try {
      validateReservationSettings({
        ...settings,
        timezone: settings.timezone ?? "",
        bufferMins: settings.bufferMins ?? 0,
        cancellationWindowHours: settings.cancellationWindowHours ?? 24,
        noShowGraceMins: settings.noShowGraceMins ?? 15,
        servicePeriods: settings.servicePeriods ?? [],
      });
    } catch {
      rulesValid = false;
    }
  }
  const capacity = Boolean(
    settings &&
    (activeTables.some(
      (table) =>
        table.capacity >= settings.minPartySize &&
        (table.minCapacity ?? 1) <= settings.maxPartySize,
    ) ||
      combinations.some(
        (combination) =>
          !combination.isDeleted &&
          combination.isActive &&
          combination.capacity >= settings.minPartySize &&
          combination.minPartySize <= settings.maxPartySize &&
          combination.minPartySize >= 1 &&
          combination.minPartySize <= combination.capacity &&
          combination.tableIds.length > 1 &&
          new Set(combination.tableIds).size === combination.tableIds.length &&
          combination.capacity <=
            combination.tableIds.reduce(
              (sum, id) =>
                sum +
                (activeTables.find((table) => table._id === id)?.capacity ?? 0),
              0,
            ) &&
          combination.tableIds.every((id) =>
            activeTables.some(
              (table) =>
                table._id === id &&
                table.floorPlanId === combination.floorPlanId,
            ),
          ),
      )),
  );
  const requirements = [
    {
      code: "access",
      label: "Restaurant or café business",
      complete: isHospitalityOrg(org),
    },
    {
      code: "profile",
      label: "Venue name, type, address and contact phone",
      complete: Boolean(
        org.name.trim().length >= 2 &&
        ["restaurant", "cafe"].includes(org.venueType ?? "") &&
        org.address?.trim() &&
        org.city?.trim() &&
        org.phone?.trim(),
      ),
    },
    {
      code: "settings",
      label: "Confirmed reservation rules and service periods",
      complete: rulesValid,
    },
    {
      code: "tables",
      label: "Active tables that accommodate an allowed party",
      complete: capacity,
    },
    {
      code: "legacy",
      label: "Existing reservations use the current allocation format",
      complete: !reservations.some(
        (reservation) =>
          !reservation.isDeleted &&
          ["pending", "confirmed", "seated"].includes(reservation.status) &&
          (reservation.schemaVersion !== 2 ||
            reservation.timeModel !== "utc" ||
            !reservation.tableIds?.length ||
            reservation.tableIds.some(
              (tableId) =>
                !activeAllocations.some(
                  (allocation) =>
                    allocation.reservationId === reservation._id &&
                    allocation.revision === reservation.revision &&
                    allocation.tableId === tableId,
                ),
            )),
      ),
    },
  ];
  return {
    ready: requirements.every((requirement) => requirement.complete),
    requirements,
  };
}
