import { enGB, mk } from "date-fns/locale";
import type { Month } from "date-fns";

export type {
  ClientAppointment,
  ClientDirectory,
  ClientProfile,
  ClientRecord,
  ClientSegment,
  ClientSort,
  ClientValue,
} from "../convex/lib/clientDirectory";

export function clientInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

// Appointment timestamps store the studio's wall clock. Render in UTC to
// preserve that local time regardless of the staff member's browser timezone.
export function clientDate(
  value: number | null,
  locale: string,
  includeTime = false,
) {
  if (value === null) return "—";
  const date = new Date(value);
  // Bundled locale data also works in browsers without Macedonian Intl data.
  const language = locale.toLowerCase().startsWith("mk") ? mk : enGB;
  const month = language.localize.month(date.getUTCMonth() as Month, {
    width: "abbreviated",
  });
  const day = `${date.getUTCDate()} ${month} ${date.getUTCFullYear()}`;
  if (!includeTime) return day;
  return `${day}, ${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
}
