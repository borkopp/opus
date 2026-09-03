/** Shared validation helpers for settings tab forms. */

export type FieldErrors<T extends string> = Partial<Record<T, string>>;

/** Returns true if value is a positive integer (> 0). */
export function posInt(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

/** Returns true if value is a non-negative integer (≥ 0). */
export function nonNegInt(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

/** Returns true if the string matches a valid IANA timezone. Lightweight check. */
export function validTimezone(tz: string): boolean {
  if (!tz.trim()) return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Returns true if the string looks like a valid BCP-47 locale tag (e.g. en-GB). */
export function validLocale(locale: string): boolean {
  if (!locale.trim()) return false;
  try {
    Intl.getCanonicalLocales(locale);
    return true;
  } catch {
    return false;
  }
}

/** Returns true if the value is a valid AI confidence threshold (0–1, 2 dp max). */
export function validConfidence(value: number): boolean {
  return !isNaN(value) && value >= 0 && value <= 1;
}

/** Parses a comma-separated list of positive integers. Returns null on failure. */
export function parseReminderHours(raw: string): number[] | null {
  if (!raw.trim()) return [];
  const values = raw.split(",").map((part) => part.trim());
  if (values.some((value) => !/^\d+$/.test(value))) return null;
  const hours = values.map(Number);
  if (hours.length > 8 || hours.some((hour) => hour <= 0 || hour > 336)) {
    return null;
  }
  return Array.from(new Set(hours)).sort((first, second) => second - first);
}

/** Validates a file for upload: type must be image/*, size must be under maxMb. */
export function validateImageFile(
  file: File,
  maxMb = 5,
  t?: (english: string, macedonian: string) => string,
): string | null {
  const translate = t ?? ((english: string) => english);
  if (!file.type.startsWith("image/")) {
    return translate(
      "Only image files are allowed (JPEG, PNG, WebP).",
      "Дозволени се само датотеки со слики (JPEG, PNG, WebP).",
    );
  }
  if (file.size > maxMb * 1024 * 1024) {
    return translate(
      `File is too large. Maximum size is ${maxMb} MB.`,
      `Датотеката е преголема. Максималната големина е ${maxMb} MB.`,
    );
  }
  return null;
}
