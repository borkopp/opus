import type { BookingStatus } from "./backend";
import type { LocalizedText } from "./theme";

export function appointmentActionState(
  status: BookingStatus,
  confirmation: "cancelled" | "no_show" | null,
) {
  const active = status === "confirmed" || status === "checked_in";
  const canMarkNoShow = active || status === "completed";
  return {
    active,
    canMarkNoShow,
    // Auto-completion can arrive while a confirmation sheet is open.
    // Preserve no-show correction, but never offer cancellation after completion.
    pendingConfirmation:
      active || (canMarkNoShow && confirmation === "no_show")
        ? confirmation
        : null,
  };
}

export const statusLabels: Record<BookingStatus, LocalizedText> = {
  confirmed: { en: "Confirmed", mk: "Потврден" },
  // Older stored appointments remain actionable without an arrival step.
  checked_in: { en: "Confirmed", mk: "Потврден" },
  completed: { en: "Completed", mk: "Завршен" },
  cancelled: { en: "Cancelled", mk: "Откажан" },
  no_show: { en: "No-show", mk: "Не се појави" },
};
