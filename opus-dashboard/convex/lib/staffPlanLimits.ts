import { ConvexError } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

const FREE_STAFF_LIMIT = 3;
const FREE_OWNER_LIMIT = 1;

export async function getStaffPlanStatusForOrg(
  ctx: QueryCtx,
  org: Doc<"orgs">,
  existingStaff?: Doc<"staff_members">,
) {
  const activeStaff = await ctx.db
    .query("staff_members")
    .withIndex("by_org_active", (q) =>
      q.eq("orgId", org._id).eq("isActive", true).eq("isDeleted", false),
    )
    .collect();
  const ownerCount = activeStaff.filter(
    (member) => member.role === "owner",
  ).length;
  const staffCount = activeStaff.length - ownerCount;
  const existingIsActive = Boolean(
    existingStaff?.isActive && !existingStaff.isDeleted,
  );

  function canUseRole(role: "owner" | "staff") {
    if (org.plan === "paid") return true;
    const nextOwners =
      ownerCount -
      (existingIsActive && existingStaff?.role === "owner" ? 1 : 0) +
      (role === "owner" ? 1 : 0);
    const nextStaff =
      staffCount -
      (existingIsActive && existingStaff?.role !== "owner" ? 1 : 0) +
      (role !== "owner" ? 1 : 0);
    const nextTotal = nextOwners + nextStaff;

    // Existing teams above the limit may still edit profiles and reduce their
    // usage. Only changes that increase an over-limit count are blocked.
    return (
      !(nextOwners > FREE_OWNER_LIMIT && nextOwners > ownerCount) &&
      !(nextStaff > FREE_STAFF_LIMIT && nextStaff > staffCount) &&
      !(
        nextTotal > FREE_OWNER_LIMIT + FREE_STAFF_LIMIT &&
        nextTotal > activeStaff.length
      )
    );
  }

  return {
    isFree: org.plan !== "paid",
    staffCount,
    ownerCount,
    staffLimit: FREE_STAFF_LIMIT,
    ownerLimit: FREE_OWNER_LIMIT,
    totalLimit: FREE_STAFF_LIMIT + FREE_OWNER_LIMIT,
    canUseStaffRole: canUseRole("staff"),
    canUseOwnerRole: canUseRole("owner"),
  };
}

export async function requireStaffPlanCapacity(
  ctx: QueryCtx,
  org: Doc<"orgs">,
  role: Doc<"staff_members">["role"],
  existingStaff?: Doc<"staff_members">,
) {
  if (org.plan === "paid") return;
  const status = await getStaffPlanStatusForOrg(ctx, org, existingStaff);
  const allowed =
    role === "owner" ? status.canUseOwnerRole : status.canUseStaffRole;
  if (!allowed) {
    throw new ConvexError({
      code: "FREE_STAFF_LIMIT",
      message:
        "The Free plan allows 1 active owner and up to 3 active staff members (4 people total). Deactivate a team member or upgrade to OPUS Pro to add more.",
    });
  }
}
