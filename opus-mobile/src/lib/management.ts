import type { TeamRole } from "../../../shared/mobile";
import type { Language } from "./theme";
export function priceInput(value: number) {
  return `${Math.floor(value / 100)}.${String(value % 100).padStart(2, "0")}`;
}
export function priceMinorUnits(value: string): number | null {
  const match = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(value.trim());
  if (!match) return null;
  const result =
    Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  return Number.isSafeInteger(result) ? result : null;
}
export function roleLabel(role: TeamRole, language: Language) {
  return language === "mk"
    ? { owner: "Сопственик", manager: "Менаџер", staff: "Вработен" }[role]
    : { owner: "Owner", manager: "Manager", staff: "Staff" }[role];
}
export function weekdayLabel(day: number, language: Language) {
  return (
    language === "mk"
      ? [
          "Недела",
          "Понеделник",
          "Вторник",
          "Среда",
          "Четврток",
          "Петок",
          "Сабота",
        ]
      : [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ]
  )[day];
}
