import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { isHospitalityOrg } from "./hospitalityAccess";
import { validateStoredReservationSettings } from "./hospitalitySettingsValidation";
import {
  addServiceDays,
  localDate,
  localDateTimeInstants,
  localTimeLabel,
  validServiceDate,
} from "./reservationTime";
import { queueReservationEvent } from "./reservationEmailNotifications";

type ReadCtx = Pick<QueryCtx, "db">;
export type ReservationActor = {
  type: "staff" | "opus_user" | "system";
  id?: string;
};
export type ReservationOption = {
  tableIds: Id<"tables">[];
  combinationId?: Id<"table_combinations">;
  label: string;
  capacity: number;
  minPartySize: number;
};
export type ReservationInput = {
  requestId: string;
  serviceDate: string;
  startAt: number;
  partySize: number;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  specialRequests?: string;
  source: "web" | "manual" | "phone" | "walk_in";
  tableIds?: Id<"tables">[];
  durationMins?: number;
  opusUserId?: Id<"opus_users">;
  verifiedEmail?: string;
  manageTokenHash?: string;
  manageTokenExpiresAt?: number;
  manageTokenCiphertext?: string;
};
export type WalkInInput = {
  requestId: string;
  tableIds: Id<"tables">[];
  partySize: number;
  durationMins?: number;
  customerName?: string;
  customerPhone?: string;
  specialRequests?: string;
};
export type WalkInOptions = {
  asOf: number;
  timezone: string;
  serviceDate?: string;
  startAt?: number;
  endAt?: number;
  options: ReservationOption[];
  reason?: string;
};
export type ReservationChange = {
  expectedRevision: number;
  action:
    | "reschedule"
    | "move"
    | "arrive"
    | "seat"
    | "complete"
    | "cancel"
    | "no_show"
    | "ready"
    | "duration";
  serviceDate?: string;
  startAt?: number;
  tableIds?: Id<"tables">[];
  durationMins?: number;
  partySize?: number;
  reason?: string;
};

export async function reservationSettings(ctx: ReadCtx, org: Doc<"orgs">) {
  if (!isHospitalityOrg(org))
    throw new ConvexError("Restaurant reservations are unavailable.");
  const stored = await ctx.db
    .query("reservation_settings")
    .withIndex("by_org", (q) => q.eq("orgId", org._id))
    .unique();
  return validateStoredReservationSettings(stored);
}

async function resources(
  ctx: ReadCtx,
  org: Doc<"orgs">,
  reviewedLegacyIds = new Set<Id<"reservations">>(),
) {
  const settings = await reservationSettings(ctx, org);
  const [tables, areas, combinations, closures, allocations, unresolved] =
    await Promise.all([
      ctx.db
        .query("tables")
        .withIndex("by_org", (q) => q.eq("orgId", org._id))
        .collect(),
      ctx.db
        .query("floor_plans")
        .withIndex("by_org", (q) => q.eq("orgId", org._id))
        .collect(),
      ctx.db
        .query("table_combinations")
        .withIndex("by_org", (q) => q.eq("orgId", org._id))
        .collect(),
      ctx.db
        .query("reservation_closures")
        .withIndex("by_org", (q) => q.eq("orgId", org._id))
        .collect(),
      ctx.db
        .query("reservation_allocations")
        .withIndex("by_org_active", (q) =>
          q.eq("orgId", org._id).eq("isActive", true),
        )
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
      ),
    ]);
  const activeAllocations = allocations.filter((a) => !a.isDeleted);
  for (const reservation of unresolved.flat().filter((r) => !r.isDeleted)) {
    if (reservation.schemaVersion !== 2 || reservation.timeModel !== "utc") {
      if (reviewedLegacyIds.has(reservation._id)) continue;
      throw new ConvexError(
        "Legacy reservations require review before accepting new reservations.",
      );
    }
    const allocated = activeAllocations.filter(
      (a) =>
        a.reservationId === reservation._id &&
        a.revision === reservation.revision,
    );
    if (
      !reservation.tableIds?.length ||
      reservation.tableIds.some(
        (id) => !allocated.some((a) => a.tableId === id),
      )
    )
      throw new ConvexError("Reservation allocation needs staff review.");
  }
  const areaIds = new Set(
    areas.filter((a) => !a.isDeleted && a.isActive).map((a) => a._id),
  );
  const usableTables = tables.filter(
    (t) =>
      !t.isDeleted &&
      t.isActive !== false &&
      t.status !== "inactive" &&
      areaIds.has(t.floorPlanId) &&
      Number.isInteger(t.capacity) &&
      t.capacity > 0 &&
      (!["occupied", "cleaning"].includes(t.status) ||
        activeAllocations.some(
          (a) => a.tableId === t._id && a.requiresRelease,
        )),
  );
  return {
    settings,
    tables: usableTables,
    combinations,
    closures: closures.filter((c) => !c.isDeleted),
    allocations: activeAllocations,
  };
}
type Resources = Awaited<ReturnType<typeof resources>>;

function optionsFor(data: Resources, partySize: number): ReservationOption[] {
  const singles = data.tables
    .filter((t) => partySize <= t.capacity && partySize >= (t.minCapacity ?? 1))
    .map(
      (t) =>
        ({
          tableIds: [t._id],
          label: t.label,
          capacity: t.capacity,
          minPartySize: t.minCapacity ?? 1,
        }) as ReservationOption,
    );
  const combinations = data.combinations
    .filter((c) => {
      const members = c.tableIds.map((id) =>
        data.tables.find((t) => t._id === id),
      );
      return (
        !c.isDeleted &&
        c.isActive &&
        c.tableIds.length >= 2 &&
        new Set(c.tableIds).size === c.tableIds.length &&
        c.minPartySize <= partySize &&
        c.capacity >= partySize &&
        c.minPartySize >= 1 &&
        members.every((t) => t && t.floorPlanId === c.floorPlanId) &&
        c.capacity <= members.reduce((sum, t) => sum + (t?.capacity ?? 0), 0)
      );
    })
    .map((c) => ({
      tableIds: [...c.tableIds].sort(),
      combinationId: c._id,
      label: c.name,
      capacity: c.capacity,
      minPartySize: c.minPartySize,
    }));
  return [...singles, ...combinations].sort(
    (a, b) =>
      a.tableIds.length - b.tableIds.length ||
      a.capacity - b.capacity ||
      a.label.localeCompare(b.label) ||
      a.tableIds.join().localeCompare(b.tableIds.join()),
  );
}

function overlaps(a: number, b: number, c: number, d: number) {
  return a < d && c < b;
}
function allocationEnd(allocation: Doc<"reservation_allocations">) {
  // An overrun or unfinished cleaning never silently releases physical capacity.
  return allocation.requiresRelease && allocation.endAt <= Date.now()
    ? Infinity
    : allocation.endAt;
}
function optionFree(
  data: Resources,
  option: ReservationOption,
  startAt: number,
  endAt: number,
  exclude?: Id<"reservations">,
) {
  return (
    !data.closures.some(
      (c) =>
        overlaps(startAt, endAt, c.startAt, c.endAt) &&
        (!c.tableIds.length ||
          c.tableIds.some((id) => option.tableIds.includes(id))),
    ) &&
    !data.allocations.some(
      (a) =>
        (a.reservationId !== exclude || a.kind === "cleaning") &&
        option.tableIds.includes(a.tableId) &&
        overlaps(startAt, endAt, a.startAt, allocationEnd(a)),
    )
  );
}
const minutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};
function periodStartTimes(data: Resources, date: string, durationMins: number) {
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  const result = new Map<number, number>();
  for (const period of data.settings.servicePeriods.filter((p) =>
    p.daysOfWeek.includes(weekday),
  )) {
    const startMinute = minutes(period.startTime),
      endMinute = minutes(period.endTime) + (period.endDayOffset ?? 0) * 1440;
    let lastMinute = period.lastSeatingTime
      ? minutes(period.lastSeatingTime)
      : endMinute;
    if (
      period.lastSeatingTime &&
      lastMinute < startMinute &&
      period.endDayOffset === 1
    )
      lastMinute += 1440;
    const ends = localDateTimeInstants(
      addServiceDays(date, period.endDayOffset ?? 0),
      period.endTime,
      data.settings.timezone,
    );
    if (!ends.length) continue;
    const end = ends[ends.length - 1];
    for (
      let minute = startMinute;
      minute <= Math.min(lastMinute, endMinute);
      minute += data.settings.slotIntervalMins
    ) {
      const localMinute = minute % 1440;
      const time = `${String(Math.floor(localMinute / 60)).padStart(2, "0")}:${String(localMinute % 60).padStart(2, "0")}`;
      for (const start of localDateTimeInstants(
        addServiceDays(date, Math.floor(minute / 1440)),
        time,
        data.settings.timezone,
      )) {
        if (start + (durationMins + data.settings.bufferMins) * 60_000 <= end)
          result.set(start, start + durationMins * 60_000);
      }
    }
  }
  return [...result].sort(([a], [b]) => a - b);
}

/** Actual arrivals use continuous service time, never a rounded future slot. */
function walkInPeriodFits(
  data: Resources,
  date: string,
  startAt: number,
  durationMins: number,
  bufferMins = data.settings.bufferMins,
) {
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  const localDay = localDate(startAt, data.settings.timezone);
  if (localDay !== date && localDay !== addServiceDays(date, 1)) return false;
  const clock = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: data.settings.timezone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(startAt)
      .map((part) => [part.type, part.value]),
  );
  const localMinute =
    (localDay === date ? 0 : 1440) +
    Number(clock.hour) * 60 +
    Number(clock.minute) +
    Number(clock.second) / 60 +
    (startAt % 1000) / 60_000;
  return data.settings.servicePeriods.some((period) => {
    if (!period.daysOfWeek.includes(weekday)) return false;
    const startMinute = minutes(period.startTime);
    let lastMinute = period.lastSeatingTime
      ? minutes(period.lastSeatingTime)
      : minutes(period.endTime) + (period.endDayOffset ?? 0) * 1440;
    if (
      period.lastSeatingTime &&
      period.endDayOffset === 1 &&
      lastMinute < startMinute
    )
      lastMinute += 1440;
    // UTC ordering alone would admit 02:45 in the first repeated hour after
    // a 02:30 wall-clock last seating in the second occurrence.
    if (localMinute < startMinute || localMinute > lastMinute) return false;
    const opening = localDateTimeInstants(
      date,
      period.startTime,
      data.settings.timezone,
    );
    const closing = localDateTimeInstants(
      addServiceDays(date, period.endDayOffset ?? 0),
      period.endTime,
      data.settings.timezone,
    );
    // An ambiguous boundary spans its first opening through its last closing.
    // A nonexistent boundary cannot establish a safe service interval.
    if (!opening.length || !closing.length) return false;
    let last = closing[closing.length - 1];
    if (period.lastSeatingTime) {
      const nextDay =
        period.endDayOffset === 1 &&
        minutes(period.lastSeatingTime) < minutes(period.startTime);
      const instants = localDateTimeInstants(
        addServiceDays(date, nextDay ? 1 : 0),
        period.lastSeatingTime,
        data.settings.timezone,
      );
      if (!instants.length) return false;
      last = instants[instants.length - 1];
    }
    return (
      startAt >= opening[0] &&
      startAt <= last &&
      startAt + (durationMins + bufferMins) * 60_000 <=
        closing[closing.length - 1]
    );
  });
}

function savedVisitFits(
  data: Resources,
  reservation: Doc<"reservations">,
  duration: number,
  bufferMins: number,
) {
  return reservation.source === "walk_in"
    ? walkInPeriodFits(
        data,
        reservation.serviceDate!,
        reservation.startAt,
        duration,
        bufferMins,
      )
    : periodStartTimes(
        { ...data, settings: { ...data.settings, bufferMins } },
        reservation.serviceDate!,
        duration,
      ).some(([start]) => start === reservation.startAt);
}

async function currentWalkIn(
  ctx: ReadCtx,
  org: Doc<"orgs">,
  partySize: number,
  durationMins?: number,
  tableId?: Id<"tables">,
) {
  const asOf = Date.now();
  const data = await resources(ctx, org);
  const { settings } = data;
  if (!settings.walkInsAccepted)
    throw new ConvexError("Walk-ins are not enabled.");
  if (
    !Number.isInteger(partySize) ||
    partySize < settings.minPartySize ||
    partySize > settings.maxPartySize
  )
    throw new ConvexError("Choose a valid party size.");
  const duration = durationMins ?? settings.defaultDurationMins;
  if (
    !Number.isInteger(duration) ||
    duration < settings.minDurationMins ||
    duration > settings.maxDurationMins
  )
    throw new ConvexError("Choose a valid dining duration.");
  const today = localDate(asOf, settings.timezone);
  const serviceDate = [today, addServiceDays(today, -1)].find((date) =>
    walkInPeriodFits(data, date, asOf, duration),
  );
  if (!serviceDate)
    throw new ConvexError(
      "There is not enough service time remaining for this visit and reset buffer.",
    );
  const endAt = asOf + duration * 60_000;
  const options = optionsFor(data, partySize).filter(
    (option) =>
      (!tableId || option.tableIds.includes(tableId)) &&
      optionFree(data, option, asOf, endAt + settings.bufferMins * 60_000),
  );
  const result: WalkInOptions = {
    asOf,
    timezone: settings.timezone,
    serviceDate,
    startAt: asOf,
    endAt,
    options,
    ...(options.length
      ? {}
      : { reason: "No suitable tables are available for this walk-in." }),
  };
  return { data, result };
}

export async function walkInAvailability(
  ctx: ReadCtx,
  org: Doc<"orgs">,
  tableId: Id<"tables">,
  partySize: number,
  durationMins?: number,
): Promise<WalkInOptions> {
  const table = await ctx.db.get(tableId);
  if (!table || table.orgId !== org._id || table.isDeleted)
    throw new ConvexError("Table unavailable.");
  let timezone = "Europe/Skopje";
  try {
    timezone = (await reservationSettings(ctx, org)).timezone;
    return (await currentWalkIn(ctx, org, partySize, durationMins, tableId))
      .result;
  } catch (error) {
    if (!(error instanceof ConvexError)) throw error;
    return {
      asOf: Date.now(),
      timezone,
      options: [],
      reason: String(error.data),
    };
  }
}

export async function availability(
  ctx: ReadCtx,
  org: Doc<"orgs">,
  date: string,
  partySize: number,
  {
    staff = false,
    durationMins,
    excludeReservationId,
    manageExisting = false,
  }: {
    staff?: boolean;
    durationMins?: number;
    excludeReservationId?: Id<"reservations">;
    manageExisting?: boolean;
  } = {},
) {
  if (!validServiceDate(date))
    throw new ConvexError("Choose a valid service date.");
  const data = await resources(ctx, org);
  const { settings } = data;
  if (!staff && !manageExisting && org.websiteStatus !== "published") return [];
  if (
    !Number.isInteger(partySize) ||
    partySize < settings.minPartySize ||
    partySize > settings.maxPartySize
  )
    throw new ConvexError("Choose a valid party size.");
  const duration = durationMins ?? settings.defaultDurationMins;
  if (
    !Number.isInteger(duration) ||
    duration < settings.minDurationMins ||
    duration > settings.maxDurationMins
  )
    throw new ConvexError("Choose a valid dining duration.");
  if (excludeReservationId) {
    const excluded = await ctx.db.get(excludeReservationId);
    if (!excluded || excluded.orgId !== org._id || excluded.isDeleted)
      throw new ConvexError("Reservation not found.");
  }
  const today = localDate(Date.now(), settings.timezone);
  if (
    date < addServiceDays(today, -1) ||
    (!staff && date > addServiceDays(today, settings.bookingWindowDays))
  )
    return [];
  const options = optionsFor(data, partySize);
  const now = Date.now(),
    earliest = now + (staff ? 0 : settings.minAdvanceBookingHours * 3_600_000);
  return periodStartTimes(data, date, duration)
    .filter(([start]) => start >= earliest)
    .map(([startAt, endAt]) => ({
      startAt,
      endAt,
      label: `${localDate(startAt, settings.timezone) === date ? "" : `${localDate(startAt, settings.timezone)} `}${localTimeLabel(startAt, settings.timezone)}`,
      serviceDate: date,
      timezone: settings.timezone,
      options: options.filter((option) =>
        optionFree(
          data,
          option,
          startAt,
          endAt + settings.bufferMins * 60_000,
          excludeReservationId,
        ),
      ),
    }))
    .filter((slot) => slot.options.length > 0);
}

async function atomicAllocationCheck(
  ctx: MutationCtx,
  orgId: Id<"orgs">,
  tableIds: Id<"tables">[],
  startAt: number,
  endAt: number,
  exclude?: Id<"reservations">,
) {
  for (const tableId of tableIds) {
    const rows = await ctx.db
      .query("reservation_allocations")
      .withIndex("by_org_table_active_start", (q) =>
        q
          .eq("orgId", orgId)
          .eq("tableId", tableId)
          .eq("isActive", true)
          .lt("startAt", endAt),
      )
      .collect();
    if (
      rows.some(
        (a) =>
          !a.isDeleted &&
          a.isActive &&
          (a.reservationId !== exclude || a.kind === "cleaning") &&
          overlaps(startAt, endAt, a.startAt, allocationEnd(a)),
      )
    )
      throw new ConvexError("These tables are no longer available.");
  }
}

export async function reservationMoveOptions(
  ctx: ReadCtx,
  org: Doc<"orgs">,
  reservation: Doc<"reservations">,
  durationMins = reservation.durationMins,
) {
  if (reservation.orgId !== org._id || reservation.isDeleted)
    throw new ConvexError("Reservation not found.");
  const now = Date.now();
  if (
    !["confirmed", "seated"].includes(reservation.status) ||
    (reservation.status === "confirmed" && reservation.endAt <= now) ||
    reservation.startAt + durationMins * 60_000 <= now
  )
    return [];
  const data = await resources(ctx, org);
  const futureConfirmed =
    reservation.status === "confirmed" && reservation.startAt > now;
  if (
    !Number.isInteger(durationMins) ||
    durationMins < data.settings.minDurationMins ||
    durationMins > data.settings.maxDurationMins ||
    (futureConfirmed &&
      (reservation.partySize < data.settings.minPartySize ||
        reservation.partySize > data.settings.maxPartySize))
  )
    return [];
  const bufferMins = futureConfirmed
    ? data.settings.bufferMins
    : (reservation.bufferMins ?? 0);
  if (!savedVisitFits(data, reservation, durationMins, bufferMins)) return [];
  return optionsFor(data, reservation.partySize).filter((option) =>
    optionFree(
      data,
      option,
      reservation.status === "seated" ? now : reservation.startAt,
      reservation.startAt + (durationMins + bufferMins) * 60_000,
      reservation._id,
    ),
  );
}

async function chooseAllocation(
  ctx: MutationCtx,
  org: Doc<"orgs">,
  input: Pick<
    ReservationInput,
    "serviceDate" | "startAt" | "partySize" | "tableIds" | "durationMins"
  >,
  staff: boolean,
  exclude?: Id<"reservations">,
) {
  if (!Number.isInteger(input.startAt) || input.startAt % 60_000 !== 0)
    throw new ConvexError("Choose a valid reservation time.");
  if (
    input.tableIds &&
    (input.tableIds.length === 0 ||
      new Set(input.tableIds).size !== input.tableIds.length)
  )
    throw new ConvexError("Choose distinct tables.");
  const slots = await availability(
    ctx,
    org,
    input.serviceDate,
    input.partySize,
    {
      staff,
      durationMins: input.durationMins,
      excludeReservationId: exclude,
      manageExisting: Boolean(exclude),
    },
  );
  const slot = slots.find((s) => s.startAt === input.startAt);
  const selected = input.tableIds ? [...input.tableIds].sort().join() : null;
  const option = slot?.options.find(
    (o) => selected === null || [...o.tableIds].sort().join() === selected,
  );
  if (!slot || !option)
    throw new ConvexError(
      "This reservation time or table combination is no longer available.",
    );
  const settings = await reservationSettings(ctx, org);
  await atomicAllocationCheck(
    ctx,
    org._id,
    option.tableIds,
    slot.startAt,
    slot.endAt + settings.bufferMins * 60_000,
    exclude,
  );
  const tables = await Promise.all(option.tableIds.map((id) => ctx.db.get(id)));
  if (tables.some((t) => !t || t.orgId !== org._id || t.isDeleted))
    throw new ConvexError("Table unavailable.");
  return { slot, option, settings, tables: tables as Doc<"tables">[] };
}

async function allocationsFor(ctx: ReadCtx, reservation: Doc<"reservations">) {
  return ctx.db
    .query("reservation_allocations")
    .withIndex("by_org_reservation_active", (q) =>
      q
        .eq("orgId", reservation.orgId)
        .eq("reservationId", reservation._id)
        .eq("isActive", true),
    )
    .collect();
}
async function replaceAllocations(
  ctx: MutationCtx,
  reservation: Doc<"reservations">,
  startAt: number,
  endAt: number,
  requiresRelease: boolean,
  active = true,
  kind: "occupancy" | "cleaning" = "occupancy",
) {
  for (const row of await allocationsFor(ctx, reservation))
    if (row.isActive && row.kind !== "cleaning")
      await ctx.db.patch(row._id, { isActive: false, updatedAt: Date.now() });
  if (!active) return;
  for (const tableId of reservation.tableIds ?? [])
    await ctx.db.insert("reservation_allocations", {
      orgId: reservation.orgId,
      reservationId: reservation._id,
      revision: reservation.revision!,
      tableId,
      startAt,
      endAt,
      requiresRelease,
      kind,
      isActive: true,
      isDeleted: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
}
async function audit(
  ctx: MutationCtx,
  orgId: Id<"orgs">,
  id: Id<"reservations">,
  actor: ReservationActor,
  action: string,
  before?: unknown,
  after?: unknown,
) {
  await ctx.db.insert("audit_log", {
    orgId,
    actorType: actor.type,
    actorId: actor.id,
    action: `reservation.${action}`,
    resourceType: "reservations",
    resourceId: id,
    before,
    after,
    createdAt: Date.now(),
  });
}
function fingerprint(input: ReservationInput) {
  return JSON.stringify({
    date: input.serviceDate,
    start: input.startAt,
    party: input.partySize,
    name: input.customerName.trim(),
    email: input.customerEmail?.trim().toLowerCase(),
    phone: input.customerPhone?.replace(/[\s()-]/g, ""),
    source: input.source,
    tables: input.tableIds ? [...input.tableIds].sort() : null,
    duration: input.durationMins,
    opusUserId: input.opusUserId,
    verifiedEmail: input.verifiedEmail,
    note: input.specialRequests?.trim(),
  });
}

export async function createReservation(
  ctx: MutationCtx,
  org: Doc<"orgs">,
  input: ReservationInput,
  actor: ReservationActor,
): Promise<Doc<"reservations">> {
  await reservationSettings(ctx, org);
  if (!/^[A-Za-z0-9_-]{8,120}$/.test(input.requestId))
    throw new ConvexError("Invalid reservation request.");
  const signature = fingerprint(input);
  const existing = await ctx.db
    .query("reservations")
    .withIndex("by_org_request", (q) =>
      q.eq("orgId", org._id).eq("requestId", input.requestId),
    )
    .unique();
  if (existing) {
    if (existing.requestFingerprint !== signature || existing.isDeleted)
      throw new ConvexError(
        "This request has already been used for another reservation.",
      );
    return existing;
  }
  if (actor.type !== "staff" && org.websiteStatus !== "published")
    throw new ConvexError("New restaurant reservations are paused.");
  if (
    actor.type !== "staff" &&
    (input.source !== "web" || !input.verifiedEmail)
  )
    throw new ConvexError("Verify your email before reserving.");
  if (
    input.source === "walk_in" &&
    !(await reservationSettings(ctx, org)).walkInsAccepted
  )
    throw new ConvexError("Walk-ins are not enabled.");
  const { slot, option, settings, tables } = await chooseAllocation(
    ctx,
    org,
    input,
    actor.type === "staff",
  );
  return insertReservation(ctx, org, input, actor, signature, {
    slot,
    option,
    settings,
    tables,
  });
}

/** A retry resolves the stored request before consulting today's clock or settings. */
export async function seatWalkInNow(
  ctx: MutationCtx,
  org: Doc<"orgs">,
  input: WalkInInput,
  actor: ReservationActor,
): Promise<Doc<"reservations">> {
  if (actor.type !== "staff" || !isHospitalityOrg(org))
    throw new ConvexError("Unauthorised");
  if (!/^[A-Za-z0-9_-]{8,120}$/.test(input.requestId))
    throw new ConvexError("Invalid reservation request.");
  const name = input.customerName?.trim() || "Walk-in guest";
  const signature = JSON.stringify({
    kind: "walk_in_now",
    party: input.partySize,
    tables: [...input.tableIds].sort(),
    duration: input.durationMins,
    name,
    phone: input.customerPhone?.replace(/[\s()-]/g, ""),
    note: input.specialRequests?.trim(),
  });
  const existing = await ctx.db
    .query("reservations")
    .withIndex("by_org_request", (q) =>
      q.eq("orgId", org._id).eq("requestId", input.requestId),
    )
    .unique();
  if (existing) {
    if (existing.requestFingerprint !== signature || existing.isDeleted)
      throw new ConvexError(
        "This request has already been used for another reservation.",
      );
    return existing;
  }
  if (
    !input.tableIds.length ||
    input.tableIds.length > 100 ||
    new Set(input.tableIds).size !== input.tableIds.length
  )
    throw new ConvexError("Choose distinct tables.");
  const { data, result } = await currentWalkIn(
    ctx,
    org,
    input.partySize,
    input.durationMins,
  );
  const selected = [...input.tableIds].sort().join();
  const option = result.options.find(
    (o) => [...o.tableIds].sort().join() === selected,
  );
  if (
    !option ||
    !result.serviceDate ||
    result.startAt === undefined ||
    result.endAt === undefined
  )
    throw new ConvexError(
      "These tables are no longer available for this walk-in.",
    );
  await atomicAllocationCheck(
    ctx,
    org._id,
    option.tableIds,
    result.startAt,
    result.endAt + data.settings.bufferMins * 60_000,
  );
  const tables = option.tableIds.map(
    (id) => data.tables.find((table) => table._id === id)!,
  );
  return insertReservation(
    ctx,
    org,
    {
      ...input,
      customerName: name,
      source: "walk_in",
      serviceDate: result.serviceDate,
      startAt: result.startAt,
    },
    actor,
    signature,
    {
      slot: { startAt: result.startAt, endAt: result.endAt },
      option,
      settings: data.settings,
      tables,
    },
    result.asOf,
  );
}

async function insertReservation(
  ctx: MutationCtx,
  org: Doc<"orgs">,
  input: ReservationInput,
  actor: ReservationActor,
  signature: string,
  {
    slot,
    option,
    settings,
    tables,
  }: {
    slot: { startAt: number; endAt: number };
    option: ReservationOption;
    settings: Awaited<ReturnType<typeof reservationSettings>>;
    tables: Doc<"tables">[];
  },
  seatedAt?: number,
): Promise<Doc<"reservations">> {
  const name = input.customerName.trim(),
    email = input.customerEmail?.trim().toLowerCase(),
    phone = input.customerPhone?.replace(/[\s()-]/g, "");
  if (
    name.length < 2 ||
    name.length > 120 ||
    (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) ||
    (phone && !/^\+?[0-9]{7,15}$/.test(phone)) ||
    (input.specialRequests?.length ?? 0) > 2000
  )
    throw new ConvexError("Enter valid guest details.");
  if (input.verifiedEmail && input.verifiedEmail.toLowerCase() !== email)
    throw new ConvexError("Verified email does not match this reservation.");
  const customerByEmail = email
    ? await ctx.db
        .query("customers")
        .withIndex("by_org_email", (q) =>
          q.eq("orgId", org._id).eq("email", email),
        )
        .collect()
    : [];
  const customerByPhone = phone
    ? await ctx.db
        .query("customers")
        .withIndex("by_org_phone", (q) =>
          q.eq("orgId", org._id).eq("phone", phone),
        )
        .collect()
    : [];
  const byEmail = customerByEmail.find((c) => !c.isDeleted),
    byPhone = customerByPhone.find((c) => !c.isDeleted);
  if (
    (byEmail && byPhone && byEmail._id !== byPhone._id) ||
    (!byEmail && byPhone?.email && email && byPhone.email !== email)
  )
    throw new ConvexError(
      "These contact details belong to different customer records.",
    );
  const customer = byEmail ?? byPhone;
  if (
    customer?.opusUserId &&
    input.opusUserId &&
    customer.opusUserId !== input.opusUserId
  )
    throw new ConvexError("Customer account mismatch.");
  let customerId = customer?._id;
  if (!customerId)
    customerId = await ctx.db.insert("customers", {
      orgId: org._id,
      name,
      email,
      phone,
      opusUserId: input.opusUserId,
      totalVisits: 0,
      totalSpendMinorUnits: 0,
      noShowCount: 0,
      noShowRiskScore: 0,
      whatsappOptIn: false,
      marketingOptIn: false,
      isDeleted: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  else if (input.opusUserId && !customer?.opusUserId)
    await ctx.db.patch(customerId, {
      opusUserId: input.opusUserId,
      updatedAt: Date.now(),
    });
  const id = await ctx.db.insert("reservations", {
    orgId: org._id,
    floorPlanId: tables[0].floorPlanId,
    tableId: option.tableIds[0],
    tableIds: option.tableIds,
    tableLabels: tables.map((t) => t.label),
    combinationId: option.combinationId,
    capacitySnapshot: option.capacity,
    customerId,
    guestName: name,
    guestContact: { email, phone },
    opusUserId: input.opusUserId,
    schemaVersion: 2,
    timeModel: "utc",
    timezone: settings.timezone,
    serviceDate: input.serviceDate,
    revision: 1,
    startAt: slot.startAt,
    endAt: slot.endAt,
    durationMins: (slot.endAt - slot.startAt) / 60_000,
    bufferMins: settings.bufferMins,
    partySize: input.partySize,
    specialRequests: input.specialRequests?.trim(),
    status: seatedAt === undefined ? "confirmed" : "seated",
    arrivedAt: seatedAt,
    seatedAt,
    source: input.source,
    autoAssigned: !input.tableIds,
    requestId: input.requestId,
    requestFingerprint: signature,
    verifiedEmail: input.verifiedEmail,
    manageTokenHash: input.manageTokenHash,
    manageTokenExpiresAt: input.manageTokenExpiresAt,
    manageTokenCiphertext: input.manageTokenCiphertext,
    isDeleted: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  const reservation = (await ctx.db.get(id))!;
  await replaceAllocations(
    ctx,
    reservation,
    slot.startAt,
    slot.endAt + settings.bufferMins * 60_000,
    seatedAt !== undefined,
  );
  if (seatedAt !== undefined)
    for (const table of tables)
      await ctx.db.patch(table._id, {
        status: "occupied",
        updatedAt: seatedAt,
      });
  await audit(ctx, org._id, id, actor, "created", undefined, {
    startAt: slot.startAt,
    partySize: input.partySize,
    tableIds: option.tableIds,
    revision: 1,
    ...(seatedAt === undefined
      ? {}
      : { status: "seated", arrivedAt: seatedAt, seatedAt }),
  });
  await queueReservationEvent(ctx, org, reservation, "confirmation");
  return reservation;
}

export async function changeReservation(
  ctx: MutationCtx,
  org: Doc<"orgs">,
  id: Id<"reservations">,
  change: ReservationChange,
  actor: ReservationActor,
): Promise<Doc<"reservations">> {
  const settings = await reservationSettings(ctx, org);
  const old = await ctx.db.get(id);
  if (!old || old.orgId !== org._id || old.isDeleted)
    throw new ConvexError("Reservation not found.");
  if (
    old.schemaVersion !== 2 ||
    old.timeModel !== "utc" ||
    !old.tableIds?.length
  )
    throw new ConvexError("Legacy reservations require review before changes.");
  if (change.expectedRevision !== old.revision)
    throw new ConvexError("This reservation changed. Refresh and try again.");
  if (
    actor.type !== "staff" &&
    !["cancel", "reschedule"].includes(change.action)
  )
    throw new ConvexError("Unauthorised");
  if (
    actor.type !== "staff" &&
    (old.status !== "confirmed" ||
      old.arrivedAt !== undefined ||
      old.startAt - Date.now() < settings.cancellationWindowHours * 3_600_000)
  )
    throw new ConvexError("Online changes are closed. Contact the venue.");
  const now = Date.now(),
    revision = (old.revision ?? 1) + 1;
  let patch: Partial<Doc<"reservations">> = { revision, updatedAt: now };
  const occupancy = (await allocationsFor(ctx, old)).filter(
    (a) => a.kind !== "cleaning",
  );
  let blockStart = occupancy.length
      ? Math.min(...occupancy.map((a) => a.startAt))
      : Math.min(old.startAt, old.seatedAt ?? old.startAt),
    blockEnd = old.endAt + (old.bufferMins ?? 0) * 60_000,
    releaseRequired = false,
    active = true;
  let event: "changed" | "cancelled" | undefined;
  let cleaningTableIds: Id<"tables">[] = [];
  let readyTableIds: Id<"tables">[] = [];
  if (["reschedule", "move", "duration"].includes(change.action)) {
    if (
      old.status !== "confirmed" &&
      !(old.status === "seated" && ["duration", "move"].includes(change.action))
    )
      throw new ConvexError(
        "This reservation cannot be changed in its current state.",
      );
    const currentConfirmedEdit =
      old.status === "confirmed" &&
      old.startAt <= now &&
      ["move", "duration"].includes(change.action);
    if (currentConfirmedEdit && old.endAt <= now)
      throw new ConvexError(
        "Only a current confirmed reservation can be changed.",
      );
    if (old.status === "seated" || currentConfirmedEdit) {
      const duration = change.durationMins ?? old.durationMins;
      if (
        !Number.isInteger(duration) ||
        duration < settings.minDurationMins ||
        duration > settings.maxDurationMins
      )
        throw new ConvexError("Choose a valid dining duration.");
      const endAt = old.startAt + duration * 60_000;
      if (endAt <= now)
        throw new ConvexError("The visit must end in the future.");
      const data = await resources(ctx, org);
      if (!savedVisitFits(data, old, duration, old.bufferMins ?? 0))
        throw new ConvexError("This visit would extend beyond service hours.");
      const tableIds =
        change.action === "move" ? change.tableIds : old.tableIds;
      if (!tableIds?.length || new Set(tableIds).size !== tableIds.length)
        throw new ConvexError("Choose distinct tables.");
      const option = optionsFor(data, old.partySize).find(
        (o) => [...o.tableIds].sort().join() === [...tableIds].sort().join(),
      );
      blockEnd = endAt + (old.bufferMins ?? 0) * 60_000;
      // Confirmed visits retain their booked interval. Only an already seated
      // party transfers occupancy from now and leaves a cleaning hold behind.
      const allocationStart =
        old.status === "seated" && change.action === "move" ? now : blockStart;
      if (!option || !optionFree(data, option, allocationStart, blockEnd, id))
        throw new ConvexError(
          "These tables are closed or no longer available.",
        );
      await atomicAllocationCheck(
        ctx,
        org._id,
        option.tableIds,
        allocationStart,
        blockEnd,
        id,
      );
      const tables = option.tableIds.map(
        (id) => data.tables.find((t) => t._id === id)!,
      );
      patch = {
        ...patch,
        durationMins: duration,
        endAt,
        tableIds: option.tableIds,
        tableId: option.tableIds[0],
        tableLabels: tables.map((t) => t.label),
        floorPlanId: tables[0].floorPlanId,
        combinationId: option.combinationId,
        capacitySnapshot: option.capacity,
      };
      if (old.status === "seated" && change.action === "move") {
        cleaningTableIds = old.tableIds.filter(
          (id) => !option.tableIds.includes(id),
        );
        blockStart = now;
      }
      releaseRequired = old.status === "seated";
    } else {
      const input = {
        serviceDate: change.serviceDate ?? old.serviceDate!,
        startAt: change.startAt ?? old.startAt,
        partySize: change.partySize ?? old.partySize,
        tableIds:
          change.tableIds ??
          (change.action === "reschedule" ? undefined : old.tableIds),
        durationMins: change.durationMins ?? old.durationMins,
      };
      const { slot, option, tables } = await chooseAllocation(
        ctx,
        org,
        input,
        actor.type === "staff",
        old._id,
      );
      patch = {
        ...patch,
        serviceDate: input.serviceDate,
        startAt: slot.startAt,
        endAt: slot.endAt,
        durationMins: (slot.endAt - slot.startAt) / 60_000,
        partySize: input.partySize,
        tableIds: option.tableIds,
        tableId: option.tableIds[0],
        tableLabels: tables.map((t) => t.label),
        floorPlanId: tables[0].floorPlanId,
        combinationId: option.combinationId,
        capacitySnapshot: option.capacity,
        bufferMins: settings.bufferMins,
      };
      if (
        old.manageTokenHash &&
        old.manageTokenCiphertext &&
        (old.manageTokenExpiresAt ?? 0) > now
      )
        patch.manageTokenExpiresAt = Math.max(
          old.manageTokenExpiresAt!,
          slot.startAt + 30 * 86_400_000,
        );
      patch.timezone = settings.timezone;
      if (change.action === "reschedule" && slot.startAt !== old.startAt)
        patch.arrivedAt = undefined;
      blockStart = slot.startAt;
      blockEnd = slot.endAt + settings.bufferMins * 60_000;
    }
    event = "changed";
  } else if (change.action === "arrive") {
    if (old.status !== "confirmed" || old.arrivedAt)
      throw new ConvexError("Only a confirmed reservation can arrive.");
    patch.arrivedAt = now;
  } else if (change.action === "seat") {
    if (
      old.status !== "confirmed" ||
      old.endAt <= now ||
      old.startAt > now + 30 * 60_000
    )
      throw new ConvexError(
        "Only a current confirmed reservation can be seated.",
      );
    blockStart = Math.min(now, old.startAt);
    releaseRequired = true;
    await atomicAllocationCheck(
      ctx,
      org._id,
      old.tableIds,
      blockStart,
      blockEnd,
      old._id,
    );
    const closures = await ctx.db
      .query("reservation_closures")
      .withIndex("by_org", (q) => q.eq("orgId", org._id))
      .collect();
    if (
      closures.some(
        (c) =>
          !c.isDeleted &&
          overlaps(blockStart, blockEnd, c.startAt, c.endAt) &&
          (!c.tableIds.length ||
            c.tableIds.some((t) => old.tableIds!.includes(t))),
      )
    )
      throw new ConvexError("These tables are closed.");
    patch = {
      ...patch,
      status: "seated",
      arrivedAt: old.arrivedAt ?? now,
      seatedAt: now,
    };
  } else if (change.action === "complete") {
    if (old.status !== "seated")
      throw new ConvexError("Seat the party before completing its visit.");
    patch = { ...patch, status: "completed", completedAt: now };
    blockEnd = now + (old.bufferMins ?? 0) * 60_000;
    releaseRequired = true;
  } else if (change.action === "ready") {
    if (!["completed", "seated"].includes(old.status))
      throw new ConvexError("Only tables awaiting cleaning can be released.");
    const cleaning = (await allocationsFor(ctx, old)).filter(
      (a) => a.kind === "cleaning",
    );
    readyTableIds = change.tableIds ?? cleaning.map((a) => a.tableId);
    if (
      !readyTableIds.length ||
      new Set(readyTableIds).size !== readyTableIds.length ||
      readyTableIds.some((id) => !cleaning.some((a) => a.tableId === id))
    )
      throw new ConvexError("Choose tables awaiting cleaning.");
    const selected = cleaning.filter((a) => readyTableIds.includes(a.tableId));
    if (selected.some((a) => now < a.endAt))
      throw new ConvexError("The cleaning buffer has not elapsed.");
    for (const row of selected)
      await ctx.db.patch(row._id, { isActive: false, updatedAt: now });
    if (old.status === "completed") {
      active = false;
      if (selected.length === cleaning.length) patch.cleaningCompletedAt = now;
    } else releaseRequired = true;
  } else if (change.action === "cancel") {
    if (!["pending", "confirmed"].includes(old.status))
      throw new ConvexError(
        "This reservation cannot be cancelled in its current state.",
      );
    patch = {
      ...patch,
      status: "cancelled",
      cancelledAt: now,
      cancelledBy: actor.id,
      cancellationReason: change.reason?.trim().slice(0, 1000),
    };
    active = false;
    event = "cancelled";
  } else if (change.action === "no_show") {
    if (
      old.status !== "confirmed" ||
      old.arrivedAt ||
      now < old.startAt + settings.noShowGraceMins * 60_000
    )
      throw new ConvexError(
        "No-show is available after the arrival grace period for an unarrived party.",
      );
    patch.status = "no_show";
    active = false;
  }
  await ctx.db.patch(id, patch);
  const updated = (await ctx.db.get(id))!;
  await replaceAllocations(
    ctx,
    updated,
    blockStart,
    blockEnd,
    releaseRequired,
    active,
    change.action === "complete" ? "cleaning" : "occupancy",
  );
  for (const tableId of cleaningTableIds)
    await ctx.db.insert("reservation_allocations", {
      orgId: org._id,
      reservationId: id,
      revision,
      tableId,
      startAt: now,
      endAt: now + (old.bufferMins ?? 0) * 60_000,
      kind: "cleaning",
      requiresRelease: true,
      isActive: true,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });
  if (["seat", "complete", "ready", "move"].includes(change.action))
    for (const tableId of new Set([
      ...old.tableIds,
      ...updated.tableIds!,
      ...readyTableIds,
    ])) {
      const table = await ctx.db.get(tableId);
      if (table?.orgId !== org._id || table.isDeleted) continue;
      const tableStatus = readyTableIds.includes(tableId)
        ? "available"
        : cleaningTableIds.includes(tableId) || change.action === "complete"
          ? "cleaning"
          : updated.status === "seated"
            ? "occupied"
            : table.status;
      await ctx.db.patch(tableId, { status: tableStatus, updatedAt: now });
    }
  await audit(
    ctx,
    org._id,
    id,
    actor,
    change.action,
    {
      revision: old.revision,
      status: old.status,
      startAt: old.startAt,
      tableIds: old.tableIds,
    },
    {
      revision,
      status: updated.status,
      startAt: updated.startAt,
      tableIds: updated.tableIds,
    },
  );
  if (event) await queueReservationEvent(ctx, org, updated, event);
  return updated;
}

export type ReservationAmendment = {
  expectedRevision: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  specialRequests?: string;
  partySize?: number;
  tableIds?: Id<"tables">[];
};

async function amendableGuest(
  ctx: ReadCtx,
  org: Doc<"orgs">,
  reservation: Doc<"reservations">,
) {
  if (reservation.orgId !== org._id || reservation.isDeleted)
    throw new ConvexError("Reservation not found.");
  if (
    reservation.schemaVersion !== 2 ||
    reservation.timeModel !== "utc" ||
    !reservation.tableIds?.length
  )
    throw new ConvexError("Legacy reservations require review before changes.");
  if (!["confirmed", "seated"].includes(reservation.status))
    throw new ConvexError(
      "Only confirmed or seated reservations can be edited.",
    );
  const customer = await ctx.db.get(reservation.customerId);
  if (
    !customer ||
    customer.orgId !== org._id ||
    customer.isDeleted ||
    customer.gdprErasureRequestedAt !== undefined
  )
    throw new ConvexError("Anonymised guest details cannot be edited.");
  const assigned = reservation.tableIds;
  const occupancy = (await allocationsFor(ctx, reservation)).filter(
    (allocation) => !allocation.isDeleted && allocation.kind !== "cleaning",
  );
  if (
    new Set(assigned).size !== assigned.length ||
    occupancy.length !== assigned.length ||
    occupancy.some(
      (allocation) =>
        allocation.revision !== reservation.revision ||
        allocation.requiresRelease !== (reservation.status === "seated") ||
        !assigned.includes(allocation.tableId) ||
        !Number.isFinite(allocation.startAt) ||
        allocation.startAt >= allocation.endAt ||
        allocation.endAt !==
          reservation.endAt + (reservation.bufferMins ?? 0) * 60_000,
    ) ||
    assigned.some(
      (tableId) =>
        occupancy.filter((allocation) => allocation.tableId === tableId)
          .length !== 1,
    )
  )
    throw new ConvexError("Reservation allocation needs staff review.");
  for (const tableId of assigned) {
    const table = await ctx.db.get(tableId);
    if (!table || table.orgId !== org._id || table.isDeleted)
      throw new ConvexError("Reservation allocation needs staff review.");
  }
  return customer;
}

const sameTables = (a: Id<"tables">[], b: Id<"tables">[]) =>
  [...a].sort().join() === [...b].sort().join();

async function amendmentOptions(
  ctx: ReadCtx,
  org: Doc<"orgs">,
  reservation: Doc<"reservations">,
  partySize: number,
) {
  const data = await resources(ctx, org);
  const now = Date.now();
  if (
    !Number.isInteger(partySize) ||
    partySize < data.settings.minPartySize ||
    partySize > data.settings.maxPartySize
  )
    throw new ConvexError("Choose a valid party size.");
  if (reservation.status === "confirmed" && reservation.endAt <= now)
    throw new ConvexError(
      "Only a current or future confirmed reservation can change party size or tables.",
    );
  const overdue = reservation.status === "seated" && reservation.endAt <= now;
  // A held, overdue visit may correct its cover count without releasing its
  // tables. Moving that visit first needs a new end time through duration editing.
  const startAt = reservation.status === "seated" ? now : reservation.startAt;
  const endAt = overdue
    ? now + 1
    : reservation.endAt + (reservation.bufferMins ?? 0) * 60_000;
  const options = optionsFor(data, partySize).filter(
    (option) =>
      (!overdue || sameTables(option.tableIds, reservation.tableIds!)) &&
      optionFree(data, option, startAt, endAt, reservation._id),
  );
  return { data, options, startAt, endAt, overdue };
}

export async function reservationAmendOptions(
  ctx: ReadCtx,
  org: Doc<"orgs">,
  reservation: Doc<"reservations">,
  partySize: number,
): Promise<{
  asOf: number;
  revision: number;
  options: ReservationOption[];
  minPartySize?: number;
  maxPartySize?: number;
  reason?: string;
}> {
  const base = { asOf: Date.now(), revision: reservation.revision ?? 0 };
  let limits: { minPartySize?: number; maxPartySize?: number } = {};
  try {
    await amendableGuest(ctx, org, reservation);
    const settings = await reservationSettings(ctx, org);
    limits = {
      minPartySize: settings.minPartySize,
      maxPartySize: settings.maxPartySize,
    };
    const { options, overdue } = await amendmentOptions(
      ctx,
      org,
      reservation,
      partySize,
    );
    return {
      ...base,
      ...limits,
      options,
      ...(options.length
        ? {}
        : {
            reason: overdue
              ? "The current tables cannot fit this party. Extend the visit before moving tables."
              : "No suitable tables are available for this party at the reservation time.",
          }),
    };
  } catch (error) {
    if (!(error instanceof ConvexError)) throw error;
    return { ...base, ...limits, options: [], reason: String(error.data) };
  }
}

/** Staff corrections never change customer identity, guest proof, or verified delivery. */
export async function amendReservation(
  ctx: MutationCtx,
  org: Doc<"orgs">,
  id: Id<"reservations">,
  changes: ReservationAmendment,
  actor: ReservationActor,
): Promise<Doc<"reservations">> {
  if (actor.type !== "staff") throw new ConvexError("Unauthorised");
  const old = await ctx.db.get(id);
  if (!old || old.orgId !== org._id || old.isDeleted)
    throw new ConvexError("Reservation not found.");
  const customer = await amendableGuest(ctx, org, old);
  if (changes.expectedRevision !== old.revision)
    throw new ConvexError("This reservation changed. Refresh and try again.");
  const name = changes.customerName?.trim();
  const email = changes.customerEmail?.trim().toLowerCase();
  const phone = changes.customerPhone?.replace(/[\s()-]/g, "");
  const requests = changes.specialRequests?.trim();
  if (
    (name !== undefined &&
      (name.length < 2 ||
        name.length > 120 ||
        /[\u0000-\u001f\u007f]/.test(name))) ||
    (email !== undefined &&
      email !== "" &&
      (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) ||
    (phone !== undefined && phone !== "" && !/^\+?[0-9]{7,15}$/.test(phone)) ||
    (changes.specialRequests?.length ?? 0) > 2000
  )
    throw new ConvexError("Enter valid guest details.");
  if (
    changes.partySize !== undefined &&
    (!Number.isInteger(changes.partySize) || changes.partySize < 1)
  )
    throw new ConvexError("Choose a valid party size.");
  if (
    changes.tableIds &&
    (!changes.tableIds.length ||
      new Set(changes.tableIds).size !== changes.tableIds.length)
  )
    throw new ConvexError("Choose distinct tables.");

  const oldContact = old.guestContact ?? {
    email: customer.email,
    phone: customer.phone,
  };
  const contact = {
    email: email === undefined ? oldContact.email : email || undefined,
    phone: phone === undefined ? oldContact.phone : phone || undefined,
  };
  const partySize = changes.partySize ?? old.partySize;
  const tableIds = changes.tableIds ?? old.tableIds!;
  const moved = !sameTables(tableIds, old.tableIds!);
  const allocationChanged = moved || partySize !== old.partySize;
  const changedFields: string[] = [];
  const patch: Partial<Doc<"reservations">> = {};
  if (name !== undefined && name !== (old.guestName ?? customer.name)) {
    patch.guestName = name;
    changedFields.push("customerName");
  }
  if (
    contact.email !== oldContact.email ||
    contact.phone !== oldContact.phone
  ) {
    patch.guestContact = contact;
    if (contact.email !== oldContact.email) changedFields.push("customerEmail");
    if (contact.phone !== oldContact.phone) changedFields.push("customerPhone");
  }
  if (
    requests !== undefined &&
    (requests || undefined) !== (old.specialRequests || undefined)
  ) {
    patch.specialRequests = requests || undefined;
    changedFields.push("specialRequests");
  }
  let allocationStart: number | undefined;
  if (allocationChanged) {
    const result = await amendmentOptions(ctx, org, old, partySize);
    const option = result.options.find((candidate) =>
      sameTables(candidate.tableIds, tableIds),
    );
    if (!option)
      throw new ConvexError(
        "Choose an available table or saved combination that fits this party.",
      );
    await atomicAllocationCheck(
      ctx,
      org._id,
      option.tableIds,
      result.startAt,
      result.endAt,
      old._id,
    );
    const tables = option.tableIds.map(
      (tableId) => result.data.tables.find((table) => table._id === tableId)!,
    );
    Object.assign(patch, {
      partySize,
      tableIds: option.tableIds,
      tableId: option.tableIds[0],
      tableLabels: tables.map((table) => table.label),
      floorPlanId: tables[0].floorPlanId,
      combinationId: option.combinationId,
      capacitySnapshot: option.capacity,
    });
    allocationStart = result.startAt;
    if (partySize !== old.partySize) changedFields.push("partySize");
    if (moved) changedFields.push("tableIds");
  }
  if (!changedFields.length) return old;
  const now = Date.now();
  const revision = old.revision! + 1;
  await ctx.db.patch(id, { ...patch, revision, updatedAt: now });
  const updated = (await ctx.db.get(id))!;
  if (moved) {
    await replaceAllocations(
      ctx,
      updated,
      allocationStart!,
      old.endAt + (old.bufferMins ?? 0) * 60_000,
      old.status === "seated",
    );
    if (old.status === "seated") {
      const vacated = old.tableIds!.filter(
        (tableId) => !updated.tableIds!.includes(tableId),
      );
      for (const tableId of vacated) {
        await ctx.db.insert("reservation_allocations", {
          orgId: org._id,
          reservationId: id,
          revision,
          tableId,
          startAt: now,
          endAt: now + (old.bufferMins ?? 0) * 60_000,
          kind: "cleaning",
          requiresRelease: true,
          isActive: true,
          isDeleted: false,
          createdAt: now,
          updatedAt: now,
        });
      }
      for (const tableId of new Set([...vacated, ...updated.tableIds!]))
        await ctx.db.patch(tableId, {
          status: vacated.includes(tableId) ? "cleaning" : "occupied",
          updatedAt: now,
        });
    }
  }
  // Metadata edits must advance allocation revisions without changing occupancy,
  // cleaning deadlines, or the indefinite hold of an overdue seated party.
  for (const allocation of await allocationsFor(ctx, updated))
    if (!allocation.isDeleted && allocation.revision !== revision)
      await ctx.db.patch(allocation._id, { revision, updatedAt: now });
  await audit(
    ctx,
    org._id,
    id,
    actor,
    "amended",
    {
      revision: old.revision,
      partySize: old.partySize,
      tableIds: old.tableIds,
    },
    {
      revision,
      partySize: updated.partySize,
      tableIds: updated.tableIds,
      changedFields,
    },
  );
  // Existing proof remains the sole recipient authority. New revisions need
  // fresh reminders because delivery intentionally rejects stale revisions.
  await queueReservationEvent(ctx, org, updated, "changed");
  return updated;
}

export type LegacyReservationReview = {
  reservationId: Id<"reservations">;
  expectedUpdatedAt: number;
  originalTimeModel: "utc" | "wall_utc";
  timezone: string;
  serviceDate: string;
  actualStartAt: number;
  tableIds: Id<"tables">[];
  disposition: "convert" | "cancelled" | "completed" | "no_show";
};

/** Internal operator review only: every unresolved legacy row must have an explicit disposition. */
export async function reviewLegacyReservations(
  ctx: ReadCtx,
  org: Doc<"orgs">,
  reviews: LegacyReservationReview[],
) {
  if (
    !reviews.length ||
    reviews.length > 100 ||
    new Set(reviews.map((r) => r.reservationId)).size !== reviews.length
  )
    throw new ConvexError(
      "Review between 1 and 100 distinct legacy reservations.",
    );
  const data = await resources(
    ctx,
    org,
    new Set(reviews.map((r) => r.reservationId)),
  );
  const planned: Array<{
    review: LegacyReservationReview;
    old: Doc<"reservations">;
    option?: ReservationOption;
    tables?: Doc<"tables">[];
    endAt?: number;
    guestName?: string;
  }> = [];
  for (const review of reviews) {
    const old = await ctx.db.get(review.reservationId);
    if (
      !old ||
      old.orgId !== org._id ||
      old.isDeleted ||
      old.schemaVersion === 2 ||
      old.updatedAt !== review.expectedUpdatedAt
    )
      throw new ConvexError(
        "Legacy reservation changed or is not part of this venue.",
      );
    if (
      !validServiceDate(review.serviceDate) ||
      review.timezone !== data.settings.timezone
    )
      throw new ConvexError(
        "Review the service date and current venue timezone.",
      );
    if (review.disposition !== "convert") {
      planned.push({ review, old });
      continue;
    }
    if (!["pending", "confirmed"].includes(old.status))
      throw new ConvexError(
        "Resolve already seated or terminal legacy visits explicitly before conversion.",
      );
    if (!Number.isFinite(old.startAt))
      throw new ConvexError(
        "Review the invalid legacy timestamp before conversion.",
      );
    const wall = new Date(old.startAt);
    const candidates =
      review.originalTimeModel === "utc"
        ? [old.startAt]
        : localDateTimeInstants(
            wall.toISOString().slice(0, 10),
            wall.toISOString().slice(11, 16),
            review.timezone,
          );
    if (
      !candidates.includes(review.actualStartAt) ||
      review.actualStartAt < Date.now() ||
      review.actualStartAt % 60_000 !== 0
    )
      throw new ConvexError(
        "Review the original time model and explicitly select a valid future UTC instant; DST gaps cannot be converted.",
      );
    if (
      !Number.isInteger(old.durationMins) ||
      old.durationMins < data.settings.minDurationMins ||
      old.durationMins > data.settings.maxDurationMins ||
      !Number.isInteger(old.partySize) ||
      old.partySize < data.settings.minPartySize ||
      old.partySize > data.settings.maxPartySize
    )
      throw new ConvexError(
        "Legacy party size or duration needs manual replacement.",
      );
    if (
      !review.tableIds.length ||
      new Set(review.tableIds).size !== review.tableIds.length
    )
      throw new ConvexError("Choose distinct tables.");
    const option = optionsFor(data, old.partySize).find(
      (o) =>
        [...o.tableIds].sort().join() === [...review.tableIds].sort().join(),
    );
    const slot = periodStartTimes(
      data,
      review.serviceDate,
      old.durationMins,
    ).find(([start]) => start === review.actualStartAt);
    const endAt = review.actualStartAt + old.durationMins * 60_000;
    const bufferEnd = endAt + data.settings.bufferMins * 60_000;
    if (
      !option ||
      !slot ||
      !optionFree(data, option, review.actualStartAt, bufferEnd) ||
      planned.some(
        (p) =>
          p.option &&
          p.review.actualStartAt < bufferEnd &&
          review.actualStartAt < p.endAt! + data.settings.bufferMins * 60_000 &&
          p.option.tableIds.some((id) => option.tableIds.includes(id)),
      )
    )
      throw new ConvexError(
        "Reviewed legacy reservations conflict or fall outside configured service hours.",
      );
    const customer = await ctx.db.get(old.customerId);
    if (!customer || customer.orgId !== org._id || customer.isDeleted)
      throw new ConvexError("Review the legacy guest before conversion.");
    planned.push({
      review,
      old,
      option,
      tables: option.tableIds.map(
        (id) => data.tables.find((t) => t._id === id)!,
      ),
      endAt,
      guestName: customer.name,
    });
  }
  return { settings: data.settings, planned };
}

export async function applyLegacyReservationReview(
  ctx: MutationCtx,
  org: Doc<"orgs">,
  reviews: LegacyReservationReview[],
  reason: string,
) {
  if (reason.trim().length < 10 || reason.length > 1000)
    throw new ConvexError(
      "Record the reason and source of the reviewed legacy time interpretation.",
    );
  const { settings, planned } = await reviewLegacyReservations(
    ctx,
    org,
    reviews,
  );
  for (const { review, old, option, tables, endAt, guestName } of planned) {
    if (review.disposition === "convert") {
      await atomicAllocationCheck(
        ctx,
        org._id,
        option!.tableIds,
        review.actualStartAt,
        endAt! + settings.bufferMins * 60_000,
      );
      await ctx.db.patch(old._id, {
        schemaVersion: 2,
        timeModel: "utc",
        timezone: review.timezone,
        serviceDate: review.serviceDate,
        guestName,
        revision: 1,
        tableIds: option!.tableIds,
        tableId: option!.tableIds[0],
        floorPlanId: tables![0].floorPlanId,
        tableLabels: tables!.map((t) => t.label),
        combinationId: option!.combinationId,
        capacitySnapshot: option!.capacity,
        bufferMins: settings.bufferMins,
        startAt: review.actualStartAt,
        endAt: endAt!,
        status: "confirmed",
        updatedAt: Date.now(),
      });
      await replaceAllocations(
        ctx,
        (await ctx.db.get(old._id))!,
        review.actualStartAt,
        endAt! + settings.bufferMins * 60_000,
        false,
      );
    } else {
      await ctx.db.patch(old._id, {
        status: review.disposition,
        updatedAt: Date.now(),
        ...(review.disposition === "cancelled"
          ? { cancelledAt: Date.now(), cancellationReason: reason.trim() }
          : {}),
      });
    }
    await audit(
      ctx,
      org._id,
      old._id,
      { type: "system", id: "reviewedLegacyMigration" },
      "legacy_reviewed",
      {
        startAt: old.startAt,
        endAt: old.endAt,
        status: old.status,
        tableId: old.tableId,
      },
      {
        disposition: review.disposition,
        originalTimeModel: review.originalTimeModel,
        timezone: review.timezone,
        actualStartAt: review.actualStartAt,
        serviceDate: review.serviceDate,
        tableIds: review.tableIds,
        reason: reason.trim(),
      },
    );
  }
  return {
    reviewed: planned.length,
    converted: planned.filter((p) => p.review.disposition === "convert").length,
  };
}

export function safeReservation(reservation: Doc<"reservations">) {
  const {
    manageTokenHash,
    manageTokenCiphertext,
    manageTokenExpiresAt,
    requestFingerprint,
    verifiedEmail,
    guestContact,
    ...safe
  } = reservation;
  void manageTokenHash;
  void manageTokenCiphertext;
  void manageTokenExpiresAt;
  void requestFingerprint;
  void verifiedEmail;
  void guestContact;
  return safe;
}
