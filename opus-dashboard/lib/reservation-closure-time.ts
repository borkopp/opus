import { localDate, localDateTimeInstants } from "@/convex/lib/reservationTime";

export type ClosureTimeInput = {
  value: string;
  occurrence: "earlier" | "later";
};

/** Incomplete inputs are expected while editing a datetime-local control. */
export function closureTimeOptions(value: string, timezone: string): number[] {
  const [date, time] = value.split("T");
  if (!date || !time) return [];
  try {
    return localDateTimeInstants(date, time, timezone);
  } catch {
    return [];
  }
}

export function closureTimeInput(
  instant: number | undefined,
  timezone: string,
): ClosureTimeInput {
  if (instant === undefined) return { value: "", occurrence: "earlier" };
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(instant);
  const value = `${localDate(instant, timezone)}T${time}`;
  const options = closureTimeOptions(value, timezone);
  const last = options.at(-1);
  return {
    value,
    occurrence:
      options.length > 1 && last !== undefined && instant >= last
        ? "later"
        : "earlier",
  };
}

/** Each endpoint keeps its own occurrence and unchanged saved instant. */
export function resolveClosureTime(
  input: ClosureTimeInput,
  timezone: string,
  savedInstant?: number,
): number | null {
  const options = closureTimeOptions(input.value, timezone);
  if (!options.length) return null;
  if (savedInstant !== undefined) {
    const saved = closureTimeInput(savedInstant, timezone);
    if (saved.value === input.value && saved.occurrence === input.occurrence)
      return savedInstant;
  }
  return input.occurrence === "later"
    ? options[options.length - 1]
    : options[0];
}
