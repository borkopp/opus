import { ConvexError } from "convex/values";
import { Id } from "../_generated/dataModel";
import { QueryCtx } from "../_generated/server";

export async function requireAuth(ctx: QueryCtx, orgId: Id<"orgs">) {
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

    const staffMember = await ctx.db
        .query("staff_members")
        .withIndex("by_org_user", (q) => q.eq("orgId", orgId).eq("userId", user._id))
        .first();

    if (!staffMember || staffMember.isDeleted) {
        throw new ConvexError("Unauthorised");
    }

    return { user, staffMember };
}

export async function requireRole(
    ctx: QueryCtx,
    orgId: Id<"orgs">,
    minRole: "owner" | "manager" | "staff"
) {
    const { user, staffMember } = await requireAuth(ctx, orgId);

    const roleWeights = {
        owner: 3,
        manager: 2,
        staff: 1,
    };

    if (roleWeights[staffMember.role] < roleWeights[minRole]) {
        throw new ConvexError("Unauthorised");
    }

    return { user, staffMember };
}
