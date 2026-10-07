import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { requireActiveOrg } from "./auth";

/** Missing access preserves existing accounts; newly invited staff use own. */
export function hasPersonalBookingAccess(
  staff: Pick<Doc<"staff_members">, "role" | "bookingAccess">,
) {
  return staff.role === "staff" && staff.bookingAccess === "own";
}

export async function requireBookingAccess(
  ctx: QueryCtx,
  orgId?: Id<"orgs">,
  staffId?: Id<"staff_members">,
) {
  const auth = await requireActiveOrg(ctx, orgId);
  if (staffId) {
    const target = await ctx.db.get(staffId);
    if (!target || target.orgId !== auth.orgId || target.isDeleted)
      throw new ConvexError("Staff member not available.");
    if (
      hasPersonalBookingAccess(auth.staffMember) &&
      staffId !== auth.staffMember._id
    )
      throw new ConvexError("You can only access your own appointments.");
  }
  return auth;
}

export function assertBookingAccess(
  auth: Awaited<ReturnType<typeof requireActiveOrg>>,
  booking: Pick<Doc<"bookings">, "orgId" | "staffId">,
) {
  if (
    booking.orgId !== auth.orgId ||
    (hasPersonalBookingAccess(auth.staffMember) &&
      booking.staffId !== auth.staffMember._id)
  )
    throw new ConvexError("You can only access your own appointments.");
}
