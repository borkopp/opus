import { ConvexError } from "convex/values";
import type { Doc } from "../_generated/dataModel";

type SubscriptionOrg = Pick<Doc<"orgs">, "plan"> &
  Partial<Pick<Doc<"orgs">, "trial">>;

export type SubscriptionAccessState =
  | "legacy_free"
  | "trial"
  | "paid"
  | "expired";

/** Raw plan records payment/admin state; a trial never changes it to paid. */
export function getSubscriptionAccess(org: SubscriptionOrg, now = Date.now()) {
  const trial = org.trial;
  const validTrial = Boolean(
    trial &&
    Number.isSafeInteger(trial.startedAt) &&
    Number.isSafeInteger(trial.endsAt) &&
    !Number.isNaN(new Date(trial.startedAt).getTime()) &&
    !Number.isNaN(new Date(trial.endsAt).getTime()) &&
    trial.endsAt > trial.startedAt,
  );
  const activeTrial = Boolean(
    validTrial && trial && now >= trial.startedAt && now < trial.endsAt,
  );
  const accessState: SubscriptionAccessState =
    org.plan === "paid"
      ? "paid"
      : trial === undefined
        ? "legacy_free"
        : activeTrial
          ? "trial"
          : "expired";
  const hasPaidAccess = accessState === "paid" || accessState === "trial";
  return {
    accessState,
    trialEndsAt: validTrial && trial ? trial.endsAt : null,
    hasPaidAccess,
    effectivePlan: hasPaidAccess ? ("paid" as const) : ("free" as const),
  };
}

export function hasPaidAccess(org: SubscriptionOrg, now = Date.now()) {
  return getSubscriptionAccess(org, now).hasPaidAccess;
}

/** Existing Free studios keep booking; newly created studios must remain eligible. */
export function isBookingAccessAllowed(org: SubscriptionOrg, now = Date.now()) {
  return getSubscriptionAccess(org, now).accessState !== "expired";
}

export function requireBookingSubscription(
  org: SubscriptionOrg,
  now = Date.now(),
) {
  if (!isBookingAccessAllowed(org, now)) {
    throw new ConvexError({
      code: "SUBSCRIPTION_REQUIRED",
      message:
        "Choose a paid plan to accept new appointments after your trial.",
    });
  }
}
