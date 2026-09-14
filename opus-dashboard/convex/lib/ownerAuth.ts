import { ConvexError } from "convex/values";
import { isOwnerEmail } from "../../../shared/owner-access";
import { authComponent } from "../betterAuth";
import type { ActionCtx, QueryCtx } from "../_generated/server";

export async function requirePlatformOwner(ctx: QueryCtx | ActionCtx) {
  // Read the current auth user AND unexpired session, not profile fields or JWT
  // email claims. Revoked sessions and unverified emails must fail immediately.
  const user = await authComponent.safeGetAuthUser(ctx);
  if (!user?.emailVerified || !isOwnerEmail(user.email)) {
    throw new ConvexError("Owner access required");
  }
  return user;
}
