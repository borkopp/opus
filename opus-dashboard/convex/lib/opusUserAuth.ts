import { ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { rejectAppReviewIdentity } from "./appReview";

export async function getCurrentOpusUser(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  rejectAppReviewIdentity(identity);

  const user = await ctx.db
    .query("opus_users")
    .withIndex("by_auth_user_id", (q) => q.eq("authUserId", identity.subject))
    .first();

  if (!user || user.isDeleted) return null;
  return { identity, user };
}

export async function requireCurrentOpusUser(ctx: QueryCtx) {
  const current = await getCurrentOpusUser(ctx);
  if (!current) {
    throw new ConvexError("Unauthenticated");
  }
  return current;
}

export async function ensureCurrentOpusUser(ctx: MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("Unauthenticated");
  rejectAppReviewIdentity(identity);
  if (identity.emailVerified === false)
    throw new ConvexError(
      "Verify your account email before booking or linking appointments.",
    );

  const authUserId = identity.subject;
  const email = identity.email?.trim().toLowerCase();
  if (!email) {
    throw new ConvexError("Authenticated account has no verified email");
  }
  const name = identity.name?.trim() || email.split("@")[0] || "OPUS user";

  const current = await getCurrentOpusUser(ctx);
  if (current) {
    const updates = {
      email,
      phone: identity.phoneNumber ?? current.user.phone,
      avatarUrl: identity.pictureUrl ?? current.user.avatarUrl,
      updatedAt: Date.now(),
    };
    await ctx.db.patch(current.user._id, updates);
    return { ...current.user, ...updates };
  }

  const erasedIdentity = await ctx.db
    .query("opus_users")
    .withIndex("by_auth_user_id", (q) => q.eq("authUserId", authUserId))
    .first();
  if (erasedIdentity?.isDeleted) throw new ConvexError("Account unavailable");

  const emailMatches = await ctx.db
    .query("opus_users")
    .withIndex("by_email", (q) => q.eq("email", email))
    .collect();
  const activeEmailMatches = emailMatches.filter((user) => !user.isDeleted);

  if (activeEmailMatches.length > 1) {
    throw new ConvexError("Multiple accounts use this email");
  }

  const legacy = activeEmailMatches[0];
  if (legacy) {
    if (legacy.authUserId && legacy.authUserId !== authUserId) {
      throw new ConvexError("Account email is already linked");
    }
    await ctx.db.patch(legacy._id, {
      authUserId,
      email,
      phone: identity.phoneNumber ?? legacy.phone,
      avatarUrl: identity.pictureUrl ?? legacy.avatarUrl,
      updatedAt: Date.now(),
    });
    const linked = await ctx.db.get(legacy._id);
    if (!linked) throw new Error("Linked OPUS account was not found");
    return linked;
  }

  if (emailMatches.some((user) => user.isDeleted)) {
    throw new ConvexError("Account unavailable");
  }

  const userId = await ctx.db.insert("opus_users", {
    authUserId,
    email,
    name,
    phone: identity.phoneNumber,
    avatarUrl: identity.pictureUrl,
    opusPoints: 0,
    tier: "bronze",
    marketingOptIn: false,
    isDeleted: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  const created = await ctx.db.get(userId);
  if (!created) throw new Error("Created OPUS account was not found");
  return created;
}
