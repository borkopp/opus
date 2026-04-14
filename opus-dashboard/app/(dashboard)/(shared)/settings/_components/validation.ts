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

/** Returns true if the string is a syntactically valid hostname (e.g. book.mybiz.com). */
export function validHostname(host: string): boolean {
  if (!host.trim()) return false;
  // RFC 1123 hostname regex
  return /^(?=.{1,253}$)((?!-)[A-Za-z0-9-]{1,63}(?<!-)\.)+[A-Za-z]{2,}$/.test(host.trim());
}

/** Returns true if the value is a valid percentage (0–100). */
export function validPercentage(value: number): boolean {
  return !isNaN(value) && value >= 0 && value <= 100;
}

/** Returns true if the value is valid for a fixed deposit (> 0). */
export function validFixedDeposit(value: number): boolean {
  return !isNaN(value) && value > 0;
}

/** Returns true if the value is a valid AI confidence threshold (0–1, 2 dp max). */
export function validConfidence(value: number): boolean {
  return !isNaN(value) && value >= 0 && value <= 1;
}

/** Parses a comma-separated list of positive integers. Returns null on failure. */
export function parseReminderHours(raw: string): number[] | null {
  const parts = raw.split(",").map((s) => parseInt(s.trim(), 10));
  if (parts.some((n) => isNaN(n) || n <= 0)) return null;
  return parts;
}

/** Validates a file for upload: type must be image/*, size must be under maxMb. */
export function validateImageFile(
  file: File,
  maxMb = 5
): string | null {
  if (!file.type.startsWith("image/")) {
    return "Only image files are allowed (JPEG, PNG, WebP).";
  }
  if (file.size > maxMb * 1024 * 1024) {
    return `File is too large. Maximum size is ${maxMb} MB.`;
  }
  return null;
}
