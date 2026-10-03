export const number = (value: number) =>
  new Intl.NumberFormat("en-GB").format(value);
export function bytes(value: number): string {
  if (value === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(
    Math.floor(Math.log(value) / Math.log(1000)),
    units.length - 1,
  );
  return `${new Intl.NumberFormat("en-GB", { maximumFractionDigits: index ? 1 : 0 }).format(value / 1000 ** index)} ${units[index]}`;
}
export const date = (value: number) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Europe/Skopje",
  }).format(value);

export const dateTime = (value: number) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Skopje",
  }).format(value);

export function appointmentValue(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
    }).format(value / 100);
  } catch {
    return `${number(value / 100)} ${currency}`;
  }
}

export const bookingSource = (source: string) =>
  ({
    web: "Booking website",
    manual: "Dashboard / manual",
    ai_instagram: "Instagram AI",
    opus_web: "OPUS website (legacy)",
    ai_whatsapp: "WhatsApp AI (legacy)",
    ai_webchat: "Web chat AI (legacy)",
    ai_voice: "Voice AI (legacy)",
  })[source] ?? source;

export const bookingStatus = (status: string) =>
  ({
    confirmed: "Confirmed",
    checked_in: "Checked in",
    completed: "Completed",
    cancelled: "Cancelled",
    no_show: "No-show",
  })[status] ?? status;
