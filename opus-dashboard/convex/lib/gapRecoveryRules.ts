import type { Doc, Id } from "../_generated/dataModel";
import {
  isValidBookingEmail,
  normalizeBookingEmail,
} from "./bookingEmailSecurity";

export const RECOVERY_VERSION = 2;
export const RECOVERY_HORIZON_DAYS = 7;
export const RECOVERY_COOLDOWN_MS = 7 * 86_400_000;
export const RECOVERY_OFFER_TTL_MS = 2 * 60 * 60_000;
export const BOOKING_NOTICE_MS = 15 * 60_000;
export type RecoveryReason = { en: string; mk: string };
export type RecoveryOption = {
  serviceId: Id<"services">;
  serviceName: string;
  staffId: Id<"staff_members">;
  startAt: number;
  endAt: number;
  priceMinorUnits: number;
  currency: string;
};

export function hasRecoveryConsent(customer: Doc<"customers">) {
  return (
    customer.gapRecoveryEmailOptIn ??
    (customer.marketingOptIn && customer.preferredChannel === "email")
  );
}

export function recoveryCustomerEligible(
  customer: Doc<"customers">,
  now: number,
  ignoreCooldown = false,
) {
  return (
    !customer.isDeleted &&
    !customer.gdprErasureRequestedAt &&
    hasRecoveryConsent(customer) &&
    !!customer.email &&
    isValidBookingEmail(normalizeBookingEmail(customer.email)) &&
    normalizeBookingEmail(customer.email) !==
      customer.gapRecoveryUndeliverableEmail &&
    (ignoreCooldown ||
      !customer.gapRecoveryLastContactAt ||
      customer.gapRecoveryLastContactAt <= now - RECOVERY_COOLDOWN_MS)
  );
}

export function bookingServiceIds(
  booking: Pick<Doc<"bookings">, "serviceId" | "serviceIds">,
) {
  return booking.serviceIds?.length ? booking.serviceIds : [booking.serviceId];
}

export function overlaps(
  startAt: number,
  endAt: number,
  otherStart: number,
  otherEnd: number,
) {
  return startAt < otherEnd && endAt > otherStart;
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

/** Scores are ordering rules, never probabilities. One booking is one visit. */
export function rankRecoveryOptions(
  customer: Doc<"customers">,
  bookings: Doc<"bookings">[],
  options: RecoveryOption[],
  localNow: number,
) {
  const history = bookings.filter(
    (b) => b.customerId === customer._id && !b.isDeleted,
  );
  const upcoming = history.filter(
    (b) =>
      b.startAt >= localNow &&
      (b.status === "confirmed" || b.status === "checked_in"),
  );
  const completed = history.filter(
    (b) => b.status === "completed" && b.startAt < localNow,
  );
  const results = [];
  for (const option of options) {
    if (
      upcoming.some(
        (b) =>
          bookingServiceIds(b).includes(option.serviceId) ||
          overlaps(option.startAt, option.endAt, b.startAt, b.endAt),
      )
    )
      continue;
    const visits = completed
      .filter((b) => bookingServiceIds(b).includes(option.serviceId))
      .sort((a, b) => a.startAt - b.startAt);
    const visitDays = [
      ...new Set(visits.map((b) => Math.floor(b.startAt / 86_400_000))),
    ];
    const intervals = visitDays
      .slice(1)
      .map((day, i) => day - visitDays[i])
      .slice(-6);
    const last = visits[visits.length - 1];
    const daysSince = last
      ? Math.floor((option.startAt - last.startAt) / 86_400_000)
      : null;
    const returnDays =
      intervals.length >= 2 ? Math.round(median(intervals)) : null;
    const due =
      returnDays !== null &&
      daysSince !== null &&
      daysSince >= returnDays * 0.8;
    // With a known return cycle, avoid suggesting another treatment too early.
    if (returnDays !== null && !due) continue;
    const sameStaff =
      customer.preferredStaffId === option.staffId ||
      visits.filter((b) => b.staffId === option.staffId).length >
        visits.length / 2;
    const hour = new Date(option.startAt).getUTCHours();
    const sameTime =
      visits.length >= 2 &&
      visits.filter(
        (b) => Math.abs(new Date(b.startAt).getUTCHours() - hour) <= 1,
      ).length >
        visits.length / 2;
    const weekday = new Date(option.startAt).getUTCDay();
    const sameDay =
      visits.length >= 2 &&
      visits.filter((b) => new Date(b.startAt).getUTCDay() === weekday).length >
        visits.length / 2;
    const attendedOrMissed = history.filter(
      (b) =>
        b.startAt < localNow &&
        bookingServiceIds(b).includes(option.serviceId) &&
        (b.status === "completed" || b.status === "no_show"),
    );
    const noShowRate =
      attendedOrMissed.length >= 3
        ? attendedOrMissed.filter((b) => b.status === "no_show").length /
          attendedOrMissed.length
        : 0;
    const score =
      (due ? 60 : 0) +
      (visits.length ? 20 : 0) +
      (sameStaff ? 10 : 0) +
      (sameTime ? 5 : 0) +
      (sameDay ? 5 : 0) -
      10 * noShowRate;
    const reasons: RecoveryReason[] = [];
    if (due)
      reasons.push({
        en: `Usually returns every ${returnDays} days; last visit ${daysSince} days before this opening.`,
        mk: `Обично доаѓа на ${returnDays} дена; последната посета е ${daysSince} дена пред овој термин.`,
      });
    else if (last)
      reasons.push({
        en: `${visits.length} completed visits for this service; return timing is not yet known.`,
        mk: `${visits.length} завршени посети за оваа услуга; сè уште нема доволно податоци за зачестеноста.`,
      });
    else
      reasons.push({
        en: "No completed history for this service. Review this choice manually.",
        mk: "Нема завршени посети за оваа услуга. Проценете дали понудата е соодветна.",
      });
    if (sameStaff)
      reasons.push({
        en: "Prefers or usually books this specialist.",
        mk: "Го претпочита или обично го избира овој специјалист.",
      });
    if (sameTime || sameDay)
      reasons.push({
        en: "Fits their usual appointment time or weekday.",
        mk: "Одговара на вообичаениот час или ден за посета.",
      });
    reasons.push({
      en: "No upcoming appointment for this service.",
      mk: "Нема иден закажан термин за оваа услуга.",
    });
    results.push({
      ...option,
      customerId: customer._id,
      customerName: customer.name,
      score,
      reasons,
    });
  }
  return results.sort(
    (a, b) =>
      b.score - a.score ||
      a.startAt - b.startAt ||
      a.serviceId.localeCompare(b.serviceId),
  );
}

export function recoveryMessage(args: {
  customerName: string;
  studioName: string;
  serviceName: string;
  staffName: string;
  startAt: number;
  priceMinorUnits: number;
  currency: string;
  locale: string;
}) {
  const mk = args.locale.startsWith("mk");
  const locale = mk ? "mk-MK" : "en-GB";
  const date = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "UTC",
  }).format(args.startAt);
  const price = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: args.currency,
  })
    .format(args.priceMinorUnits / 100)
    .replace(/\.$/, "");
  return mk
    ? `Здраво ${args.customerName}, во ${args.studioName} има слободен термин за ${args.serviceName} со ${args.staffName} на ${date}, по цена од ${price}. Ако ви одговара, отворете ја понудата за да го потврдите терминот додека е слободен.`
    : `Hi ${args.customerName}, ${args.studioName} has an opening for ${args.serviceName} with ${args.staffName} on ${date}, priced at ${price}. Open the offer to confirm your appointment while it is still available.`;
}

export async function hashRecoveryToken(token: string) {
  if (!/^[A-Za-z0-9_-]{32}$/.test(token)) return null;
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
