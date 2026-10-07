import { ConvexError } from "convex/values";
import type { UserIdentity } from "convex/server";
import type { Doc } from "../_generated/dataModel";

// Reserved operational fixtures. These values grant no access by themselves.
export const APP_REVIEW_EMAIL = "app-review@opus.mk";
export const APP_REVIEW_SLUG = "opus-app-review";

export function isAppReviewEmail(email: string | undefined) {
  return email?.trim().toLowerCase() === APP_REVIEW_EMAIL;
}

export function appReviewBindings() {
  return {
    orgId: process.env.APP_REVIEW_ORG_ID?.trim(),
    userId: process.env.APP_REVIEW_USER_ID?.trim(),
    authUserId: process.env.APP_REVIEW_AUTH_USER_ID?.trim(),
  };
}

/** Bindings survive disabling OTP access so existing demo data stays isolated. */
export function isAppReviewOrg(
  org: Pick<Doc<"orgs">, "_id" | "slug"> | string,
) {
  const { orgId } = appReviewBindings();
  return typeof org === "string"
    ? Boolean(orgId && org === orgId)
    : org.slug === APP_REVIEW_SLUG || Boolean(orgId && org._id === orgId);
}

export function appReviewOtp() {
  const otp = process.env.APP_REVIEW_OTP?.trim();
  const expiresAt = Number(process.env.APP_REVIEW_EXPIRES_AT);
  const bindings = appReviewBindings();
  if (
    process.env.APP_REVIEW_ENABLED !== "true" ||
    process.env.APP_REVIEW_EMAIL?.trim().toLowerCase() !== APP_REVIEW_EMAIL ||
    !otp ||
    !/^\d{6}$/.test(otp) ||
    !Number.isFinite(expiresAt) ||
    expiresAt <= Date.now() ||
    !bindings.orgId ||
    !bindings.userId ||
    !bindings.authUserId
  )
    return undefined;
  return otp;
}

export function isAppReviewIdentity(
  identity: Pick<UserIdentity, "subject" | "email">,
  user?: Pick<Doc<"users">, "_id" | "email" | "authUserId">,
) {
  const bindings = appReviewBindings();
  return (
    isAppReviewEmail(identity.email) ||
    isAppReviewEmail(user?.email) ||
    Boolean(bindings.authUserId && identity.subject === bindings.authUserId) ||
    Boolean(bindings.userId && user?._id === bindings.userId)
  );
}

export function assertAppReviewUser(
  identity: UserIdentity,
  user: Doc<"users">,
) {
  if (!isAppReviewIdentity(identity, user)) return;
  const bindings = appReviewBindings();
  if (
    !appReviewOtp() ||
    identity.emailVerified === false ||
    identity.subject !== bindings.authUserId ||
    user.authUserId !== bindings.authUserId ||
    user._id !== bindings.userId ||
    !isAppReviewEmail(identity.email) ||
    !isAppReviewEmail(user.email) ||
    user.activeOrgId !== bindings.orgId
  )
    throw new ConvexError("App review access is unavailable.");
}

/** Also used by asynchronous push work, which has no current request identity. */
export function reviewStudioAccessAllowed(
  user: Doc<"users">,
  org: Pick<Doc<"orgs">, "_id" | "slug">,
) {
  const identity = { subject: user.authUserId ?? "", email: user.email };
  if (!isAppReviewIdentity(identity, user)) return !isAppReviewOrg(org);
  const binding = appReviewBindings();
  return Boolean(
    appReviewOtp() &&
    user._id === binding.userId &&
    user.authUserId === binding.authUserId &&
    isAppReviewEmail(user.email) &&
    user.activeOrgId === binding.orgId &&
    org._id === binding.orgId &&
    org.slug === APP_REVIEW_SLUG,
  );
}

export function requireLiveStudio(org: Pick<Doc<"orgs">, "_id" | "slug">) {
  if (isAppReviewOrg(org))
    throw new ConvexError(
      "This action is unavailable in the App Review demo studio.",
    );
}

export function rejectAppReviewIdentity(
  identity: Pick<UserIdentity, "subject" | "email">,
) {
  if (isAppReviewIdentity(identity))
    throw new ConvexError("App Review access is limited to its demo studio.");
}
