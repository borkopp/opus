"use client";

import { createContext, useContext } from "react";
import type { Appointment } from "../_lib/mock-data";

export type BookingDraft = {
  time?: string;
  staff?: string;
  service?: string;
  day?: number;
};
export type PreviewContextValue = {
  appointments: Appointment[];
  day: number;
  setDay: (day: number) => void;
  period: string;
  setPeriod: (period: string) => void;
  search: string;
  setSearch: (search: string) => void;
  staffFilter: string;
  setStaffFilter: (staff: string) => void;
  showAppointment: (appointment: Appointment) => void;
  newAppointment: (draft?: BookingDraft) => void;
  showNotifications: () => void;
};

export const PreviewContext = createContext<PreviewContextValue | null>(null);

export function usePreview() {
  const value = useContext(PreviewContext);
  if (!value) throw new Error("Preview widgets need PreviewContext");
  return value;
}
