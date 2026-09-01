const SUPPORTED_CURRENCIES = new Set(["MKD", "EUR", "USD", "GBP"]);

export interface OperationalSettings {
  timezone: string;
  currency: string;
  locale: string;
  slotDurationMins: number;
  quickBookingDurationMins?: number;
  bookingWindowDays: number;
  cancellationWindowHours: number;
  bufferTimeMins: number;
}

function isIntegerInRange(value: number, min: number, max: number): boolean {
  return Number.isInteger(value) && value >= min && value <= max;
}

export function defaultQuickBookingDurationMins(
  slotDurationMins: number,
): number {
  if (!Number.isInteger(slotDurationMins) || slotDurationMins <= 0) return 30;
  return Math.max(
    slotDurationMins,
    Math.ceil(30 / slotDurationMins) * slotDurationMins,
  );
}

export function canonicalLocale(value: string): string | null {
  const locale = value.trim();
  if (!locale || locale.length > 35) return null;
  try {
    return Intl.getCanonicalLocales(locale)[0] ?? null;
  } catch {
    return null;
  }
}

export function isValidTimezone(value: string): boolean {
  const timezone = value.trim();
  if (!timezone || timezone.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
}

export function supportedCurrency(value: string): string | null {
  const currency = value.trim().toUpperCase();
  return SUPPORTED_CURRENCIES.has(currency) ? currency : null;
}

export function operationalSettingsError(
  settings: OperationalSettings,
): string | null {
  if (!isValidTimezone(settings.timezone)) {
    return "Enter a valid IANA timezone, such as Europe/Skopje.";
  }
  if (!canonicalLocale(settings.locale)) {
    return "Enter a valid locale tag, such as mk-MK or en-GB.";
  }
  if (!supportedCurrency(settings.currency)) {
    return "Select a supported currency: MKD, EUR, USD, or GBP.";
  }
  if (!isIntegerInRange(settings.slotDurationMins, 1, 480)) {
    return "Slot duration must be a whole number between 1 and 480 minutes.";
  }
  if (
    settings.quickBookingDurationMins !== undefined &&
    (!isIntegerInRange(settings.quickBookingDurationMins, 1, 480) ||
      settings.quickBookingDurationMins < settings.slotDurationMins ||
      settings.quickBookingDurationMins % settings.slotDurationMins !== 0)
  ) {
    return `Quick booking duration must be a whole-number multiple of the ${settings.slotDurationMins} minute slot duration, up to 480 minutes.`;
  }
  if (!isIntegerInRange(settings.bookingWindowDays, 1, 730)) {
    return "Booking window must be a whole number between 1 and 730 days.";
  }
  if (!isIntegerInRange(settings.cancellationWindowHours, 1, 8_760)) {
    return "Cancellation window must be a whole number between 1 and 8,760 hours.";
  }
  if (!isIntegerInRange(settings.bufferTimeMins, 0, 240)) {
    return "Buffer time must be a whole number between 0 and 240 minutes.";
  }
  return null;
}
