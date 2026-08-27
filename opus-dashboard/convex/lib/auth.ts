import { ConvexError } from "convex/values";
import { Id } from "../_generated/dataModel";
import { QueryCtx } from "../_generated/server";

export async function requireUser(ctx: QueryCtx) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
        throw new ConvexError("Unauthenticated");
    }

    const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
        .first();

    if (!user || user.isDeleted) {
        throw new ConvexError("Unauthorised");
    }

    return { identity, user };
}

export async function requireActiveOrg(
    ctx: QueryCtx,
    expectedOrgId?: Id<"orgs">,
) {
    const { identity, user } = await requireUser(ctx);

    let activeOrgId = user.activeOrgId;

    // Development data may predate activeOrgId. Resolve a single valid
    // membership for this request without trusting a client-provided tenant.
    if (!activeOrgId) {
        const memberships = await ctx.db
            .query("staff_members")
            .withIndex("by_user", (q) => q.eq("userId", user._id))
            .collect();

        const activeMembership = memberships.find(
            (membership) => !membership.isDeleted && membership.isActive,
        );
        activeOrgId = activeMembership?.orgId;
    }

    if (!activeOrgId) {
        throw new ConvexError("No active business");
    }

    if (expectedOrgId && expectedOrgId !== activeOrgId) {
        throw new ConvexError("Unauthorised");
    }

    const org = await ctx.db.get(activeOrgId);
    if (!org || org.isDeleted) {
        throw new ConvexError("Business not found");
    }

    const staffMember = await ctx.db
        .query("staff_members")
        .withIndex("by_org_user", (q) =>
            q.eq("orgId", activeOrgId).eq("userId", user._id),
        )
        .first();

    if (!staffMember || staffMember.isDeleted || !staffMember.isActive) {
        throw new ConvexError("Unauthorised");
    }

    return { identity, user, org, orgId: activeOrgId, staffMember };
}

export async function requireAuth(
    ctx: QueryCtx,
    expectedOrgId?: Id<"orgs">,
) {
    return await requireActiveOrg(ctx, expectedOrgId);
}

export async function requireRole(
    ctx: QueryCtx,
    expectedOrgId: Id<"orgs"> | undefined,
    minRole: "owner" | "manager" | "staff"
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
