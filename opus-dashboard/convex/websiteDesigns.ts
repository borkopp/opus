import { ConvexError, v } from "convex/values";
import {
  mutation,
  query,
  internalMutation,
  internalQuery,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { requirePaidPlan, requireRole } from "./lib/auth";
import { isAppReviewOrg, requireLiveStudio } from "./lib/appReview";
import { buildPublicProfile } from "./lib/publicProfile";
import { getBeautyActivationState } from "./lib/activation";
import { galleryPhotoLimit } from "./lib/mediaPlanLimits";
import {
  websiteDesignValidator,
  websiteLocale,
  websiteTranslation,
  validateWebsiteDesign,
} from "./lib/websiteDesign";
import {
  defaultWebsiteDesign,
  mergeWebsiteTranslations,
  websiteSources,
  type WebsiteDesign,
  type WebsiteSource,
} from "../../shared/website-design";
import { isLocale } from "../../shared/i18n/locale";
import { getWebsiteStatus } from "./lib/publication";

async function ownerStudio(ctx: Parameters<typeof requireRole>[0]) {
  const auth = await requireRole(ctx, undefined, "owner");
  if (auth.org.industry !== "beauty_wellness")
    throw new ConvexError("Unauthorised");
  return auth;
}

async function findDesign(ctx: Pick<QueryCtx, "db">, orgId: Id<"orgs">) {
  const design = await ctx.db
    .query("website_designs")
    .withIndex("by_org", (q) => q.eq("orgId", orgId))
    .first();
  return design && !design.isDeleted ? design : null;
}

async function audit(
  ctx: MutationCtx,
  orgId: Id<"orgs">,
  actorId: string,
  action: string,
  revision: number,
) {
  await ctx.db.insert("audit_log", {
    orgId,
    actorType: "staff",
    actorId,
    action,
    resourceType: "website_designs",
    resourceId: orgId,
    after: { revision },
    createdAt: Date.now(),
  });
}

async function queueTranslation(
  ctx: MutationCtx,
  document: Doc<"website_designs">,
  design: WebsiteDesign,
  sources: WebsiteSource[],
  target: "draft" | "published",
  actorId: string,
) {
  const now = Date.now();
  const freshWindow =
    !document.translationWindowAt ||
    now - document.translationWindowAt > 86_400_000;
  const count = freshWindow ? 0 : (document.translationCount ?? 0);
  if (count >= 20)
    throw new ConvexError("Translation limit reached. Try again tomorrow.");
  if (
    document.translationStatus === "queued" &&
    now - document.updatedAt < 90_000
  )
    throw new ConvexError("Translations are already being prepared.");
  const job = `${document.revision}:${now}`;
  await ctx.db.patch(document._id, {
    translationJob: job,
    translationStatus: "queued",
    translationWindowAt: freshWindow ? now : document.translationWindowAt,
    translationCount: count + 1,
    updatedAt: now,
  });
  await ctx.scheduler.runAfter(0, internal.websiteTranslations.generate, {
    orgId: document.orgId,
    actorId,
    revision: document.revision,
    job,
    target,
    design,
    sources,
    deadlineAt: now + 5 * 60_000,
  });
  await ctx.scheduler.runAfter(
    6 * 60_000,
    internal.websiteDesigns.expireTranslations,
    { orgId: document.orgId, revision: document.revision, job },
  );
  await audit(
    ctx,
    document.orgId,
    actorId,
    "website.translations_requested",
    document.revision,
  );
}

export const getEditor = query({
  args: {},
  handler: async (ctx) => {
    const { org, orgId } = await ownerStudio(ctx);
    const [site, document, readiness] = await Promise.all([
      buildPublicProfile(ctx, org),
      findDesign(ctx, orgId),
      getBeautyActivationState(ctx, orgId),
    ]);
    const storedLanguage = site.bookingSettings.locale.split("-")[0];
    return {
      site,
      draft:
        document?.draft ??
        defaultWebsiteDesign(isLocale(storedLanguage) ? storedLanguage : "mk"),
      revision: document?.revision ?? 0,
      publishedRevision: document?.publishedRevision ?? null,
      publishedAt: document?.publishedAt ?? null,
      translationStatus: document?.translationStatus ?? "idle",
      canManageLanguages: org.plan === "paid",
      translationAvailable: Boolean(
        process.env.WEBSITE_TRANSLATION_OPENAI_API_KEY ||
        process.env.OPENAI_API_KEY,
      ),
      websitePublished: getWebsiteStatus(org) === "published",
      canPublish: readiness?.allWebsiteRequirementsComplete ?? false,
      galleryLimit: galleryPhotoLimit(org),
    };
  },
});

export const saveDraft = mutation({
  args: { design: websiteDesignValidator, baseRevision: v.number() },
  handler: async (ctx, args): Promise<{ revision: number }> => {
    const { org, orgId, staffMember } = await ownerStudio(ctx);
    const document = await findDesign(ctx, orgId);
    if ((document?.revision ?? 0) !== args.baseRevision)
      throw new ConvexError(
        "The website changed in another window. Reload before saving.",
      );
    if (org.plan !== "paid") {
      const settings = document
        ? null
        : await ctx.db
            .query("org_settings")
            .withIndex("by_org", (q) => q.eq("orgId", orgId))
            .first();
      const locale = settings?.locale.split("-")[0];
      const previous =
        document?.draft ??
        defaultWebsiteDesign(isLocale(locale) ? locale : "mk");
      // Retain locked settings after a downgrade, while allowing other design edits.
      if (
        args.design.primaryLanguage !== previous.primaryLanguage ||
        args.design.autoTranslate !== previous.autoTranslate ||
        JSON.stringify(args.design.languages) !==
          JSON.stringify(previous.languages) ||
        JSON.stringify(args.design.translations) !==
          JSON.stringify(previous.translations)
      )
        requirePaidPlan(org, "Website languages");
    }
    const services = await ctx.db
      .query("services")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .collect();
    validateWebsiteDesign(args.design, new Set(services.map((s) => s._id)));
    const media = await ctx.db
      .query("org_media")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .collect();
    // Keep owned tombstones valid so old drafts and undo history remain editable.
    // Public profiles exclude deleted media and the renderer falls back safely.
    const mediaIds = new Set(media.map((item) => item._id as string));
    if (
      (args.design.hero.imageId && !mediaIds.has(args.design.hero.imageId)) ||
      args.design.gallery.imageIds.length > 20 ||
      new Set(args.design.gallery.imageIds).size !==
        args.design.gallery.imageIds.length ||
      args.design.gallery.imageIds.some((id) => !mediaIds.has(id))
    )
      throw new ConvexError("Choose photos from your own studio.");
    const now = Date.now();
    const revision = args.baseRevision + 1;
    if (document)
      await ctx.db.patch(document._id, {
        draft: args.design,
        revision,
        translationStatus: "idle",
        translationJob: undefined,
        updatedAt: now,
      });
    else
      await ctx.db.insert("website_designs", {
        orgId,
        draft: args.design,
        revision,
        translationStatus: "idle",
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      });
    await audit(ctx, orgId, staffMember._id, "website.draft_saved", revision);
    return { revision };
  },
});

export const publish = mutation({
  args: { revision: v.number() },
  handler: async (ctx, args): Promise<{ revision: number }> => {
    const { org, orgId, staffMember } = await ownerStudio(ctx);
    requireLiveStudio(org);
    const document = await findDesign(ctx, orgId);
    if (!document || document.revision !== args.revision)
      throw new ConvexError("Save your current draft before publishing.");
    await ctx.runMutation(api.website.publish, {});
    const now = Date.now();
    await ctx.db.patch(document._id, {
      published: document.draft,
      publishedRevision: document.revision,
      publishedAt: now,
      updatedAt: now,
    });
    await audit(
      ctx,
      orgId,
      staffMember._id,
      "website.design_published",
      document.revision,
    );
    if (
      org.plan === "paid" &&
      document.draft.autoTranslate &&
      document.draft.languages.length > 1
    ) {
      if (
        document.translationStatus !== "queued" ||
        now - document.updatedAt >= 90_000
      ) {
        const site = await buildPublicProfile(ctx, org);
        // Provider failure or daily limits must never block the original-language website.
        if (
          (document.translationCount ?? 0) < 20 ||
          now - (document.translationWindowAt ?? 0) > 86_400_000
        )
          await queueTranslation(
            ctx,
            { ...document, translationStatus: "idle" },
            document.draft,
            websiteSources(document.draft, site),
            "published",
            staffMember._id,
          );
      }
    }
    return { revision: document.revision };
  },
});

export const translateDraft = mutation({
  args: { revision: v.number() },
  handler: async (ctx, args): Promise<null> => {
    const { org, orgId, staffMember } = await ownerStudio(ctx);
    requireLiveStudio(org);
    requirePaidPlan(org, "Website languages");
    const document = await findDesign(ctx, orgId);
    if (!document || document.revision !== args.revision)
      throw new ConvexError("Save your draft before translating.");
    if (document.draft.languages.length < 2)
      throw new ConvexError("Enable an additional website language first.");
    const site = await buildPublicProfile(ctx, org);
    await queueTranslation(
      ctx,
      document,
      document.draft,
      websiteSources(document.draft, site),
      "draft",
      staffMember._id,
    );
    return null;
  },
});

/** Recheck queued work before each provider request, including after a plan downgrade. */
export const canRunTranslations = internalQuery({
  args: {
    orgId: v.id("orgs"),
    actorId: v.string(),
    revision: v.number(),
    job: v.string(),
  },
  handler: async (ctx, args): Promise<boolean> => {
    const [org, document] = await Promise.all([
      ctx.db.get(args.orgId),
      findDesign(ctx, args.orgId),
    ]);
    if (
      !org ||
      org.isDeleted ||
      org.plan !== "paid" ||
      org.industry !== "beauty_wellness" ||
      isAppReviewOrg(org) ||
      !document ||
      document.revision !== args.revision ||
      document.translationJob !== args.job ||
      document.translationStatus !== "queued"
    )
      return false;
    const membership = await ctx.db
      .query("staff_members")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();
    return membership.some(
      (member) =>
        member._id === args.actorId &&
        member.role === "owner" &&
        member.isActive &&
        !member.isDeleted,
    );
  },
});

export const finishTranslations = internalMutation({
  args: {
    orgId: v.id("orgs"),
    revision: v.number(),
    job: v.string(),
    target: v.union(v.literal("draft"), v.literal("published")),
    actorId: v.string(),
    translations: v.array(
      v.object({
        locale: websiteLocale,
        messages: v.array(websiteTranslation),
      }),
    ),
    failed: v.boolean(),
  },
  handler: async (ctx, args) => {
    const document = await findDesign(ctx, args.orgId);
    if (
      !document ||
      document.translationJob !== args.job ||
      document.revision !== args.revision
    )
      return null;
    const org = await ctx.db.get(args.orgId);
    if (!org || org.isDeleted || org.industry !== "beauty_wellness")
      return null;
    const failed = args.failed || org.plan !== "paid";
    const membership = await ctx.db
      .query("staff_members")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();
    if (
      !membership.some(
        (m) =>
          m._id === args.actorId &&
          m.isActive &&
          !m.isDeleted &&
          m.role === "owner",
      )
    ) {
      await ctx.db.patch(document._id, {
        translationStatus: "failed",
        translationJob: undefined,
        updatedAt: Date.now(),
      });
      return null;
    }
    const site = await buildPublicProfile(ctx, org);
    const services = await ctx.db
      .query("services")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();
    const serviceIds = new Set(services.map((service) => service._id));
    const mergeCurrent = (design: WebsiteDesign) => {
      const sources = new Map(
        websiteSources(design, site).map((s) => [s.key, s.source]),
      );
      for (const translation of args.translations)
        if (
          design.languages.includes(translation.locale) &&
          translation.locale !== design.primaryLanguage
        )
          design = mergeWebsiteTranslations(
            design,
            translation.locale,
            translation.messages
              .filter((m) => sources.get(m.key) === m.source)
              .map((m) => ({ ...m, manual: false })),
          );
      validateWebsiteDesign(design, serviceIds);
      return design;
    };
    const draft = failed ? document.draft : mergeCurrent(document.draft);
    const published =
      !failed &&
      document.publishedRevision === args.revision &&
      document.published
        ? mergeCurrent(document.published)
        : document.published;
    await ctx.db.patch(document._id, {
      draft,
      published,
      translationStatus: failed ? "failed" : "ready",
      translationJob: undefined,
      updatedAt: Date.now(),
    });
    await ctx.db.insert("audit_log", {
      orgId: args.orgId,
      actorType: "ai",
      action: failed
        ? "website.translations_failed"
        : "website.translations_generated",
      resourceType: "website_designs",
      resourceId: document._id,
      after: {
        revision: args.revision,
        translatedLanguages: failed
          ? []
          : args.translations.map((translation) => translation.locale),
      },
      createdAt: Date.now(),
    });
    return null;
  },
});

/** A terminated provider action must not leave the editor waiting indefinitely. */
export const expireTranslations = internalMutation({
  args: { orgId: v.id("orgs"), revision: v.number(), job: v.string() },
  handler: async (ctx, args) => {
    const document = await findDesign(ctx, args.orgId);
    if (
      !document ||
      document.revision !== args.revision ||
      document.translationJob !== args.job ||
      document.translationStatus !== "queued"
    )
      return null;
    await ctx.db.patch(document._id, {
      translationStatus: "failed",
      translationJob: undefined,
      updatedAt: Date.now(),
    });
    await ctx.db.insert("audit_log", {
      orgId: args.orgId,
      actorType: "system",
      action: "website.translations_expired",
      resourceType: "website_designs",
      resourceId: document._id,
      after: { revision: args.revision },
      createdAt: Date.now(),
    });
    return null;
  },
});
