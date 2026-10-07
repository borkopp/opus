import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";

export type OverviewData = FunctionReturnType<
  typeof api.dashboardOverview.getOverview
>;
export type OverviewAppointment = OverviewData["schedule"][number];
export type UtilisationData = FunctionReturnType<
  typeof api.dashboard.getStaffUtilisation
>;
export type ClientAnalytics = FunctionReturnType<
  typeof api.dashboard.getFreePlanAnalytics
>;
export const avatarTones = ["peach", "lilac", "sage", "blue"] as const;
export const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export function resolveAccountAvatar(profile: {
  staffAvatarUrl?: string | null;
  user?: { avatarUrl?: string | null } | null;
  orgLogoUrl?: string | null;
}): { src: string | null; isFallbackToLogo: boolean } {
  const userAvatar =
    profile.staffAvatarUrl?.trim() || profile.user?.avatarUrl?.trim() || null;
  if (userAvatar) {
    return { src: userAvatar, isFallbackToLogo: false };
  }
  const salonLogo = profile.orgLogoUrl?.trim() || null;
  if (salonLogo) {
    return { src: salonLogo, isFallbackToLogo: true };
  }
  return { src: null, isFallbackToLogo: false };
}

export function resolveAccountDisplayName(profile: {
  staffDisplayName?: string | null;
  user?: { name?: string | null } | null;
}): string | null {
  return profile.staffDisplayName?.trim() || profile.user?.name?.trim() || null;
}
export const overviewNumber = (minor: number | null, locale: string) =>
  minor === null
    ? "—"
    : new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(
        minor / 100,
      );
export function overviewOccupancy(rows: UtilisationData) {
  // Missing historical schedules must not appear as zero utilisation.
  const known = rows.filter(
    (row) =>
      row.bookedMins !== null &&
      row.availableMins !== null &&
      row.availableMins > 0,
  );
  if (!known.length) return null;
  return Math.round(
    (known.reduce((sum, row) => sum + (row.bookedMins ?? 0), 0) /
      known.reduce((sum, row) => sum + (row.availableMins ?? 0), 0)) *
      100,
  );
}
export function appointmentHref(booking: OverviewAppointment) {
  return `/beauty/bookings?booking=${encodeURIComponent(booking.id)}&date=${new Date(booking.startAt).toISOString().slice(0, 10)}`;
}
