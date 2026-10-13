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

export async function seatedMoveOptions(
  ctx: ReadCtx,
  org: Doc<"orgs">,
  reservation: Doc<"reservations">,
) {
  if (reservation.orgId !== org._id || reservation.isDeleted)
    throw new ConvexError("Reservation not found.");
  const data = await resources(ctx, org);
  if (
    reservation.status !== "seated" ||
    reservation.endAt <= Date.now() ||
    reservation.durationMins < data.settings.minDurationMins ||
    reservation.durationMins > data.settings.maxDurationMins
  )
    return [];
  if (
    !periodStartTimes(
      {
        ...data,
        settings: { ...data.settings, bufferMins: reservation.bufferMins ?? 0 },
      },
      reservation.serviceDate!,
      reservation.durationMins,
    ).some(([start]) => start === reservation.startAt)
  )
    return [];
  return optionsFor(data, reservation.partySize).filter((option) =>
    optionFree(
      data,
      option,
      Date.now(),
      reservation.endAt + (reservation.bufferMins ?? 0) * 60_000,
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

async function allocationsFor(
  ctx: MutationCtx,
  reservation: Doc<"reservations">,
) {
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
    status: "confirmed",
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
    false,
  );
  await audit(ctx, org._id, id, actor, "created", undefined, {
    startAt: slot.startAt,
    partySize: input.partySize,
    tableIds: option.tableIds,
    revision: 1,
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
    if (old.status === "seated") {
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
      if (
        !periodStartTimes(
          {
            ...data,
            settings: { ...data.settings, bufferMins: old.bufferMins ?? 0 },
          },
          old.serviceDate!,
          duration,
        ).some(([start]) => start === old.startAt)
      )
        throw new ConvexError("This visit would extend beyond service hours.");
      const tableIds =
        change.action === "move" ? change.tableIds : old.tableIds;
      if (!tableIds?.length || new Set(tableIds).size !== tableIds.length)
        throw new ConvexError("Choose distinct tables.");
      const option = optionsFor(data, old.partySize).find(
        (o) => [...o.tableIds].sort().join() === [...tableIds].sort().join(),
      );
      blockEnd = endAt + (old.bufferMins ?? 0) * 60_000;
      if (
        !option ||
        !optionFree(
          data,
          option,
          change.action === "move" ? now : blockStart,
          blockEnd,
          id,
        )
      )
        throw new ConvexError(
          "These tables are closed or no longer available.",
        );
      await atomicAllocationCheck(
        ctx,
        org._id,
        option.tableIds,
        change.action === "move" ? now : blockStart,
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
      if (change.action === "move") {
        cleaningTableIds = old.tableIds.filter(
          (id) => !option.tableIds.includes(id),
        );
        blockStart = now;
      }
      releaseRequired = true;
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
    ...safe
  } = reservation;
  void manageTokenHash;
  void manageTokenCiphertext;
  void manageTokenExpiresAt;
  void requestFingerprint;
  void verifiedEmail;
  return safe;
}
