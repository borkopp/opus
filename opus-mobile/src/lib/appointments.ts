import type { BookingStatus } from "./backend";
import type { LocalizedText } from "./theme";
export const statusLabels: Record<BookingStatus, LocalizedText> = {
  confirmed: { en: "Confirmed", mk: "Потврден" },
  // Older stored appointments remain actionable without an arrival step.
  checked_in: { en: "Confirmed", mk: "Потврден" },
  completed: { en: "Completed", mk: "Завршен" },
  cancelled: { en: "Cancelled", mk: "Откажан" },
  no_show: { en: "No-show", mk: "Не се појави" },
};
