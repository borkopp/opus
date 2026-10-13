"use client";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { reservationStaffCopy } from "@/lib/reservation-staff-copy";

export function useReservationCopy() {
  const { t } = useDashboardI18n();
  return (english: string, values: Record<string, string | number> = {}) => {
    const translations = reservationStaffCopy[english];
    return t(english, translations?.[0], translations?.[1]).replace(
      /\{(\w+)\}/g,
      (placeholder, name: string) => String(values[name] ?? placeholder),
    );
  };
}
