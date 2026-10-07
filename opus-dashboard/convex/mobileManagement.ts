import { ConvexError, v } from "convex/values";
import { api } from "./_generated/api";
import { mutation, query, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireRole } from "./lib/auth";
import { isActiveIndustry } from "./lib/productScope";
import { getStaffPlanStatusForOrg } from "./lib/staffPlanLimits";
import {
  isValidBookingEmail,
  normalizeBookingEmail,
} from "./lib/bookingEmailSecurity";
import type { MobileManagement } from "../../shared/mobile";

const role = v.union(
  v.literal("owner"),
  v.literal("manager"),
  v.literal("staff"),
);
const hours = v.array(
  v.object({
    dayOfWeek: v.number(),
    startTime: v.string(),
    endTime: v.string(),
    isActive: v.boolean(),
    breaks: v.array(v.object({ startTime: v.string(), endTime: v.string() })),
  }),
);
async function access(ctx: QueryCtx, minimum: "staff" | "manager" = "manager") {
  const auth = await requireRole(ctx, undefined, minimum);
  if (!isActiveIndustry(auth.org.industry))
    throw new ConvexError("Mobile is available for beauty studios.");
  return auth;
}
function text(value: string, label: string, limit: number, required = false) {
  const trimmed = value.trim();
  if ((required && !trimmed) || trimmed.length > limit)
    throw new ConvexError(
      `${label} must be ${required ? "1–" : "at most "}${limit} characters.`,
    );
  return trimmed;
}
function minute(value: string) {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value) && value !== "24:00")
    throw new ConvexError("Use HH:MM for working hours.");
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}
function validateHours(week: import("../../shared/mobile").WeeklyHours[]) {
  if (week.length !== 7 || new Set(week.map((d) => d.dayOfWeek)).size !== 7)
    throw new ConvexError("Provide all seven days of working hours.");
  for (const day of week) {
    if (
      !Number.isInteger(day.dayOfWeek) ||
      day.dayOfWeek < 0 ||
      day.dayOfWeek > 6
    )
      throw new ConvexError("Invalid weekday.");
    const start = minute(day.startTime),
      end = minute(day.endTime);
    if (start >= end || start === 1440)
      throw new ConvexError("Working hours must end after they start.");
    if (day.breaks.length > 20) throw new ConvexError("Too many breaks.");
    let previousEnd = start;
    for (const pause of [...day.breaks].sort((a, b) =>
      a.startTime.localeCompare(b.startTime),
    )) {
      const from = minute(pause.startTime),
        to = minute(pause.endTime);
      if (from < previousEnd || to > end || from >= to)
        throw new ConvexError(
          "Breaks must fit within working hours and must not overlap.",
        );
      previousEnd = to;
    }
  }
}

export const list = query({
  args: {},
  handler: async (ctx): Promise<MobileManagement> => {
    const { orgId, org, staffMember: caller } = await access(ctx, "staff");
    const [settings, services, roster, rules, invites, capacity] =
      await Promise.all([
        ctx.db
          .query("org_settings")
          .withIndex("by_org", (q) => q.eq("orgId", orgId))
          .first(),
        ctx.db
          .query("services")
          .withIndex("by_org", (q) => q.eq("orgId", orgId))
          .collect(),
        ctx.db
          .query("staff_members")
          .withIndex("by_org", (q) => q.eq("orgId", orgId))
          .collect(),
        ctx.db
          .query("availability_rules")
          .withIndex("by_org", (q) => q.eq("orgId", orgId))
          .collect(),
        caller.role !== "staff"
          ? ctx.db
              .query("staff_invites")
              .withIndex("by_org", (q) => q.eq("orgId", orgId))
              .collect()
          : Promise.resolve([]),
        getStaffPlanStatusForOrg(ctx, org),
      ]);
    const team = roster.filter((s) => !s.isDeleted);
    const ids = new Set(team.map((s) => s._id));
    const canManage = caller.role !== "staff";
    const now = Date.now();
    return {
      canManage,
      callerId: caller._id,
      currency: settings?.currency ?? "MKD",
      slotDurationMins: settings?.slotDurationMins ?? 15,
      capacity,
      defaultHours: Array.from({ length: 7 }, (_, dayOfWeek) => {
        const day = org.openingHours?.find(
          (d) => d.dayOfWeek === (dayOfWeek + 6) % 7,
        );
        return {
          dayOfWeek,
          startTime: day?.open || "09:00",
          endTime: day?.close || "17:00",
          isActive: !!day && !day.isClosed,
          breaks: [],
        };
      }),
      services: services
        .filter((s) => !s.isDeleted)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((s) => ({
          id: s._id,
          name: s.name,
          description: s.consumerDescription ?? "",
          durationMins: s.durationMins,
          priceMinorUnits: s.priceMinorUnits,
          currency: s.currency,
          staffIds: s.staffIds.filter((id) => ids.has(id)),
          isActive: s.isActive,
          isOpusVisible: s.isOpusVisible,
        })),
      team: await Promise.all(
        team
          .sort((a, b) => a.displayName.localeCompare(b.displayName))
          .map(async (s) => {
            const canEdit =
              canManage && (s.role !== "owner" || caller.role === "owner");
            const lastOwner =
              s.role === "owner" && s.isActive && capacity.ownerCount === 1;
            const pending = canEdit
              ? invites
                  .filter(
                    (i) =>
                      i.staffId === s._id &&
                      !i.isDeleted &&
                      i.status === "pending" &&
                      i.expiresAt > now,
                  )
                  .sort((a, b) => b.createdAt - a.createdAt)[0]
              : undefined;
            return {
              id: s._id,
              name: s.displayName,
              role: s.role,
              bio: s.bio ?? "",
              specialties: s.specialties,
              isActive: s.isActive,
              hasAccess: !!s.userId,
              pendingInviteEmail: pending?.email ?? null,
              canEdit,
              canRemove: canEdit && s._id !== caller._id && !lastOwner,
              canChangeRole: canEdit && !lastOwner,
              canSetInactive: canEdit && s._id !== caller._id && !lastOwner,
              capacity: await getStaffPlanStatusForOrg(ctx, org, s),
              hours: Array.from({ length: 7 }, (_, dayOfWeek) => {
                const rule = rules.find(
                  (r) =>
                    r.staffId === s._id &&
                    r.dayOfWeek === dayOfWeek &&
                    !r.isDeleted,
                );
                return {
                  dayOfWeek,
                  startTime: rule?.startTime ?? "09:00",
                  endTime: rule?.endTime ?? "17:00",
                  isActive: rule?.isActive ?? false,
                  breaks: rule?.breaks ?? [],
                };
              }),
            };
          }),
      ),
    };
  },
});

export const saveService = mutation({
  args: {
    serviceId: v.optional(v.id("services")),
    name: v.string(),
    description: v.string(),
    durationMins: v.number(),
    priceMinorUnits: v.number(),
    // Accept older mobile clients, but currency is managed by the web dashboard.
    currency: v.optional(v.string()),
    staffIds: v.array(v.id("staff_members")),
    isActive: v.boolean(),
    isOpusVisible: v.boolean(),
  },
  handler: async (ctx, args): Promise<Id<"services">> => {
    const { orgId } = await access(ctx);
    const existing = args.serviceId ? await ctx.db.get(args.serviceId) : null;
    if (
      args.serviceId &&
      (!existing || existing.orgId !== orgId || existing.isDeleted)
    )
      throw new ConvexError("Service unavailable.");
    const settings = await ctx.db
      .query("org_settings")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .first();
    const name = text(args.name, "Service name", 120, true),
      description = text(args.description, "Description", 2000);
    if (!Number.isSafeInteger(args.priceMinorUnits) || args.priceMinorUnits < 0)
      throw new ConvexError("Enter a valid price.");
    if (
      !Number.isInteger(args.durationMins) ||
      args.durationMins < 1 ||
      args.durationMins > 1440
    )
      throw new ConvexError("Duration must be between 1 and 1440 minutes.");
    const staffIds = [...new Set(args.staffIds)];
    for (const id of staffIds) {
      const staff = await ctx.db.get(id);
      if (!staff || staff.orgId !== orgId || staff.isDeleted)
        throw new ConvexError("Team member unavailable.");
    }
    const values = {
      name,
      consumerDescription: description,
      durationMins: args.durationMins,
      priceMinorUnits: args.priceMinorUnits,
      // Preserve existing price denominations; new services use the studio default.
      currency: existing?.currency ?? settings?.currency ?? "MKD",
      staffIds,
      isOpusVisible: args.isOpusVisible,
    };
    if (args.serviceId) {
      await ctx.runMutation(api.services.updateService, {
        orgId,
        serviceId: args.serviceId,
        ...values,
        isActive: args.isActive,
      });
      return args.serviceId;
    }
    const services = await ctx.db
      .query("services")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .collect();
    const id = await ctx.runMutation(api.services.createService, {
      orgId,
      ...values,
      sortOrder: Math.max(-1, ...services.map((s) => s.sortOrder)) + 1,
    });
    if (!args.isActive)
      await ctx.runMutation(api.services.updateService, {
        orgId,
        serviceId: id,
        isActive: false,
      });
    return id;
  },
});
export const removeService = mutation({
  args: { serviceId: v.id("services") },
  handler: async (ctx, { serviceId }): Promise<void> => {
    const { orgId } = await access(ctx);
    await ctx.runMutation(api.services.deactivateService, { orgId, serviceId });
  },
});
export const saveTeamMember = mutation({
  args: {
    staffId: v.optional(v.id("staff_members")),
    signInEmail: v.optional(v.string()),
    displayName: v.string(),
    role,
    bio: v.string(),
    specialties: v.array(v.string()),
    appointmentEmail: v.optional(v.union(v.string(), v.null())),
    isActive: v.boolean(),
    serviceIds: v.array(v.id("services")),
    hours,
  },
  handler: async (ctx, args): Promise<Id<"staff_members">> => {
    const { orgId, staffMember: caller } = await access(ctx);
    if (args.staffId && args.signInEmail?.trim())
      throw new ConvexError(
        "Use account access to invite an existing team member.",
      );
    const displayName = text(args.displayName, "Name", 120, true),
      bio = text(args.bio, "Bio", 1000);
    if (args.specialties.length > 20)
      throw new ConvexError("Choose at most 20 specialties.");
    const specialties = [
      ...new Set(args.specialties.map((s) => text(s, "Specialty", 80, true))),
    ];
    validateHours(args.hours);
    const [services, team] = await Promise.all([
      ctx.db
        .query("services")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .collect(),
      ctx.db
        .query("staff_members")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .collect(),
    ]);
    const serviceIds = new Set(args.serviceIds);
    if (
      args.serviceIds.some(
        (id) => !services.some((s) => s._id === id && !s.isDeleted),
      )
    )
      throw new ConvexError("Service unavailable.");
    if (args.staffId === caller._id && !args.isActive)
      throw new ConvexError("You cannot deactivate yourself.");
    const values = {
      displayName,
      role: args.role,
      bio,
      specialties,
    };
    let staffId = args.staffId;
    if (staffId) {
      const existing = await ctx.db.get(staffId);
      if (!existing || existing.orgId !== orgId || existing.isDeleted)
        throw new ConvexError("Team member unavailable.");
      if (existing.role === "owner" && caller.role !== "owner")
        throw new ConvexError("Only an owner can update another owner.");
    } else {
      if (!args.isActive)
        throw new ConvexError("New team members must be active.");
      staffId = await ctx.runMutation(api.staff.createStaffMember, {
        ...values,
        orgId,
        signInEmail: args.signInEmail,
      });
    }
    const memberId = staffId;
    const validIds = new Set(
      team.filter((s) => !s.isDeleted).map((s) => s._id),
    );
    validIds.add(memberId);
    for (const service of services.filter((s) => !s.isDeleted)) {
      const staffIds = service.staffIds.filter(
        (id) => validIds.has(id) && id !== memberId,
      );
      if (serviceIds.has(service._id)) staffIds.push(memberId);
      if (
        staffIds.length !== service.staffIds.length ||
        staffIds.some((id) => !service.staffIds.includes(id))
      )
        await ctx.runMutation(api.services.updateService, {
          orgId,
          serviceId: service._id,
          staffIds,
        });
    }
    const rules = await ctx.db
      .query("availability_rules")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .collect();
    for (const day of args.hours) {
      const existing = rules.find(
        (r) =>
          r.staffId === memberId &&
          r.dayOfWeek === day.dayOfWeek &&
          !r.isDeleted,
      );
      if (
        existing &&
        existing.startTime === day.startTime &&
        existing.endTime === day.endTime &&
        existing.isActive === day.isActive &&
        JSON.stringify(existing.breaks ?? []) === JSON.stringify(day.breaks)
      )
        continue;
      await ctx.runMutation(api.availability.setAvailabilityRule, {
        orgId,
        staffId: memberId,
        ...day,
      });
    }
    // Apply access changes last so a manager can save their own hours/services
    // and downgrade their role atomically, using their current permissions.
    if (args.staffId)
      await ctx.runMutation(api.staff.updateStaffMember, {
        orgId,
        staffId: memberId,
        ...values,
        isActive: args.isActive,
      });
    return memberId;
  },
});
export const removeTeamMember = mutation({
  args: { staffId: v.id("staff_members") },
  handler: async (ctx, { staffId }): Promise<void> => {
    const { orgId } = await access(ctx);
    await ctx.runMutation(api.staff.deactivateStaffMember, { orgId, staffId });
  },
});
export const inviteTeamMember = mutation({
  args: { staffId: v.id("staff_members"), email: v.string() },
  handler: async (ctx, { staffId, email: value }): Promise<void> => {
    const { orgId } = await access(ctx);
    const member = await ctx.db.get(staffId);
    if (
      !member ||
      member.orgId !== orgId ||
      member.isDeleted ||
      !member.isActive
    )
      throw new ConvexError("Team member unavailable.");
    const email = normalizeBookingEmail(value);
    if (!isValidBookingEmail(email))
      throw new ConvexError("Enter a valid invitation email.");
    await ctx.runMutation(api.staff.inviteStaffMember, {
      orgId,
      staffId,
      email,
    });
  },
});
