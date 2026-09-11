export function normalizePublicBookingPhone(phone: string): string {
  return phone.trim().replace(/[^\d+]/g, "");
}

export function isValidPublicBookingPhone(phone: string): boolean {
  return /^\+?\d{7,15}$/.test(phone);
}
