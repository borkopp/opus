import { ConvexError, v } from "convex/values";
import type {
  OwnerActivityPage,
  OwnerAuditEntry,
} from "../../shared/owner-overview";
import { query, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { components } from "./_generated/api";
import { requirePlatformOwner } from "./lib/ownerAuth";

async function actorLabel(
  ctx: QueryCtx,
  orgId: Id<"orgs">,
  entry: Doc<"audit_log">,
): Promise<string> {
  if (entry.actorId === "public-booking") return "Guest via booking website";
  if (entry.actorId === "dashboard")
    return "Dashboard · individual not recorded";
  if (entry.actorType === "staff" && entry.actorId) {
    const id = ctx.db.normalizeId("staff_members", entry.actorId);
    const staff = id ? await ctx.db.get(id) : null;
    if (staff?.orgId === orgId && !staff.isDeleted) return staff.displayName;
  }
  if (entry.actorType === "user" && entry.actorId) {
    // Global accounts are resolved only through an indexed membership in this studio.
    const id = ctx.db.normalizeId("users", entry.actorId);
    const membership = id
      ? await ctx.db
          .query("staff_members")
          .withIndex("by_org_user", (q) =>
            q.eq("orgId", orgId).eq("userId", id),
          )
          .first()
      : null;
    const user =
      membership && !membership.isDeleted && id ? await ctx.db.get(id) : null;
    if (user && !user.isDeleted) return user.name;
  }
  const labels: Record<string, string> = {
    ai: "AI",
    system: "System",
    webhook: "Provider webhook",
    opus_user: "Client account",
    user: "User · identity unavailable",
    staff: "Staff · identity unavailable",
  };
  return labels[entry.actorType] ?? "Identity unavailable";
}

// Audit payloads can contain arbitrary integration data. Return only recognized
// non-sensitive scalar changes, never raw before/after objects or auth secrets.
const changeFields = [
  "status",
  "source",
  "startAt",
  "endAt",
  "priceMinorUnits",
  "currency",
  "name",
  "displayName",
  "isActive",
  "websiteStatus",
  "plan",
];
function changes(entry: Doc<"audit_log">): OwnerAuditEntry["changes"] {
  const scalar = (value: unknown): string | null =>
    typeof value === "string"
      ? value.slice(0, 500)
      : typeof value === "number" || typeof value === "boolean"
        ? String(value)
        : null;
  const before =
    entry.before && typeof entry.before === "object" ? entry.before : {};
  const after =
    entry.after && typeof entry.after === "object" ? entry.after : {};
  return changeFields.flatMap((field) => {
    const oldValue = scalar(before[field]);
    const newValue = scalar(after[field]);
    return oldValue === newValue
      ? []
      : [{ field, before: oldValue, after: newValue }];
  });
}

export const page = query({
  args: {
    orgId: v.id("orgs"),
    kind: v.union(v.literal("bookings"), v.literal("audit"), v.literal("team")),
    cursor: v.union(v.string(), v.null()),
    status: v.union(
      v.literal("all"),
      v.literal("confirmed"),
      v.literal("checked_in"),
      v.literal("completed"),
      v.literal("cancelled"),
      v.literal("no_show"),
    ),
  },
  handler: async (ctx, args): Promise<OwnerActivityPage> => {
    await requirePlatformOwner(ctx);
    // orgId selects a report; it never grants authority. Validate the same roots
    // as the overview before any tenant or linked account read.
    const org = await ctx.db.get(args.orgId);
    if (
      !org ||
      org.isDeleted ||
      org.industry !== "beauty_wellness" ||
      (org.source === "scraped" && org.claimStatus !== "claimed")
    ) {
      throw new ConvexError("Business not available in the owner overview.");
    }
    const pagination = {
      cursor: args.cursor,
      numItems: 25,
      maximumBytesRead: 250_000,
    };
    const response: OwnerActivityPage = {
      kind: args.kind,
      collectedAt: Date.now(),
      bookings: [],
      audit: [],
      team: [],
      continueCursor: "",
      isDone: true,
    };
    if (args.kind === "bookings") {
      const indexed =
        args.status === "all"
          ? ctx.db
              .query("bookings")
              .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
          : ctx.db
              .query("bookings")
              .withIndex("by_org_status", (q) =>
                q
                  .eq("orgId", args.orgId)
                  .eq("status", args.status as Doc<"bookings">["status"]),
              );
      const result = await indexed.order("desc").paginate(pagination);
      response.continueCursor = result.continueCursor;
      response.isDone = result.isDone;
      for (const booking of result.page) {
        if (booking.isDeleted) continue;
        const customer = await ctx.db.get(booking.customerId);
        const staff = await ctx.db.get(booking.staffId);
        const services: string[] = [];
        for (const serviceId of booking.serviceIds?.length
          ? booking.serviceIds
          : [booking.serviceId]) {
          const service = await ctx.db.get(serviceId);
          services.push(
            service?.orgId === org._id && !service.isDeleted
              ? service.name
              : "Service unavailable",
          );
        }
        const creation = await ctx.db
          .query("audit_log")
          .withIndex("by_org_resource", (q) =>
            q
              .eq("orgId", org._id)
              .eq("resourceType", "bookings")
              .eq("resourceId", booking._id),
          )
          .filter((q) => q.eq(q.field("action"), "booking.created"))
          .first();
        const client =
          customer?.orgId === org._id && !customer.isDeleted ? customer : null;
        response.bookings.push({
          id: booking._id,
          customer: {
            name: client?.name ?? "Client unavailable",
            email: client?.email ?? null,
            phone: client?.phone ?? null,
          },
          staff:
            staff?.orgId === org._id && !staff.isDeleted
              ? staff.displayName
              : "Staff unavailable",
          services,
          source: booking.source,
          createdBy: creation
            ? await actorLabel(ctx, org._id, creation)
            : "Creator not recorded",
          createdAt: booking.createdAt,
          updatedAt: booking.updatedAt,
          startAt: booking.startAt,
          endAt: booking.endAt,
          status: booking.status,
          priceMinorUnits: booking.priceMinorUnits,
          currency: booking.currency,
          cancellationReason: booking.cancellationReason ?? null,
          customerNote: booking.customerNote ?? null,
          staffNote: booking.staffNote ?? null,
          recoveryOffer: !!booking.gapRecoveryCandidateId,
        });
      }
    } else if (args.kind === "audit") {
      const result = await ctx.db
        .query("audit_log")
        .withIndex("by_org", (q) => q.eq("orgId", org._id))
        .order("desc")
        .paginate(pagination);
      response.continueCursor = result.continueCursor;
      response.isDone = result.isDone;
      for (const entry of result.page) {
        response.audit.push({
          id: entry._id,
          createdAt: entry.createdAt,
          action: entry.action,
          actor: await actorLabel(ctx, org._id, entry),
          actorType: entry.actorType,
          resourceType: entry.resourceType,
          resourceId: entry.resourceId,
          changes: changes(entry),
        });
      }
    } else {
      const result = await ctx.db
        .query("staff_members")
        .withIndex("by_org", (q) => q.eq("orgId", org._id))
        .order("desc")
        .paginate(pagination);
      response.continueCursor = result.continueCursor;
      response.isDone = result.isDone;
      for (const staff of result.page) {
        if (staff.isDeleted) continue;
        const linked = staff.userId ? await ctx.db.get(staff.userId) : null;
        const user = linked && !linked.isDeleted ? linked : null;
        // The auth component's userId index orders createdAt by insertion time.
        // Existing retained sessions are evidence of sign-in, not last activity.
        const sessions = user?.authUserId
          ? await ctx.runQuery(components.betterAuth.adapter.findMany, {
              model: "session",
              where: [
                { field: "userId", operator: "eq", value: user.authUserId },
              ],
              sortBy: { field: "createdAt", direction: "desc" },
              select: ["createdAt", "expiresAt"],
              limit: 1,
              paginationOpts: { cursor: null, numItems: 1 },
            })
          : null;
        const session = sessions?.page[0];
        response.team.push({
          id: staff._id,
          name: staff.displayName,
          email: user?.email ?? null,
          role: staff.role,
          active: staff.isActive,
          linkedAccount: !!user?.authUserId,
          latestRetainedSignInAt: session?.createdAt ?? null,
          sessionExpiresAt: session?.expiresAt ?? null,
        });
      }
    }
    await requirePlatformOwner(ctx);
    return response;
  },
});
