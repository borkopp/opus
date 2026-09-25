import { ConvexError, v } from "convex/values";
import { mutation, query, type QueryCtx } from "./_generated/server";
import { requireActiveOrg, requireRole } from "./lib/auth";
import { getBeautyActivationState } from "./lib/activation";
import { buildPublicProfile } from "./lib/publicProfile";
import { isActiveIndustry } from "./lib/productScope";
import { isWebsitePublished } from "./lib/publication";
import { isWithinPublicBookingWindow } from "./lib/publicBookingRules";
import { wallClockNow } from "./lib/bookingTime";
import { tenantSiteUrl } from "./lib/tenantSites";
import { computeSlotsForDate } from "./slots";
import {
  MAX_SAVED_REPLIES,
  renderReplyTemplate,
  starterReplies,
  unsupportedReplyTokens,
  type ReplyValues,
} from "./lib/promotionTemplates";

const language = v.union(v.literal("mk"), v.literal("en"));

async function promotionContext(ctx: QueryCtx) {
  const auth = await requireActiveOrg(ctx);
  if (!isActiveIndustry(auth.org.industry))
    throw new ConvexError("Promotion tools are available for beauty studios.");
  return auth;
}

export const getWorkspace = query({
  args: { language },
  handler: async (ctx, args) => {
    const { org, orgId, staffMember } = await promotionContext(ctx);
    const [profile, readiness, replies] = await Promise.all([
      buildPublicProfile(ctx, org),
      getBeautyActivationState(ctx, orgId),
      ctx.db
        .query("saved_replies")
        .withIndex("by_org_active", (q) =>
          q.eq("orgId", orgId).eq("isDeleted", false),
        )
        .take(MAX_SAVED_REPLIES),
    ]);
    const published =
      isWebsitePublished(org) && Boolean(readiness?.allRequiredComplete);
    const websiteUrl = tenantSiteUrl(
      org.slug,
      process.env.ROOT_DOMAIN || "opus.mk",
    );
    const bookingUrl = `${websiteUrl}/book`;
    const mk = args.language === "mk";
    const days = mk
      ? [
          "Понеделник",
          "Вторник",
          "Среда",
          "Четврток",
          "Петок",
          "Сабота",
          "Недела",
        ]
      : [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ];
    const values: ReplyValues = {
      studio_name: org.name,
      booking_link: published ? bookingUrl : "",
      address: [org.address, org.city].filter(Boolean).join(", "),
      phone: org.phone || "",
      hours: [...(org.openingHours || [])]
        .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
        .map(
          (day) =>
            `${days[day.dayOfWeek]}: ${day.isClosed ? (mk ? "затворено" : "closed") : `${day.open}–${day.close}`}`,
        )
        .join("\n"),
      services: profile.services
        .map(
          (service) =>
            `${service.name} · ${new Intl.NumberFormat(mk ? "mk-MK" : "en-GB", { style: "currency", currency: service.currency, maximumFractionDigits: 2 }).format(service.priceMinorUnits / 100)} · ${service.durationMins} ${mk ? "мин" : "min"}`,
        )
        .join("\n"),
    };
    const today = new Date(wallClockNow(profile.bookingSettings.timezone))
      .toISOString()
      .slice(0, 10);
    const maxDate = new Date(
      new Date(`${today}T00:00:00Z`).getTime() +
        (Math.max(1, profile.bookingSettings.bookingWindowDays) - 1) *
          86_400_000,
    )
      .toISOString()
      .slice(0, 10);
    return {
      orgId,
      name: org.name,
      slug: org.slug,
      published,
      websiteUrl,
      bookingUrl,
      address: values.address,
      today,
      maxDate,
      canManageReplies: staffMember.role !== "staff",
      services: profile.services.map((service) => ({
        id: service._id,
        name: service.name,
        staffIds: service.staffIds,
        durationMins: service.durationMins,
        priceMinorUnits: service.priceMinorUnits,
        currency: service.currency,
      })),
      staff: profile.staff.map((member) => ({
        id: member._id,
        name: member.displayName,
      })),
      values,
      starters: starterReplies(args.language).map((reply) => ({
        ...reply,
        ...renderReplyTemplate(reply.body, values),
      })),
      replies: replies
        .filter((reply) => reply.language === args.language)
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .map((reply) => ({
          id: reply._id,
          title: reply.title,
          body: reply.body,
          language: reply.language,
          updatedAt: reply.updatedAt,
          ...renderReplyTemplate(reply.body, values),
        })),
    };
  },
});

// Uses exactly the same availability engine, notice, buffers and booking window
// as guest booking. A graphic never reserves capacity or changes a booking.
export const getOpenings = query({
  args: {
    serviceId: v.id("services"),
    staffId: v.union(v.id("staff_members"), v.literal("any")),
    date: v.string(),
    refreshMinute: v.number(),
  },
  handler: async (ctx, args) => {
    const { org, orgId } = await promotionContext(ctx);
    const state = await getBeautyActivationState(ctx, orgId);
    if (
      !isWebsitePublished(org) ||
      !state?.allRequiredComplete ||
      !state.settings
    )
      return [];
    const service = await ctx.db.get(args.serviceId);
    if (
      !service ||
      service.orgId !== orgId ||
      !service.isActive ||
      service.isDeleted ||
      !service.isOpusVisible
    )
      return [];
    if (
      !isWithinPublicBookingWindow(
        args.date,
        state.settings.timezone,
        state.settings.bookingWindowDays,
      )
    )
      return [];
    const slots = await computeSlotsForDate(
      ctx,
      orgId,
      args.staffId,
      args.serviceId,
      args.date,
    );
    return slots.map((slot) => ({
      startAt: slot.startAt,
      endAt: slot.endAt,
      priceMinorUnits: slot.priceMinorUnits,
      currency: service.currency,
      staffId: slot.availableStaffIds[0],
    }));
  },
});

export const saveReply = mutation({
  args: {
    id: v.optional(v.id("saved_replies")),
    title: v.string(),
    body: v.string(),
    language,
    expectedUpdatedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { org, orgId, staffMember } = await requireRole(
      ctx,
      undefined,
      "manager",
    );
    if (!isActiveIndustry(org.industry))
      throw new ConvexError(
        "Promotion tools are available for beauty studios.",
      );
    const title = args.title.trim(),
      body = args.body.trim();
    if (!title || title.length > 80 || !body || body.length > 2000)
      throw new ConvexError(
        "Enter a title up to 80 characters and a reply up to 2,000 characters.",
      );
    if (unsupportedReplyTokens(body).length)
      throw new ConvexError(
        "Use one of the supported studio details in your reply.",
      );
    const existing = args.id ? await ctx.db.get(args.id) : null;
    if (
      args.id &&
      (!existing || existing.orgId !== orgId || existing.isDeleted)
    )
      throw new ConvexError("Reply not found.");
    if (existing && existing.updatedAt !== args.expectedUpdatedAt)
      throw new ConvexError(
        "This reply changed. Close the editor and reopen it to use the latest version.",
      );
    if (!existing) {
      const active = await ctx.db
        .query("saved_replies")
        .withIndex("by_org_active", (q) =>
          q.eq("orgId", orgId).eq("isDeleted", false),
        )
        .take(MAX_SAVED_REPLIES);
      if (active.length >= MAX_SAVED_REPLIES)
        throw new ConvexError(
          "Your studio can save up to 50 replies. Remove an unused reply first.",
        );
    }
    const now = Math.max(Date.now(), (existing?.updatedAt || 0) + 1);
    const fields = {
      title,
      body,
      language: args.language,
      updatedBy: staffMember._id,
      updatedAt: now,
    };
    const id = existing
      ? existing._id
      : await ctx.db.insert("saved_replies", {
          ...fields,
          orgId,
          isDeleted: false,
          createdAt: now,
        });
    if (existing) await ctx.db.patch(existing._id, fields);
    await ctx.db.insert("audit_log", {
      orgId,
      actorType: "staff",
      actorId: staffMember._id,
      action: existing ? "promotion.reply.updated" : "promotion.reply.created",
      resourceType: "saved_replies",
      resourceId: id,
      before: existing
        ? {
            title: existing.title,
            body: existing.body,
            language: existing.language,
          }
        : null,
      after: { title, body, language: args.language },
      createdAt: now,
    });
    return id;
  },
});

export const removeReply = mutation({
  args: { id: v.id("saved_replies"), expectedUpdatedAt: v.number() },
  handler: async (ctx, args) => {
    const { org, orgId, staffMember } = await requireRole(
      ctx,
      undefined,
      "manager",
    );
    if (!isActiveIndustry(org.industry))
      throw new ConvexError(
        "Promotion tools are available for beauty studios.",
      );
    const reply = await ctx.db.get(args.id);
    if (!reply || reply.orgId !== orgId || reply.isDeleted)
      throw new ConvexError("Reply not found.");
    if (reply.updatedAt !== args.expectedUpdatedAt)
      throw new ConvexError(
        "This reply changed. Reopen it before removing it.",
      );
    const now = Math.max(Date.now(), reply.updatedAt + 1);
    await ctx.db.patch(reply._id, {
      isDeleted: true,
      deletedAt: now,
      updatedAt: now,
      updatedBy: staffMember._id,
    });
    await ctx.db.insert("audit_log", {
      orgId,
      actorType: "staff",
      actorId: staffMember._id,
      action: "promotion.reply.removed",
      resourceType: "saved_replies",
      resourceId: reply._id,
      before: { title: reply.title, body: reply.body },
      after: { isDeleted: true },
      createdAt: now,
    });
  },
});
