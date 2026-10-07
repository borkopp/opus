import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { QueryCtx } from "../_generated/server";
import {
  appReviewBindings,
  assertAppReviewUser,
  isAppReviewEmail,
  isAppReviewOrg,
} from "./appReview";

export type PaidFeature =
  | "Gap optimizer"
  | "AI front desk"
  | "SMS notifications"
  | "Client directory"
  | "Client email reminders"
  | "Staff accounts";

export function requirePaidPlan(
  org: Pick<Doc<"orgs">, "plan"> & Partial<Pick<Doc<"orgs">, "_id" | "slug">>,
  feature: PaidFeature,
): void {
  if ((org._id && isAppReviewOrg(org._id)) || org.slug === "opus-app-review") {
    if (
      ["Gap optimizer", "AI front desk", "SMS notifications"].includes(feature)
    )
      throw new ConvexError(
        "This action is unavailable in the App Review demo studio.",
      );
  }
  if (org.plan !== "paid") {
    throw new ConvexError(`${feature} requires the paid plan.`);
  }
}

export async function requireUser(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("Unauthenticated");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_auth_user_id", (q) => q.eq("authUserId", identity.subject))
    .first();

  if (!user || user.isDeleted) {
    throw new ConvexError("Unauthorised");
  }
  assertAppReviewUser(identity, user);

  return { identity, user };
}

/** Resolve only this authenticated user's active memberships, including revocation fallback. */
export async function resolveActiveMembership(
  ctx: QueryCtx,
  user: Doc<"users">,
) {
  if (isAppReviewEmail(user.email)) {
    const binding = appReviewBindings();
    const orgId = binding.orgId
      ? ctx.db.normalizeId("orgs", binding.orgId)
      : null;
    if (
      !orgId ||
      user._id !== binding.userId ||
      user.authUserId !== binding.authUserId ||
      user.activeOrgId !== orgId
    )
      return null;
    const org = await ctx.db.get(orgId);
    if (
      !org ||
      org.isDeleted ||
      org.slug !== "opus-app-review" ||
      org.industry !== "beauty_wellness"
    )
      return null;
    const staffMember = await ctx.db
      .query("staff_members")
      .withIndex("by_org_user", (q) =>
        q.eq("orgId", orgId).eq("userId", user._id),
      )
      .first();
    return staffMember && !staffMember.isDeleted && staffMember.isActive
      ? { org, orgId, staffMember }
      : null;
  }
  const memberships = await ctx.db
    .query("staff_members")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .collect();
  const active = memberships.filter(
    (member) => !member.isDeleted && member.isActive,
  );
  const preferred = active.find((member) => member.orgId === user.activeOrgId);
  const candidates = preferred
    ? [preferred, ...active.filter((member) => member._id !== preferred._id)]
    : active;
  for (const staffMember of candidates) {
    const org = await ctx.db.get(staffMember.orgId);
    if (org && !org.isDeleted && !isAppReviewOrg(org))
      return { org, orgId: org._id, staffMember };
  }
  return null;
}

export async function requireActiveOrg(
  ctx: QueryCtx,
  expectedOrgId?: Id<"orgs">,
) {
  const { identity, user } = await requireUser(ctx);
  const membership = await resolveActiveMembership(ctx, user);
  if (!membership)
    throw new ConvexError(
      user.activeOrgId ? "Unauthorised" : "No active business",
    );
  if (expectedOrgId && expectedOrgId !== membership.orgId)
    throw new ConvexError("Unauthorised");
  return { identity, user, ...membership };
}

export async function requireAuth(ctx: QueryCtx, expectedOrgId?: Id<"orgs">) {
  const auth = await requireActiveOrg(ctx, expectedOrgId);
  if (
    auth.staffMember.role === "staff" &&
    auth.staffMember.bookingAccess === "own"
  ) {
    throw new ConvexError(
      "Your account has access to your own appointments only.",
    );
  }
  return auth;
}

export async function requireRole(
  ctx: QueryCtx,
  expectedOrgId: Id<"orgs"> | undefined,
  minRole: "owner" | "manager" | "staff",
) {
  const auth = await requireAuth(ctx, expectedOrgId);
  const { staffMember } = auth;

  const roleWeights = {
    owner: 3,
    manager: 2,
    staff: 1,
  };

  if (roleWeights[staffMember.role] < roleWeights[minRole]) {
    throw new ConvexError("Unauthorised");
  }

  return auth;
}
