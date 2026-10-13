import type { Id } from "../_generated/dataModel";
import {
  constantTimeStringEqual,
  hashBookingOtp,
} from "./bookingEmailSecurity";

export async function hashReservationOtp(
  orgId: Id<"orgs">,
  email: string,
  code: string,
) {
  return hashBookingOtp(`reservation:${orgId}:${email}`, code);
}

export function createReservationManagementToken() {
  return `${crypto.randomUUID()}-${crypto.randomUUID()}`;
}

export async function hashReservationManagementToken(token: string) {
  if (!/^[a-f0-9-]{73}$/.test(token)) return null;
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`reservation-management:v1:${token}`),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export async function validReservationManagementToken(
  reservation: { manageTokenHash?: string; manageTokenExpiresAt?: number },
  token: string | undefined,
) {
  if (
    !token ||
    !reservation.manageTokenHash ||
    (reservation.manageTokenExpiresAt ?? 0) <= Date.now()
  )
    return false;
  const hash = await hashReservationManagementToken(token);
  return Boolean(
    hash && constantTimeStringEqual(hash, reservation.manageTokenHash),
  );
}

export function reservationManagementUrl(
  slug: string,
  reservationId: Id<"reservations">,
  token: string,
) {
  const url = new URL(
    `/reserve/${encodeURIComponent(slug)}/manage/${reservationId}`,
    process.env.SITE_URL || "https://studio.opus.mk",
  );
  url.hash = new URLSearchParams({ token }).toString();
  return url.toString();
}
