import type { Doc } from "../_generated/dataModel";
import { wallClockTimestampToInstant } from "./bookingTime";

export type BookingSmsType =
  | "booking_confirmation"
  | "booking_rescheduled"
  | "booking_cancelled"
  | "booking_reminder";

export function isBookingSmsType(type: string): type is BookingSmsType {
  return [
    "booking_confirmation",
    "booking_rescheduled",
    "booking_cancelled",
    "booking_reminder",
  ].includes(type);
}

/** Local Macedonian numbers and explicit international numbers become E.164. */
export function normalizeSmsPhone(value: string | undefined): string | null {
  if (!value || !/^[+\d\s().-]+$/.test(value)) return null;
  let phone = value.replace(/[\s().-]/g, "");
  if (phone.startsWith("00")) phone = `+${phone.slice(2)}`;
  else if (/^0\d{8}$/.test(phone)) phone = `+389${phone.slice(1)}`;
  else if (/^389\d{8}$/.test(phone)) phone = `+${phone}`;
  return /^\+[1-9]\d{7,14}$/.test(phone) ? phone : null;
}

export function smsCallbackBaseUrl(): string | null {
  const site = process.env.CONVEX_SITE_URL?.trim();
  const configured = process.env.TWILIO_STATUS_CALLBACK_URL?.trim();
  try {
    const url = new URL(configured || `${site}/webhooks/twilio`);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function smsProviderConfigured(): boolean {
  const service = process.env.TWILIO_MESSAGING_SERVICE_SID?.trim();
  return Boolean(
    process.env.SMS_ENABLED === "true" &&
    /^AC[0-9a-f]{32}$/i.test(process.env.TWILIO_ACCOUNT_SID?.trim() ?? "") &&
    process.env.TWILIO_AUTH_TOKEN?.trim() &&
    (service
      ? /^MG[0-9a-f]{32}$/i.test(service)
      : normalizeSmsPhone(process.env.TWILIO_FROM_NUMBER?.trim())) &&
    smsCallbackBaseUrl(),
  );
}

export function smsDeliverySkipReason(args: {
  org: Doc<"orgs"> | null;
  settings: Doc<"org_settings"> | null;
  booking: Doc<"bookings"> | null;
  customer: Doc<"customers"> | null;
  type: string;
  recipientAddress: string;
  templateData: unknown;
}): string | null {
  const { org, settings, booking, customer, type } = args;
  if (
    !org ||
    org.isDeleted ||
    org.industry !== "beauty_wellness" ||
    org.plan !== "paid"
  )
    return "SMS notifications require Pro.";
  if (!settings || settings.orgId !== org._id || !settings.smsEnabled)
    return "SMS notifications are disabled.";
  if (!smsProviderConfigured()) return "SMS delivery is not configured.";
  if (!isBookingSmsType(type)) return "This notification does not support SMS.";
  if (!booking || booking.orgId !== org._id || booking.isDeleted)
    return "Appointment unavailable.";
  if (
    !customer ||
    customer.orgId !== org._id ||
    customer._id !== booking.customerId ||
    customer.isDeleted ||
    normalizeSmsPhone(customer.phone) !== args.recipientAddress
  )
    return "Client phone number is unavailable or has changed.";
  if (type === "booking_cancelled")
    return booking.status === "cancelled"
      ? null
      : "Appointment is not cancelled.";
  if (!["confirmed", "checked_in"].includes(booking.status))
    return "Appointment is no longer active.";
  if (type === "booking_reminder") {
    const data = args.templateData as {
      startAt?: unknown;
      hoursBefore?: unknown;
      timezone?: unknown;
    } | null;
    if (
      booking.status !== "confirmed" ||
      wallClockTimestampToInstant(booking.startAt, settings.timezone) <=
        Date.now()
    )
      return "Appointment reminder has expired.";
    if (data?.startAt !== booking.startAt)
      return "Appointment time has changed.";
    if (data?.timezone !== settings.timezone)
      return "Appointment timezone has changed.";
    if (
      typeof data?.hoursBefore !== "number" ||
      !(settings.smsReminderHoursBefore ?? [24]).includes(data.hoursBefore)
    )
      return "SMS reminder time is no longer configured.";
  }
  return null;
}

export function renderBookingSms(
  type: BookingSmsType,
  data: {
    studioName: string;
    serviceName: string;
    startAt: number;
    locale?: string;
  },
): string {
  const mk = (data.locale ?? "mk-MK").toLowerCase().startsWith("mk");
  const date = new Intl.DateTimeFormat(mk ? "mk-MK" : "en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(data.startAt);
  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "UTC",
  }).format(data.startAt);
  const title = {
    booking_confirmation: mk ? "Потврден термин" : "Appointment confirmed",
    booking_rescheduled: mk ? "Презакажан термин" : "Appointment rescheduled",
    booking_cancelled: mk ? "Откажан термин" : "Appointment cancelled",
    booking_reminder: mk ? "Потсетник за термин" : "Appointment reminder",
  }[type];
  // Bound user-authored labels to keep multipart SMS costs predictable.
  const compact = (value: string) =>
    value.replace(/\s+/g, " ").trim().slice(0, 60);
  return `${compact(data.studioName)}: ${title}. ${compact(data.serviceName)}, ${date} ${mk ? "во" : "at"} ${time}.`;
}

export class SmsDeliveryFailure extends Error {
  constructor(
    message: string,
    public readonly retryable = false,
  ) {
    super(message);
    this.name = "SmsDeliveryFailure";
  }
}

export async function deliverSms(args: {
  to: string;
  body: string;
  notificationId: string;
  orgId: string;
}): Promise<string> {
  if (!smsProviderConfigured())
    throw new SmsDeliveryFailure("SMS delivery is not configured.");
  const sid = process.env.TWILIO_ACCOUNT_SID!.trim();
  const callback = new URL(smsCallbackBaseUrl()!);
  callback.searchParams.set("orgId", args.orgId);
  callback.searchParams.set("notificationId", args.notificationId);
  const body = new URLSearchParams({
    To: args.to,
    Body: args.body,
    StatusCallback: callback.toString(),
  });
  const service = process.env.TWILIO_MESSAGING_SERVICE_SID?.trim();
  if (service) body.set("MessagingServiceSid", service);
  else body.set("From", normalizeSmsPhone(process.env.TWILIO_FROM_NUMBER)!);

  let response: Response;
  try {
    response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${sid}:${process.env.TWILIO_AUTH_TOKEN!.trim()}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
        signal: AbortSignal.timeout(15_000),
      },
    );
  } catch {
    // Twilio may have accepted a timed-out request. Never blindly resend it.
    throw new SmsDeliveryFailure(
      "SMS submission is unconfirmed. Check Twilio before retrying.",
    );
  }
  const result: { sid?: unknown; code?: unknown; status?: unknown } =
    await response.json().catch(() => ({}));
  if (!response.ok) {
    const code =
      typeof result.code === "number" ? ` (code ${result.code})` : "";
    // A 429 explicitly rejects the request; network errors and 5xx are ambiguous.
    throw new SmsDeliveryFailure(
      `Twilio rejected SMS: HTTP ${response.status}${code}.`,
      response.status === 429,
    );
  }
  if (typeof result.sid !== "string" || !/^SM[0-9a-f]{32}$/i.test(result.sid))
    throw new SmsDeliveryFailure(
      "SMS submission is unconfirmed. Twilio returned no valid message ID.",
    );
  if (["failed", "undelivered", "canceled"].includes(String(result.status)))
    throw new SmsDeliveryFailure("Twilio reported an SMS delivery failure.");
  return result.sid;
}

export async function verifyTwilioSignature(
  url: string,
  params: URLSearchParams,
  signature: string,
  secret: string,
): Promise<boolean> {
  if (!signature || !secret) return false;
  let payload = url;
  for (const name of [...new Set(params.keys())].sort()) {
    for (const value of [...new Set(params.getAll(name))].sort())
      payload += name + value;
  }
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["verify"],
  );
  try {
    const bytes = Uint8Array.from(atob(signature), (character) =>
      character.charCodeAt(0),
    );
    return await crypto.subtle.verify(
      "HMAC",
      key,
      bytes,
      new TextEncoder().encode(payload),
    );
  } catch {
    return false;
  }
}
