import { ConvexError, v } from "convex/values";
import { internalMutation, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireRole } from "./lib/auth";
import {
  MAX_IMPORT_SERVICES,
  normalizeServiceName,
  serviceImportRow,
} from "./lib/serviceImport";

export const reserve = internalMutation({
  args: {},
  handler: async (ctx) => {
    const { org, staffMember } = await requireRole(ctx, undefined, "owner");
    if (org.industry !== "beauty_wellness")
      throw new ConvexError("Unauthorised");
    const settings = await ctx.db
      .query("org_settings")
      .withIndex("by_org", (q) => q.eq("orgId", org._id))
      .first();
    if (!settings) throw new ConvexError("Booking settings not found.");
    const recent = await ctx.db
      .query("service_imports")
      .withIndex("by_org", (q) => q.eq("orgId", org._id))
      .order("desc")
      .take(10);
    const now = Date.now();
    if (
      recent.some(
        (row) => row.createdAt > now - 90_000 && row.status === "extracting",
      )
    ) {
      throw new ConvexError(
        "A photo is already being read. Try again in a moment.",
      );
    }
    if (recent.filter((row) => row.createdAt > now - 86_400_000).length >= 10) {
      throw new ConvexError(
        "Photo limit reached. Try again tomorrow or add services manually.",
      );
    }
    const importId = await ctx.db.insert("service_imports", {
      orgId: org._id,
      staffId: staffMember._id,
      status: "extracting",
      rows: [],
      serviceIds: [],
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("audit_log", {
      orgId: org._id,
      actorType: "staff",
      actorId: staffMember._id,
      action: "services.photo_requested",
      resourceType: "service_imports",
      resourceId: importId,
      createdAt: now,
    });
    return {
      importId,
      orgId: org._id,
      category: org.beautyCategory,
      currency: settings.currency,
      slotMins: settings.slotDurationMins,
    };
  },
});

export const finish = internalMutation({
  args: {
    orgId: v.id("orgs"),
    importId: v.id("service_imports"),
    rows: v.array(serviceImportRow),
    failed: v.boolean(),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db
      .query("service_imports")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.eq(q.field("_id"), args.importId))
      .first();
    if (!job || job.status !== "extracting" || job.isDeleted) return;
    await ctx.db.patch(job._id, {
      status: args.failed ? "failed" : "ready",
      rows: args.rows,
      updatedAt: Date.now(),
    });
    await ctx.db.insert("audit_log", {
      orgId: job.orgId,
      actorType: "ai",
      action: args.failed
        ? "services.photo_failed"
        : "services.photo_extracted",
      resourceType: "service_imports",
      resourceId: job._id,
      after: { count: args.rows.length },
      createdAt: Date.now(),
    });
  },
});

export const confirm = mutation({
  args: {
    importId: v.id("service_imports"),
    reviewed: v.boolean(),
    services: v.array(
      v.object({
        name: v.string(),
        priceMinorUnits: v.number(),
        durationMins: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const { org, staffMember } = await requireRole(ctx, undefined, "owner");
    if (org.industry !== "beauty_wellness")
      throw new ConvexError("Unauthorised");
    const job = await ctx.db
      .query("service_imports")
      .withIndex("by_org", (q) => q.eq("orgId", org._id))
      .filter((q) => q.eq(q.field("_id"), args.importId))
      .first();
    if (!job || job.isDeleted || job.staffId !== staffMember._id)
      throw new ConvexError("Import not found.");
    if (job.status === "imported") return job.serviceIds;
    if (job.status !== "ready" || !args.reviewed)
      throw new ConvexError(
        "Review the prices and durations before adding services.",
      );
    if (!args.services.length || args.services.length > MAX_IMPORT_SERVICES)
      throw new ConvexError("Choose between 1 and 50 services.");
    const settings = await ctx.db
      .query("org_settings")
      .withIndex("by_org", (q) => q.eq("orgId", org._id))
      .first();
    if (!settings) throw new ConvexError("Booking settings not found.");
    const existing = await ctx.db
      .query("services")
      .withIndex("by_org", (q) => q.eq("orgId", org._id))
      .collect();
    const names = new Set(
      existing
        .filter((s) => !s.isDeleted)
        .map((s) => normalizeServiceName(s.name)),
    );
    for (const service of args.services) {
      if (
        service.name.trim().length < 2 ||
        service.name.trim().length > 120 ||
        !Number.isSafeInteger(service.priceMinorUnits) ||
        service.priceMinorUnits < 0 ||
        service.priceMinorUnits > 100_000_000 ||
        !Number.isInteger(service.durationMins) ||
        service.durationMins <= 0 ||
        service.durationMins > 720 ||
        service.durationMins % settings.slotDurationMins !== 0
      ) {
        throw new ConvexError("Check every service name, price and duration.");
      }
      const name = normalizeServiceName(service.name);
      if (names.has(name))
        throw new ConvexError(
          "A service with this name already exists. Rename it or remove it from the import.",
        );
      names.add(name);
    }
    const now = Date.now();
    const serviceIds = [];
    const sortStart = Math.max(-1, ...existing.map((s) => s.sortOrder)) + 1;
    for (const [index, service] of args.services.entries()) {
      const fields = {
        ...service,
        name: service.name.trim(),
        currency: settings.currency,
        staffIds: [staffMember._id],
        isOpusVisible: true,
        isActive: true,
        isDeleted: false,
        popularityScore: 0,
        sortOrder: sortStart + index,
        createdAt: now,
        updatedAt: now,
      };
      const serviceId = await ctx.db.insert("services", {
        orgId: org._id,
        ...fields,
      });
      serviceIds.push(serviceId);
      await ctx.db.insert("audit_log", {
        orgId: org._id,
        actorType: "staff",
        actorId: staffMember._id,
        action: "services.photo_imported",
        resourceType: "services",
        resourceId: serviceId,
        after: { ...fields, importId: job._id },
        createdAt: now,
      });
      await ctx.scheduler.runAfter(
        0,
        internal.marketplace.embeddings.embedEntity,
        { entityType: "service", entityId: serviceId },
      );
    }
    await ctx.db.patch(job._id, {
      status: "imported",
      serviceIds,
      updatedAt: now,
    });
    await ctx.runMutation(internal.publication.recomputeWebsiteStatus, {
      orgId: org._id,
    });
    return serviceIds;
  },
});
