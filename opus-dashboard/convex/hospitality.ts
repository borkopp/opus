import { ConvexError, v } from "convex/values";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { authComponent } from "./betterAuth";
import { requireUser, resolveActiveMembership } from "./lib/auth";
import { rejectAppReviewIdentity } from "./lib/appReview";
import {
  allocateUniqueTenantSlug,
  ensurePublishableTenantSlug,
} from "./lib/tenantSlug";
import { isHospitalityOrg, requireHospitality } from "./lib/hospitalityAccess";
import { getHospitalityReadiness } from "./lib/hospitalityReadiness";
import {
  integerInRange,
  validateReservationSettings,
  validateStoredReservationSettings,
} from "./lib/hospitalitySettingsValidation";
import { internal } from "./_generated/api";
import {
  isValidBookingEmail,
  normalizeBookingEmail,
} from "./lib/bookingEmailSecurity";
import { isAppReviewEmail } from "./lib/appReview";

const venueType = v.union(v.literal("restaurant"), v.literal("cafe"));
const servicePeriod = v.object({
  name: v.string(),
  startTime: v.string(),
  endTime: v.string(),
  daysOfWeek: v.array(v.number()),
  endDayOffset: v.optional(v.union(v.literal(0), v.literal(1))),
  lastSeatingTime: v.optional(v.string()),
});

function requiredText(value: string, label: string, max = 120) {
  const text = value.trim();
  if (!text || text.length > max)
    throw new ConvexError(
      `${label} is required and must be at most ${max} characters.`,
    );
  return text;
}

async function canStartVenue(ctx: QueryCtx) {
  const authUser = await authComponent.safeGetAuthUser(ctx);
  return authUser?.emailVerified === true;
}

async function audit(
  ctx: MutationCtx,
  auth: Awaited<ReturnType<typeof requireHospitality>>,
  action: string,
  resourceType: string,
  resourceId: string,
  before: unknown,
  after: unknown,
) {
  await ctx.db.insert("audit_log", {
    orgId: auth.orgId,
    actorType: "staff",
    actorId: auth.staffMember._id,
    action,
    resourceType,
    resourceId,
    before,
    after,
    createdAt: Date.now(),
  });
}

async function reconcilePublication(ctx: MutationCtx, org: Doc<"orgs">) {
  if (org.websiteStatus !== "published") return;
  const current = await ctx.db.get(org._id);
  if (current && !(await getHospitalityReadiness(ctx, current)).ready)
    await ctx.db.patch(org._id, {
      websiteStatus: "suspended",
      updatedAt: Date.now(),
    });
}

async function assertTablesUnused(
  ctx: MutationCtx,
  orgId: Id<"orgs">,
  tableIds: Id<"tables">[],
) {
  for (const tableId of tableIds) {
    const table = await ctx.db.get(tableId);
    if (
      table?.orgId === orgId &&
      ["occupied", "cleaning"].includes(table.status)
    )
      throw new ConvexError(
        "Finish existing reservations and reset their tables before changing this resource.",
      );
  }
  const reservations = await ctx.db
    .query("reservations")
    .withIndex("by_org", (q) => q.eq("orgId", orgId))
    .collect();
  if (
    reservations.some(
      (reservation) =>
        !reservation.isDeleted &&
        (reservation.tableIds ?? [reservation.tableId]).some((id) =>
          tableIds.includes(id),
        ) &&
        ((["pending", "confirmed"].includes(reservation.status) &&
          reservation.endAt > Date.now()) ||
          reservation.status === "seated" ||
          (reservation.status === "completed" &&
            reservation.schemaVersion === 2 &&
            !reservation.cleaningCompletedAt)),
    )
  )
    throw new ConvexError(
      "Move or finish existing reservations and reset their tables before changing this resource.",
    );
}

async function preserveActiveCombinations(
  ctx: MutationCtx,
  orgId: Id<"orgs">,
  tableId: Id<"tables">,
  next: {
    capacity: number;
    areaId: Id<"floor_plans">;
    isActive: boolean;
  } | null,
) {
  const [combinations, tables] = await Promise.all([
    ctx.db
      .query("table_combinations")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .collect(),
    ctx.db
      .query("tables")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .collect(),
  ]);
  for (const combination of combinations.filter(
    (item) =>
      !item.isDeleted && item.isActive && item.tableIds.includes(tableId),
  )) {
    const capacity = combination.tableIds.reduce(
      (sum, id) =>
        sum +
        (id === tableId
          ? (next?.capacity ?? 0)
          : (tables.find((table) => table._id === id && !table.isDeleted)
              ?.capacity ?? 0)),
      0,
    );
    if (
      !next?.isActive ||
      next.areaId !== combination.floorPlanId ||
      combination.capacity > capacity
    )
      throw new ConvexError(
        "Disable or reconfigure this table's active combinations before changing it.",
      );
  }
}

export const getAccess = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireUser(ctx);
    const membership = await resolveActiveMembership(ctx, user);
    const hasVenue = Boolean(membership && isHospitalityOrg(membership.org));
    const canCreate =
      (!membership ||
        (membership.org.industry === "beauty_wellness" &&
          membership.staffMember.role === "owner")) &&
      (await canStartVenue(ctx));
    return {
      available: hasVenue || canCreate,
      canCreate,
      hasVenue,
      // Name and venue type complete onboarding. Publication still requires readiness.
      onboardingComplete: hasVenue,
    };
  },
});

export const getWorkspace = query({
  args: {},
  handler: async (ctx) => {
    const auth = await requireHospitality(ctx);
    const [settings, areas, tables, combinations, closures, readiness] =
      await Promise.all([
        ctx.db
          .query("reservation_settings")
          .withIndex("by_org", (q) => q.eq("orgId", auth.orgId))
          .unique(),
        ctx.db
          .query("floor_plans")
          .withIndex("by_org", (q) => q.eq("orgId", auth.orgId))
          .collect(),
        ctx.db
          .query("tables")
          .withIndex("by_org", (q) => q.eq("orgId", auth.orgId))
          .collect(),
        ctx.db
          .query("table_combinations")
          .withIndex("by_org", (q) => q.eq("orgId", auth.orgId))
          .collect(),
        ctx.db
          .query("reservation_closures")
          .withIndex("by_org", (q) => q.eq("orgId", auth.orgId))
          .collect(),
        getHospitalityReadiness(ctx, auth.org),
      ]);
    let canReadReservations = false;
    try {
      validateStoredReservationSettings(settings);
      canReadReservations = true;
    } catch (error) {
      if (!(error instanceof ConvexError)) throw error;
    }
    return {
      org: auth.org,
      role: auth.staffMember.role,
      settings,
      canReadReservations,
      areas: areas.filter((row) => !row.isDeleted),
      tables: tables.filter((row) => !row.isDeleted),
      combinations: combinations.filter((row) => !row.isDeleted),
      closures: closures.filter((row) => !row.isDeleted),
      readiness,
    };
  },
});

export const startVenue = mutation({
  args: { name: v.string(), venueType },
  handler: async (ctx, args) => {
    const { user, identity } = await requireUser(ctx);
    rejectAppReviewIdentity(identity);
    if (!(await canStartVenue(ctx)))
      throw new ConvexError(
        "Hospitality setup is unavailable for this account.",
      );
    const name = requiredText(args.name, "Venue name");
    if (name.length < 2)
      throw new ConvexError("Venue name must have at least two characters.");
    const membership = await resolveActiveMembership(ctx, user);
    if (membership) {
      if (
        isHospitalityOrg(membership.org) &&
        membership.staffMember.role === "owner"
      )
        return membership.orgId;
      if (
        membership.org.industry !== "beauty_wellness" ||
        membership.staffMember.role !== "owner"
      )
        throw new ConvexError("This account cannot create another venue.");
    }
    const now = Date.now();
    const orgId = await ctx.db.insert("orgs", {
      name,
      slug: await allocateUniqueTenantSlug(ctx, name),
      industry: "hospitality",
      venueType: args.venueType,
      plan: "free",
      listingStatus: "unpublished",
      websiteStatus: "unpublished",
      reviewCount: 0,
      averageRating: 0,
      source: "customer",
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });
    const staffId = await ctx.db.insert("staff_members", {
      orgId,
      userId: user._id,
      displayName: user.name || "Owner",
      specialties: [],
      role: "owner",
      bookingAccess: "team",
      isActive: true,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("org_settings", {
      orgId,
      timezone: "Europe/Skopje",
      currency: "MKD",
      locale: "mk-MK",
      slotDurationMins: 15,
      bookingWindowDays: 60,
      cancellationWindowHours: 24,
      bufferTimeMins: 0,
      surgePricingEnabled: false,
      reminderHoursBefore: [],
      emailEnabled: true,
      whatsappEnabled: false,
      aiEnabled: false,
      aiPersonaName: "Assistant",
      aiConfidenceThreshold: 0.7,
      updatedAt: now,
    });
    await ctx.db.insert("reservation_settings", {
      orgId,
      schemaVersion: 2,
      timezone: "Europe/Skopje",
      bookingWindowDays: 60,
      minAdvanceBookingHours: 1,
      minPartySize: 1,
      maxPartySize: 8,
      defaultDurationMins: 90,
      minDurationMins: 15,
      maxDurationMins: 480,
      slotIntervalMins: 15,
      bufferMins: 15,
      cancellationWindowHours: 24,
      noShowGraceMins: 15,
      servicePeriods: [],
      walkInsAccepted: true,
      walkInBufferMins: 0,
      reminderHoursBefore: [],
      updatedAt: now,
    });
    await ctx.db.insert("floor_plans", {
      orgId,
      name: "Main room",
      canvasWidth: 800,
      canvasHeight: 600,
      isActive: true,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(user._id, { activeOrgId: orgId, updatedAt: now });
    await ctx.db.insert("audit_log", {
      orgId,
      actorType: "staff",
      actorId: staffId,
      action: "hospitality.created",
      resourceType: "orgs",
      resourceId: orgId,
      before: null,
      after: { name, venueType: args.venueType },
      createdAt: now,
    });
    return orgId;
  },
});

export const saveProfile = mutation({
  args: {
    name: v.string(),
    venueType,
    address: v.string(),
    city: v.string(),
    phone: v.string(),
    bio: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await requireHospitality(ctx, "owner");
    const fields = {
      name: requiredText(args.name, "Venue name"),
      venueType: args.venueType,
      address: requiredText(args.address, "Address", 200),
      city: requiredText(args.city, "City", 100),
      phone: requiredText(args.phone, "Phone", 30),
      bio: args.bio?.trim().slice(0, 1000),
      country: "MK",
      updatedAt: Date.now(),
    };
    if (!/^\+?[\d ()-]{6,30}$/.test(fields.phone))
      throw new ConvexError("Enter a valid contact phone number.");
    await ctx.db.patch(auth.orgId, fields);
    await audit(
      ctx,
      auth,
      "hospitality.profile_updated",
      "orgs",
      auth.orgId,
      auth.org,
      fields,
    );
    await reconcilePublication(ctx, auth.org);
  },
});

export const saveSettings = mutation({
  args: {
    timezone: v.string(),
    defaultDurationMins: v.number(),
    minDurationMins: v.number(),
    maxDurationMins: v.number(),
    bufferMins: v.number(),
    slotIntervalMins: v.number(),
    bookingWindowDays: v.number(),
    minAdvanceBookingHours: v.number(),
    minPartySize: v.number(),
    maxPartySize: v.number(),
    cancellationWindowHours: v.number(),
    noShowGraceMins: v.number(),
    walkInsAccepted: v.boolean(),
    servicePeriods: v.array(servicePeriod),
    reminderHoursBefore: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    const auth = await requireHospitality(ctx, "manager");
    validateReservationSettings(args);
    if (
      args.reminderHoursBefore.length > 4 ||
      args.reminderHoursBefore.some((hour) => ![1, 2, 3, 24].includes(hour))
    )
      throw new ConvexError("Choose up to four supported reminder times.");
    const existing = await ctx.db
      .query("reservation_settings")
      .withIndex("by_org", (q) => q.eq("orgId", auth.orgId))
      .first();
    if (!existing) throw new ConvexError("Reservation settings unavailable.");
    if (existing.timezone !== args.timezone) {
      const upcoming = await ctx.db
        .query("reservations")
        .withIndex("by_org", (q) => q.eq("orgId", auth.orgId))
        .collect();
      if (
        upcoming.some(
          (row) =>
            !row.isDeleted &&
            ["pending", "confirmed", "seated"].includes(row.status) &&
            row.endAt > Date.now(),
        )
      )
        throw new ConvexError(
          "Resolve future reservations before changing the venue timezone.",
        );
    }
    const fields = {
      ...args,
      schemaVersion: 2 as const,
      servicePeriods: args.servicePeriods.map((period) => ({
        ...period,
        name: period.name.trim(),
      })),
      updatedAt: Date.now(),
    };
    await ctx.db.patch(existing._id, fields);
    const common = await ctx.db
      .query("org_settings")
      .withIndex("by_org", (q) => q.eq("orgId", auth.orgId))
      .first();
    if (common)
      await ctx.db.patch(common._id, {
        timezone: args.timezone,
        updatedAt: Date.now(),
      });
    await audit(
      ctx,
      auth,
      "hospitality.settings_updated",
      "reservation_settings",
      existing._id,
      existing,
      fields,
    );
    await reconcilePublication(ctx, auth.org);
  },
});

export const saveArea = mutation({
  args: {
    areaId: v.optional(v.id("floor_plans")),
    name: v.string(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const auth = await requireHospitality(ctx, "manager");
    const name = requiredText(args.name, "Area name", 80);
    const existing = args.areaId ? await ctx.db.get(args.areaId) : null;
    if (
      args.areaId &&
      (!existing || existing.orgId !== auth.orgId || existing.isDeleted)
    )
      throw new ConvexError("Area unavailable.");
    if (existing && !args.isActive) {
      const tables = await ctx.db
        .query("tables")
        .withIndex("by_org", (q) => q.eq("orgId", auth.orgId))
        .collect();
      await assertTablesUnused(
        ctx,
        auth.orgId,
        tables
          .filter((table) => table.floorPlanId === existing._id)
          .map((table) => table._id),
      );
    }
    const fields = { name, isActive: args.isActive, updatedAt: Date.now() };
    const id = existing
      ? existing._id
      : await ctx.db.insert("floor_plans", {
          orgId: auth.orgId,
          ...fields,
          canvasWidth: 800,
          canvasHeight: 600,
          isDeleted: false,
          createdAt: Date.now(),
        });
    if (existing) await ctx.db.patch(id, fields);
    await audit(
      ctx,
      auth,
      "hospitality.area_saved",
      "floor_plans",
      id,
      existing,
      fields,
    );
    await reconcilePublication(ctx, auth.org);
    return id;
  },
});

export const saveTable = mutation({
  args: {
    tableId: v.optional(v.id("tables")),
    areaId: v.id("floor_plans"),
    label: v.string(),
    capacity: v.number(),
    minPartySize: v.number(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const auth = await requireHospitality(ctx, "manager");
    integerInRange(args.capacity, 1, 100, "Table capacity");
    integerInRange(
      args.minPartySize,
      1,
      args.capacity,
      "Table minimum party size",
    );
    const area = await ctx.db.get(args.areaId);
    if (!area || area.orgId !== auth.orgId || area.isDeleted)
      throw new ConvexError("Area unavailable.");
    const existing = args.tableId ? await ctx.db.get(args.tableId) : null;
    if (
      args.tableId &&
      (!existing || existing.orgId !== auth.orgId || existing.isDeleted)
    )
      throw new ConvexError("Table unavailable.");
    if (
      existing &&
      (existing.floorPlanId !== args.areaId ||
        existing.capacity !== args.capacity ||
        (existing.minCapacity ?? 1) !== args.minPartySize ||
        existing.isActive !== args.isActive)
    )
      await assertTablesUnused(ctx, auth.orgId, [existing._id]);
    if (existing)
      await preserveActiveCombinations(ctx, auth.orgId, existing._id, args);
    const fields = {
      floorPlanId: args.areaId,
      label: requiredText(args.label, "Table label", 40),
      capacity: args.capacity,
      minCapacity: args.minPartySize,
      isActive: args.isActive,
      status: !args.isActive
        ? ("inactive" as const)
        : existing?.status === "inactive"
          ? ("available" as const)
          : (existing?.status ?? ("available" as const)),
      updatedAt: Date.now(),
    };
    const id = existing
      ? existing._id
      : await ctx.db.insert("tables", {
          orgId: auth.orgId,
          ...fields,
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          rotation: 0,
          shape: "rectangle",
          sortOrder: 0,
          isDeleted: false,
          createdAt: Date.now(),
        });
    if (existing) await ctx.db.patch(id, fields);
    await audit(
      ctx,
      auth,
      "hospitality.table_saved",
      "tables",
      id,
      existing,
      fields,
    );
    await reconcilePublication(ctx, auth.org);
    return id;
  },
});

export const saveCombination = mutation({
  args: {
    combinationId: v.optional(v.id("table_combinations")),
    name: v.string(),
    tableIds: v.array(v.id("tables")),
    capacity: v.number(),
    minPartySize: v.number(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const auth = await requireHospitality(ctx, "manager");
    if (
      args.tableIds.length < 2 ||
      args.tableIds.length > 8 ||
      new Set(args.tableIds).size !== args.tableIds.length
    )
      throw new ConvexError("Select two to eight distinct tables.");
    const tables = await Promise.all(args.tableIds.map((id) => ctx.db.get(id)));
    const first = tables[0];
    if (
      !first ||
      tables.some(
        (table) =>
          !table ||
          table.orgId !== auth.orgId ||
          table.isDeleted ||
          table.isActive === false ||
          table.status === "inactive" ||
          table.floorPlanId !== first.floorPlanId,
      )
    )
      throw new ConvexError("Choose active tables from the same area.");
    integerInRange(
      args.capacity,
      1,
      Math.min(
        100,
        tables.reduce((sum, table) => sum + table!.capacity, 0),
      ),
      "Combination capacity",
    );
    integerInRange(
      args.minPartySize,
      1,
      args.capacity,
      "Combination minimum party size",
    );
    const existing = args.combinationId
      ? await ctx.db.get(args.combinationId)
      : null;
    if (
      args.combinationId &&
      (!existing || existing.orgId !== auth.orgId || existing.isDeleted)
    )
      throw new ConvexError("Combination unavailable.");
    const fields = {
      name: requiredText(args.name, "Combination name", 80),
      tableIds: args.tableIds,
      floorPlanId: first.floorPlanId,
      capacity: args.capacity,
      minPartySize: args.minPartySize,
      isActive: args.isActive,
      revision: (existing?.revision ?? 0) + 1,
      updatedAt: Date.now(),
    };
    const id = existing
      ? existing._id
      : await ctx.db.insert("table_combinations", {
          orgId: auth.orgId,
          ...fields,
          isDeleted: false,
          createdAt: Date.now(),
        });
    if (existing) await ctx.db.patch(id, fields);
    await audit(
      ctx,
      auth,
      "hospitality.combination_saved",
      "table_combinations",
      id,
      existing,
      fields,
    );
    await reconcilePublication(ctx, auth.org);
    return id;
  },
});

export const saveClosure = mutation({
  args: {
    closureId: v.optional(v.id("reservation_closures")),
    tableIds: v.array(v.id("tables")),
    startAt: v.number(),
    endAt: v.number(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const auth = await requireHospitality(ctx, "manager");
    if (
      !Number.isSafeInteger(args.startAt) ||
      !Number.isSafeInteger(args.endAt) ||
      args.endAt <= args.startAt ||
      args.endAt - args.startAt > 366 * 86_400_000
    )
      throw new ConvexError(
        "Choose a valid closure interval of at most one year.",
      );
    if (
      new Set(args.tableIds).size !== args.tableIds.length ||
      args.tableIds.length > 100
    )
      throw new ConvexError("Choose distinct tables.");
    for (const id of args.tableIds) {
      const table = await ctx.db.get(id);
      if (!table || table.orgId !== auth.orgId || table.isDeleted)
        throw new ConvexError("Table unavailable.");
    }
    const reservations = await ctx.db
      .query("reservations")
      .withIndex("by_org", (q) => q.eq("orgId", auth.orgId))
      .collect();
    if (
      reservations.some(
        (row) =>
          !row.isDeleted &&
          ["pending", "confirmed", "seated"].includes(row.status) &&
          row.startAt < args.endAt &&
          row.endAt + (row.bufferMins ?? 0) * 60_000 > args.startAt &&
          (!args.tableIds.length ||
            (row.tableIds ?? [row.tableId]).some((id) =>
              args.tableIds.includes(id),
            )),
      )
    )
      throw new ConvexError(
        "Move or cancel conflicting reservations before adding this closure.",
      );
    const existing = args.closureId ? await ctx.db.get(args.closureId) : null;
    if (
      args.closureId &&
      (!existing || existing.orgId !== auth.orgId || existing.isDeleted)
    )
      throw new ConvexError("Closure unavailable.");
    const fields = {
      tableIds: args.tableIds,
      startAt: args.startAt,
      endAt: args.endAt,
      reason: requiredText(args.reason, "Closure reason", 200),
      updatedAt: Date.now(),
    };
    const id = existing
      ? existing._id
      : await ctx.db.insert("reservation_closures", {
          orgId: auth.orgId,
          ...fields,
          isDeleted: false,
          createdAt: Date.now(),
        });
    if (existing) await ctx.db.patch(id, fields);
    await audit(
      ctx,
      auth,
      "hospitality.closure_saved",
      "reservation_closures",
      id,
      existing,
      fields,
    );
    return id;
  },
});

export const removeResource = mutation({
  args: {
    kind: v.union(
      v.literal("area"),
      v.literal("table"),
      v.literal("combination"),
      v.literal("closure"),
    ),
    id: v.string(),
  },
  handler: async (ctx, args) => {
    const auth = await requireHospitality(ctx, "manager");
    const tableName = {
      area: "floor_plans",
      table: "tables",
      combination: "table_combinations",
      closure: "reservation_closures",
    } as const;
    const id = ctx.db.normalizeId(tableName[args.kind], args.id);
    const existing = id ? await ctx.db.get(id) : null;
    if (!id || !existing || existing.orgId !== auth.orgId || existing.isDeleted)
      throw new ConvexError("Resource unavailable.");
    if (args.kind === "table") {
      await assertTablesUnused(ctx, auth.orgId, [id as Id<"tables">]);
      await preserveActiveCombinations(
        ctx,
        auth.orgId,
        id as Id<"tables">,
        null,
      );
    }
    if (args.kind === "area") {
      const tables = await ctx.db
        .query("tables")
        .withIndex("by_org", (q) => q.eq("orgId", auth.orgId))
        .collect();
      if (tables.some((table) => !table.isDeleted && table.floorPlanId === id))
        throw new ConvexError("Move or remove this area's tables first.");
    }
    await ctx.db.patch(id, {
      isDeleted: true,
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });
    await audit(
      ctx,
      auth,
      "hospitality.resource_removed",
      tableName[args.kind],
      id,
      existing,
      { isDeleted: true },
    );
    await reconcilePublication(ctx, auth.org);
  },
});

export const publish = mutation({
  args: { published: v.boolean() },
  handler: async (ctx, args) => {
    const auth = await requireHospitality(ctx, "owner");
    const readiness = await getHospitalityReadiness(ctx, auth.org);
    if (args.published && !readiness.ready)
      throw new ConvexError(
        `Complete setup: ${readiness.requirements
          .filter((item) => !item.complete)
          .map((item) => item.label)
          .join(", ")}.`,
      );
    const fields = {
      websiteStatus: args.published
        ? ("published" as const)
        : ("unpublished" as const),
      websitePublishedAt: args.published
        ? (auth.org.websitePublishedAt ?? Date.now())
        : auth.org.websitePublishedAt,
      slug: await ensurePublishableTenantSlug(ctx, auth.org),
      updatedAt: Date.now(),
    };
    await ctx.db.patch(auth.orgId, fields);
    await audit(
      ctx,
      auth,
      args.published ? "hospitality.published" : "hospitality.unpublished",
      "orgs",
      auth.orgId,
      auth.org,
      fields,
    );
  },
});

export const listTeam = query({
  args: {},
  handler: async (ctx) => {
    const auth = await requireHospitality(ctx, "owner");
    const [staff, invites] = await Promise.all([
      ctx.db
        .query("staff_members")
        .withIndex("by_org", (q) => q.eq("orgId", auth.orgId))
        .collect(),
      ctx.db
        .query("staff_invites")
        .withIndex("by_org", (q) => q.eq("orgId", auth.orgId))
        .collect(),
    ]);
    return staff
      .filter((member) => !member.isDeleted)
      .map((member) => ({
        ...member,
        invite: invites
          .filter(
            (invite) =>
              !invite.isDeleted &&
              invite.staffId === member._id &&
              invite.status === "pending" &&
              invite.expiresAt > Date.now(),
          )
          .map((invite) => ({
            email: invite.email,
            expiresAt: invite.expiresAt,
          }))[0],
      }));
  },
});

export const inviteTeamMember = mutation({
  args: {
    staffId: v.optional(v.id("staff_members")),
    name: v.string(),
    email: v.string(),
    role: v.union(v.literal("manager"), v.literal("staff")),
  },
  handler: async (ctx, args) => {
    const auth = await requireHospitality(ctx, "owner");
    const email = normalizeBookingEmail(args.email);
    if (!isValidBookingEmail(email) || isAppReviewEmail(email))
      throw new ConvexError("Enter a valid team sign-in email.");
    const name = requiredText(args.name, "Team member name", 100);
    const staff = await ctx.db
      .query("staff_members")
      .withIndex("by_org", (q) => q.eq("orgId", auth.orgId))
      .collect();
    const existing = args.staffId ? await ctx.db.get(args.staffId) : null;
    if (
      args.staffId &&
      (!existing ||
        existing.orgId !== auth.orgId ||
        existing.isDeleted ||
        existing.role === "owner" ||
        existing.userId)
    )
      throw new ConvexError("This team invitation cannot be changed.");
    const invites = await ctx.db
      .query("staff_invites")
      .withIndex("by_org", (q) => q.eq("orgId", auth.orgId))
      .collect();
    if (
      invites.some(
        (invite) =>
          !invite.isDeleted &&
          invite.email === email &&
          invite.status === "pending" &&
          invite.expiresAt > Date.now() &&
          invite.staffId !== existing?._id,
      )
    )
      throw new ConvexError("This email already has a pending invitation.");
    for (const member of staff.filter(
      (member) => !member.isDeleted && member.userId,
    )) {
      const user = await ctx.db.get(member.userId!);
      if (
        user &&
        !user.isDeleted &&
        normalizeBookingEmail(user.email) === email
      )
        throw new ConvexError("This account already belongs to the venue.");
    }
    const now = Date.now();
    const fields = {
      displayName: name,
      role: args.role,
      isActive: true,
      bookingAccess: "team" as const,
      updatedAt: now,
    };
    const staffId =
      existing?._id ??
      (await ctx.db.insert("staff_members", {
        orgId: auth.orgId,
        ...fields,
        specialties: [],
        isDeleted: false,
        createdAt: now,
      }));
    if (existing) await ctx.db.patch(staffId, fields);
    for (const invite of invites.filter(
      (invite) =>
        invite.staffId === staffId &&
        invite.status === "pending" &&
        !invite.isDeleted,
    ))
      await ctx.db.patch(invite._id, { status: "cancelled", updatedAt: now });
    const token = crypto.randomUUID();
    const inviteId = await ctx.db.insert("staff_invites", {
      orgId: auth.orgId,
      staffId,
      email,
      personalAccount: false,
      token,
      status: "pending",
      expiresAt: now + 72 * 3_600_000,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.runMutation(internal.notifications.scheduleNotification, {
      orgId: auth.orgId,
      channel: "email",
      type: "staff_invite",
      recipientAddress: email,
      templateData: { token, inviteId },
      dedupeKey: `hospitality-invite:${inviteId}`,
    });
    await audit(
      ctx,
      auth,
      "hospitality.staff_invited",
      "staff_invites",
      inviteId,
      null,
      { staffId, email, role: args.role },
    );
    return inviteId;
  },
});

export const updateTeamMember = mutation({
  args: {
    staffId: v.id("staff_members"),
    role: v.union(v.literal("manager"), v.literal("staff")),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const auth = await requireHospitality(ctx, "owner");
    const member = await ctx.db.get(args.staffId);
    if (
      !member ||
      member.orgId !== auth.orgId ||
      member.isDeleted ||
      member.role === "owner"
    )
      throw new ConvexError(
        "Only a venue's non-owner team members can be changed here.",
      );
    const fields = {
      role: args.role,
      isActive: args.isActive,
      updatedAt: Date.now(),
    };
    await ctx.db.patch(member._id, fields);
    if (!args.isActive) {
      const invites = await ctx.db
        .query("staff_invites")
        .withIndex("by_org", (q) => q.eq("orgId", auth.orgId))
        .collect();
      for (const invite of invites.filter(
        (invite) =>
          invite.staffId === member._id &&
          invite.status === "pending" &&
          !invite.isDeleted,
      ))
        await ctx.db.patch(invite._id, {
          status: "cancelled",
          updatedAt: Date.now(),
        });
    }
    await audit(
      ctx,
      auth,
      "hospitality.staff_updated",
      "staff_members",
      member._id,
      member,
      fields,
    );
  },
});
