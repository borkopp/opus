import { ConvexError, v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";
import type { QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { requirePaidPlan, requireRole } from "../lib/auth";

export function providerReadiness() {
  return {
    ai:
      process.env.AI_FRONTDESK_ENABLED === "true" &&
      !!(process.env.AI_FRONTDESK_OPENAI_API_KEY || process.env.OPENAI_API_KEY),
    instagram: !!(
      process.env.INSTAGRAM_APP_ID &&
      process.env.INSTAGRAM_APP_SECRET &&
      process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN &&
      process.env.INSTAGRAM_REDIRECT_URI &&
      /^v\d+\.\d+$/.test(process.env.INSTAGRAM_GRAPH_VERSION ?? "") &&
      (process.env.FRONTDESK_TOKEN_SECRET?.length ?? 0) >= 32
    ),
  };
}

export async function connectionForOrg(
  ctx: Pick<QueryCtx, "db">,
  orgId: Id<"orgs">,
) {
  return ctx.db
    .query("ai_instagram_connections")
    .withIndex("by_org", (q) => q.eq("orgId", orgId))
    .unique();
}

export const ownerAccess = internalQuery({
  args: {},
  handler: async (ctx) => {
    const auth = await requireRole(ctx, undefined, "owner");
    requirePaidPlan(auth.org, "AI front desk");
    if (auth.org.industry !== "beauty_wellness")
      throw new ConvexError("AI frontdesk is available for beauty studios.");
    return { orgId: auth.orgId, userId: auth.user._id };
  },
});

export const getStatus = query({
  args: {},
  handler: async (ctx) => {
    const { org, orgId, staffMember } = await requireRole(
      ctx,
      undefined,
      "staff",
    );
    const connection = await connectionForOrg(ctx, orgId);
    const settings = await ctx.db
      .query("org_settings")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .first();
    const provider = providerReadiness();
    const connected =
      connection?.status === "connected" &&
      !!connection.tokenCiphertext &&
      (connection.tokenExpiresAt ?? 0) > Date.now();
    return {
      canManage: staffMember.role === "owner",
      provider,
      connected,
      username: connection?.username,
      tokenExpiresAt: connection?.tokenExpiresAt,
      error: connection?.error,
      lastInboundAt: connection?.lastInboundAt,
      lastSentAt: connection?.lastSentAt,
      ready:
        org.plan === "paid" &&
        org.industry === "beauty_wellness" &&
        provider.ai &&
        provider.instagram &&
        connected &&
        !!settings?.aiEnabled &&
        !!settings.aiInstagramEnabled,
    };
  },
});

export const getInternal = internalQuery({
  args: { orgId: v.id("orgs") },
  handler: (ctx, { orgId }) => connectionForOrg(ctx, orgId),
});

export const beginOAuth = internalMutation({
  args: { orgId: v.id("orgs"), userId: v.id("users"), stateHash: v.string() },
  handler: async (ctx, args) => {
    const existing = await connectionForOrg(ctx, args.orgId);
    const state = {
      oauthStateHash: args.stateHash,
      oauthExpiresAt: Date.now() + 10 * 60_000,
      oauthUserId: args.userId,
      updatedAt: Math.max(Date.now(), (existing?.updatedAt ?? 0) + 1),
    };
    if (existing) await ctx.db.patch(existing._id, state);
    else
      await ctx.db.insert("ai_instagram_connections", {
        orgId: args.orgId,
        status: "disconnected",
        createdAt: Date.now(),
        ...state,
      });
  },
});

export const consumeOAuth = internalMutation({
  args: { orgId: v.id("orgs"), stateHash: v.string() },
  handler: async (ctx, args) => {
    const connection = await connectionForOrg(ctx, args.orgId);
    if (
      !connection ||
      connection.oauthStateHash !== args.stateHash ||
      (connection.oauthExpiresAt ?? 0) <= Date.now() ||
      !connection.oauthUserId
    )
      throw new ConvexError(
        "Instagram connection expired. Try connecting again.",
      );
    const org = await ctx.db.get(args.orgId);
    const staff = await ctx.db
      .query("staff_members")
      .withIndex("by_org_user", (q) =>
        q.eq("orgId", args.orgId).eq("userId", connection.oauthUserId!),
      )
      .first();
    if (
      !org ||
      org.isDeleted ||
      org.plan !== "paid" ||
      org.industry !== "beauty_wellness" ||
      !staff ||
      staff.isDeleted ||
      !staff.isActive ||
      staff.role !== "owner"
    )
      throw new ConvexError("Unauthorised");
    await ctx.db.patch(connection._id, {
      oauthStateHash: undefined,
      oauthExpiresAt: undefined,
      oauthUserId: undefined,
    });
    return {
      userId: connection.oauthUserId,
      connectionId: connection._id,
      version: connection.updatedAt,
    };
  },
});

export const completeOAuth = internalMutation({
  args: {
    orgId: v.id("orgs"),
    userId: v.id("users"),
    version: v.number(),
    accountId: v.string(),
    username: v.string(),
    tokenCiphertext: v.string(),
    tokenExpiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const connection = await connectionForOrg(ctx, args.orgId);
    const org = await ctx.db.get(args.orgId);
    const staff = await ctx.db
      .query("staff_members")
      .withIndex("by_org_user", (q) =>
        q.eq("orgId", args.orgId).eq("userId", args.userId),
      )
      .first();
    if (
      !connection ||
      connection.updatedAt !== args.version ||
      !org ||
      org.isDeleted ||
      org.plan !== "paid" ||
      org.industry !== "beauty_wellness" ||
      !staff ||
      staff.role !== "owner" ||
      staff.isDeleted ||
      !staff.isActive
    )
      throw new ConvexError("Connection changed. Please try again.");
    // Signed-provider routing resolves an organization root first, like tenant
    // slug routing. Every tenant-owned read after this uses its orgId index.
    const other = await ctx.db
      .query("orgs")
      .withIndex("by_frontdesk_instagram", (q) =>
        q.eq("instagramFrontdeskAccountId", args.accountId),
      )
      .unique();
    if (other && other._id !== args.orgId)
      throw new ConvexError(
        "This Instagram account is already connected to another studio.",
      );
    await ctx.db.patch(connection._id, {
      accountId: args.accountId,
      username: args.username,
      tokenCiphertext: args.tokenCiphertext,
      tokenExpiresAt: args.tokenExpiresAt,
      status: "connected",
      error: undefined,
      updatedAt: Date.now(),
    });
    await ctx.db.patch(args.orgId, {
      instagramFrontdeskAccountId: args.accountId,
      updatedAt: Date.now(),
    });
    await ctx.db.insert("audit_log", {
      orgId: args.orgId,
      actorType: "staff",
      actorId: staff._id,
      action: "ai.instagram_connected",
      resourceType: "ai_instagram_connections",
      resourceId: connection._id,
      after: { username: args.username },
      createdAt: Date.now(),
    });
  },
});

export const disconnect = mutation({
  args: {},
  handler: async (ctx) => {
    const { orgId, staffMember } = await requireRole(ctx, undefined, "owner");
    const connection = await connectionForOrg(ctx, orgId);
    if (!connection) return;
    await ctx.db.patch(connection._id, {
      status: "disconnected",
      tokenCiphertext: undefined,
      tokenExpiresAt: undefined,
      oauthStateHash: undefined,
      oauthExpiresAt: undefined,
      oauthUserId: undefined,
      error: undefined,
      updatedAt: Date.now(),
    });
    await ctx.db.patch(orgId, {
      instagramFrontdeskAccountId: undefined,
      updatedAt: Date.now(),
    });
    await ctx.db.insert("audit_log", {
      orgId,
      actorType: "staff",
      actorId: staffMember._id,
      action: "ai.instagram_disconnected",
      resourceType: "ai_instagram_connections",
      resourceId: connection._id,
      createdAt: Date.now(),
    });
  },
});

export const refreshToken = internalMutation({
  args: {
    orgId: v.id("orgs"),
    previousCiphertext: v.string(),
    tokenCiphertext: v.string(),
    tokenExpiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const connection = await connectionForOrg(ctx, args.orgId);
    if (
      !connection ||
      connection.status !== "connected" ||
      connection.tokenCiphertext !== args.previousCiphertext
    )
      return false;
    await ctx.db.patch(connection._id, {
      tokenCiphertext: args.tokenCiphertext,
      tokenExpiresAt: args.tokenExpiresAt,
      updatedAt: Date.now(),
    });
    return true;
  },
});

export const flagError = internalMutation({
  args: { orgId: v.id("orgs"), previousCiphertext: v.string() },
  handler: async (ctx, args) => {
    const connection = await connectionForOrg(ctx, args.orgId);
    if (!connection || connection.tokenCiphertext !== args.previousCiphertext)
      return;
    await ctx.db.patch(connection._id, {
      status: "error",
      error: "Reconnect Instagram to restore messaging.",
      updatedAt: Date.now(),
    });
    await ctx.db.insert("audit_log", {
      orgId: args.orgId,
      actorType: "system",
      action: "ai.instagram_connection_failed",
      resourceType: "ai_instagram_connections",
      resourceId: connection._id,
      createdAt: Date.now(),
    });
  },
});
