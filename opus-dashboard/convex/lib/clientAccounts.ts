import { ConvexError } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { isActiveIndustry } from "./productScope";

export async function requireClientAccounts(ctx: QueryCtx, orgId: Id<"orgs">) {
  const org = await ctx.db.get(orgId);
  if (!org || org.isDeleted || !isActiveIndustry(org.industry))
    throw new ConvexError("This business is not currently accepting bookings.");
  const settings = await ctx.db
    .query("org_settings")
    .withIndex("by_org", (q) => q.eq("orgId", orgId))
    .first();
  if (!settings) throw new ConvexError("Studio settings are unavailable.");
  return settings;
}

export async function hashClientClaimToken(token: string) {
  if (!/^[a-f0-9-]{73}$/.test(token)) return null;
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export async function createClientClaimToken() {
  const token = `${crypto.randomUUID()}-${crypto.randomUUID()}`;
  const hash = await hashClientClaimToken(token);
  if (!hash) throw new Error("Could not create an appointment claim token.");
  return { token, hash, expiresAt: Date.now() + 7 * 86_400_000 };
}

export function clientClaimUrl(bookingId: Id<"bookings">, token: string) {
  const url = new URL(
    "/account",
    process.env.SITE_URL || "https://studio.opus.mk",
  );
  url.searchParams.set("claim", bookingId);
  // Fragments never reach server access logs or HTTP Referrer headers.
  url.hash = new URLSearchParams({ proof: token }).toString();
  return url.toString();
}
