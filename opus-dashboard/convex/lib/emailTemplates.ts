import {
  compactInstantDateTime,
  compactWallClockDateTime,
  wallClockTimestampToInstant,
} from "./bookingTime";

export type EmailAttachment = {
  filename: string;
  content: string;
};

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
  attachments?: EmailAttachment[];
};

export type AppointmentEmailData = {
  studioName: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  serviceName: string;
  staffName: string;
  startAt: number;
  endAt: number;
  priceMinorUnits?: number;
  currency?: string;
  locale?: string;
  timezone?: string;
  address?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  studioPhone?: string;
  dashboardUrl?: string;
  hoursBefore?: number;
  generatedAt?: number;
  previousStartAt?: number;
  previousEndAt?: number;
};

type ShellOptions = {
  preheader: string;
  eyebrow: string;
  title: string;
  intro: string;
  studioName: string;
  content: string;
  finePrint?: string;
};

const EMAIL_COLORS = {
  ink: "#20211f",
  muted: "#686a65",
  line: "#dcddd7",
  paper: "#f6f6f3",
  white: "#ffffff",
  brand: "#ff814a",
  brandSoft: "#fff0ea",
};

const EMAIL_BRAND_LOGO_URL = "https://studio.opus.mk/opus-logo.png";

function escapeHtml(value: string | number | undefined | null) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function cleanSubject(value: string) {
  return value
    .replace(/[\r\n]+/g, " ")
    .trim()
    .slice(0, 180);
}

function isMacedonian(locale = "mk-MK") {
  return locale.toLowerCase().startsWith("mk");
}

function formatDate(timestamp: number, locale = "mk-MK") {
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(timestamp));
}

function formatShortMonth(timestamp: number, locale = "mk-MK") {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    timeZone: "UTC",
  })
    .format(new Date(timestamp))
    .replace(".", "")
    .toUpperCase();
}

function formatDay(timestamp: number) {
  return String(new Date(timestamp).getUTCDate()).padStart(2, "0");
}

function formatTime(timestamp: number, locale = "mk-MK") {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "UTC",
  }).format(new Date(timestamp));
}

function formatPrice(
  amount: number | undefined,
  currency = "MKD",
  locale = "mk-MK",
) {
  if (amount === undefined) return undefined;
  const value = amount / 100;
  if (currency.toUpperCase() === "MKD") return `${value.toFixed(2)} ден`;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

function renderShell(options: ShellOptions) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light only">
    <title>${escapeHtml(options.title)}</title>
    <style>
      @media only screen and (max-width: 620px) {
        .email-shell { width: 100% !important; }
        .email-pad { padding-left: 22px !important; padding-right: 22px !important; }
        .email-title { font-size: 31px !important; line-height: 36px !important; }
        .action { display: block !important; margin: 0 0 10px !important; text-align: center !important; }
      }
    </style>
  </head>
  <body style="margin:0;background:${EMAIL_COLORS.paper};color:${EMAIL_COLORS.ink};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(options.preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${EMAIL_COLORS.paper};">
      <tr>
        <td align="center" style="padding:32px 12px;">
          <table role="presentation" class="email-shell" width="600" cellspacing="0" cellpadding="0" border="0" style="width:600px;max-width:600px;background:${EMAIL_COLORS.white};border:1px solid ${EMAIL_COLORS.line};border-radius:24px;overflow:hidden;box-shadow:0 16px 50px rgba(32,33,31,.08);">
            <tr><td style="height:5px;background:${EMAIL_COLORS.brand};font-size:0;line-height:0;">&nbsp;</td></tr>
            <tr>
              <td class="email-pad" style="padding:38px 42px 18px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="line-height:0;">
                      <img src="${EMAIL_BRAND_LOGO_URL}" width="100" height="35" alt="OPUS" style="display:block;width:100px;height:35px;border:0;">
                    </td>
                    <td align="right" style="font-size:12px;color:${EMAIL_COLORS.muted};">${escapeHtml(options.studioName)}</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td class="email-pad" style="padding:18px 42px 6px;">
                <div style="font-size:11px;font-weight:750;letter-spacing:.12em;text-transform:uppercase;color:${EMAIL_COLORS.brand};">${escapeHtml(options.eyebrow)}</div>
                <h1 class="email-title" style="margin:12px 0 12px;font-size:38px;line-height:43px;letter-spacing:-.045em;font-weight:700;color:${EMAIL_COLORS.ink};">${escapeHtml(options.title)}</h1>
                <p style="margin:0;font-size:16px;line-height:25px;color:${EMAIL_COLORS.muted};">${escapeHtml(options.intro)}</p>
              </td>
            </tr>
            <tr><td class="email-pad" style="padding:26px 42px 40px;">${options.content}</td></tr>
            <tr>
              <td class="email-pad" style="padding:22px 42px 28px;border-top:1px solid ${EMAIL_COLORS.line};background:#fbfbf9;">
                <p style="margin:0 0 6px;font-size:12px;line-height:18px;color:${EMAIL_COLORS.muted};">${escapeHtml(options.finePrint ?? `Sent securely by OPUS for ${options.studioName}.`)}</p>
                <p style="margin:0;font-size:11px;line-height:17px;color:#85877f;">Transactional appointment email · No marketing subscription</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function detailRow(label: string, value: string) {
  return `<tr>
    <td style="padding:8px 0;font-size:12px;color:${EMAIL_COLORS.muted};vertical-align:top;">${escapeHtml(label)}</td>
    <td align="right" style="padding:8px 0 8px 16px;font-size:13px;font-weight:650;color:${EMAIL_COLORS.ink};vertical-align:top;">${escapeHtml(value)}</td>
  </tr>`;
}

function appointmentCard(data: AppointmentEmailData) {
  const locale = data.locale ?? "mk-MK";
  const price = formatPrice(data.priceMinorUnits, data.currency, locale);
  const location = [data.address, data.city].filter(Boolean).join(", ");
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid ${EMAIL_COLORS.line};border-radius:18px;overflow:hidden;">
    <tr>
      <td width="112" align="center" style="width:112px;padding:22px 12px;background:${EMAIL_COLORS.brandSoft};border-right:1px solid ${EMAIL_COLORS.line};">
        <div style="font-size:11px;font-weight:800;letter-spacing:.12em;color:${EMAIL_COLORS.brand};">${escapeHtml(formatShortMonth(data.startAt, locale))}</div>
        <div style="margin-top:4px;font-size:38px;line-height:40px;font-weight:750;letter-spacing:-.05em;color:${EMAIL_COLORS.ink};">${escapeHtml(formatDay(data.startAt))}</div>
        <div style="margin-top:6px;font-size:13px;font-weight:650;color:${EMAIL_COLORS.ink};">${escapeHtml(formatTime(data.startAt, locale))}</div>
      </td>
      <td style="padding:18px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          ${detailRow(isMacedonian(locale) ? "Услуга" : "Service", data.serviceName)}
          ${detailRow(isMacedonian(locale) ? "Со" : "With", data.staffName)}
          ${price ? detailRow(isMacedonian(locale) ? "Цена" : "Price", price) : ""}
          ${location ? detailRow(isMacedonian(locale) ? "Локација" : "Location", location) : ""}
        </table>
      </td>
    </tr>
  </table>`;
}

function button(href: string, label: string, primary = false) {
  return `<a class="action" href="${escapeHtml(href)}" style="display:inline-block;margin:0 8px 8px 0;padding:13px 18px;border:1px solid ${primary ? EMAIL_COLORS.brand : EMAIL_COLORS.line};border-radius:12px;background:${primary ? EMAIL_COLORS.brand : EMAIL_COLORS.white};color:${primary ? EMAIL_COLORS.white : EMAIL_COLORS.ink};font-size:13px;font-weight:700;text-decoration:none;">${escapeHtml(label)}</a>`;
}

function directionsUrl(data: AppointmentEmailData) {
  const destination =
    data.latitude !== undefined && data.longitude !== undefined
      ? `${data.latitude},${data.longitude}`
      : [data.address, data.city].filter(Boolean).join(", ");
  if (!destination) return undefined;
  const url = new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api", "1");
  url.searchParams.set("destination", destination);
  return url.toString();
}

function calendarUrl(data: AppointmentEmailData) {
  const timezone = data.timezone ?? "Europe/Skopje";
  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", `${data.serviceName} · ${data.studioName}`);
  url.searchParams.set(
    "dates",
    `${compactWallClockDateTime(data.startAt)}/${compactWallClockDateTime(data.endAt)}`,
  );
  url.searchParams.set("ctz", timezone);
  url.searchParams.set(
    "details",
    `${data.serviceName} with ${data.staffName}. Booked through OPUS.`,
  );
  const location = [data.address, data.city].filter(Boolean).join(", ");
  if (location) url.searchParams.set("location", location);
  return url.toString();
}

function escapeIcs(value: string) {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replaceAll(/\r?\n/g, "\\n");
}

function bytesToBase64(bytes: Uint8Array) {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index] ?? 0;
    const second = bytes[index + 1] ?? 0;
    const third = bytes[index + 2] ?? 0;
    const value = (first << 16) | (second << 8) | third;
    result += alphabet[(value >> 18) & 63];
    result += alphabet[(value >> 12) & 63];
    result += index + 1 < bytes.length ? alphabet[(value >> 6) & 63] : "=";
    result += index + 2 < bytes.length ? alphabet[value & 63] : "=";
  }
  return result;
}

function calendarAttachment(data: AppointmentEmailData): EmailAttachment {
  const timezone = data.timezone ?? "Europe/Skopje";
  const start = wallClockTimestampToInstant(data.startAt, timezone);
  const end = wallClockTimestampToInstant(data.endAt, timezone);
  const location = [data.address, data.city].filter(Boolean).join(", ");
  const uid = `${data.startAt}-${data.serviceName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}@opus.mk`;
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//OPUS//Appointments//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${escapeIcs(uid)}`,
    `DTSTAMP:${compactInstantDateTime(data.generatedAt ?? data.startAt)}`,
    `DTSTART:${compactInstantDateTime(start)}`,
    `DTEND:${compactInstantDateTime(end)}`,
    `SUMMARY:${escapeIcs(`${data.serviceName} · ${data.studioName}`)}`,
    `DESCRIPTION:${escapeIcs(`${data.serviceName} with ${data.staffName}. Booked through OPUS.`)}`,
    ...(location ? [`LOCATION:${escapeIcs(location)}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
  return {
    filename: "opus-appointment.ics",
    content: bytesToBase64(new TextEncoder().encode(ics)),
  };
}

function appointmentText(data: AppointmentEmailData) {
  const locale = data.locale ?? "mk-MK";
  const location = [data.address, data.city].filter(Boolean).join(", ");
  return [
    `${data.serviceName} — ${data.studioName}`,
    `${formatDate(data.startAt, locale)}, ${formatTime(data.startAt, locale)}–${formatTime(data.endAt, locale)}`,
    `${isMacedonian(locale) ? "Со" : "With"}: ${data.staffName}`,
    ...(location
      ? [`${isMacedonian(locale) ? "Локација" : "Location"}: ${location}`]
      : []),
  ].join("\n");
}

export function renderAccountOtpEmail({
  otp,
  type,
}: {
  otp: string;
  type: string;
}): RenderedEmail {
  const title =
    type === "sign-in" ? "Your sign-in code." : "Confirm your email.";
  const content = `<div style="margin:4px 0 20px;padding:22px;border:1px solid ${EMAIL_COLORS.line};border-radius:18px;background:${EMAIL_COLORS.paper};text-align:center;">
    <div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:34px;line-height:42px;font-weight:750;letter-spacing:.22em;color:${EMAIL_COLORS.ink};">${escapeHtml(otp)}</div>
  </div>
  <p style="margin:0;font-size:13px;line-height:20px;color:${EMAIL_COLORS.muted};">This code expires in 5 minutes. If you did not request it, you can safely ignore this email.</p>`;
  return {
    subject: "Your OPUS sign-in code",
    html: renderShell({
      preheader: `${otp} is your OPUS verification code.`,
      eyebrow: "Secure access",
      title,
      intro:
        "Enter this one-time code in the OPUS window you already have open.",
      studioName: "OPUS Studio",
      content,
      finePrint: "This security email was sent by OPUS.",
    }),
    text: `Your OPUS code is ${otp}. It expires in 5 minutes.`,
  };
}

export function renderBookingVerificationEmail({
  studioName,
  code,
  locale = "mk-MK",
}: {
  studioName: string;
  code: string;
  locale?: string;
}): RenderedEmail {
  const mk = isMacedonian(locale);
  const content = `<div style="margin:4px 0 20px;padding:22px;border:1px solid ${EMAIL_COLORS.line};border-radius:18px;background:${EMAIL_COLORS.paper};text-align:center;">
    <div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:34px;line-height:42px;font-weight:750;letter-spacing:.22em;color:${EMAIL_COLORS.ink};">${escapeHtml(code)}</div>
  </div>
  <p style="margin:0;font-size:13px;line-height:20px;color:${EMAIL_COLORS.muted};">${escapeHtml(mk ? "Кодот важи 10 минути и може да се употреби само еднаш. Не го споделувајте со никого." : "The code expires in 10 minutes and can be used once. Never share it with anyone.")}</p>`;
  return {
    subject: cleanSubject(
      mk
        ? `Потврдете го терминот во ${studioName}`
        : `Confirm your booking at ${studioName}`,
    ),
    html: renderShell({
      preheader: mk
        ? `${code} е вашиот код за потврда.`
        : `${code} is your booking verification code.`,
      eyebrow: mk ? "Сигурна резервација" : "Secure booking",
      title: mk ? "Уште еден мал чекор." : "One small step left.",
      intro: mk
        ? `Внесете го овој код за да го потврдите терминот во ${studioName}.`
        : `Enter this code to confirm your appointment at ${studioName}.`,
      studioName,
      content,
    }),
    text: mk
      ? `Вашиот код за ${studioName} е ${code}. Кодот важи 10 минути.`
      : `Your ${studioName} booking code is ${code}. It expires in 10 minutes.`,
  };
}

export function renderClientConfirmationEmail(
  data: AppointmentEmailData,
): RenderedEmail {
  const locale = data.locale ?? "mk-MK";
  const mk = isMacedonian(locale);
  const maps = directionsUrl(data);
  const call = data.studioPhone
    ? `tel:${data.studioPhone.replace(/[^+\d]/g, "")}`
    : undefined;
  const actions = [
    button(
      calendarUrl(data),
      mk ? "Додај во календар" : "Add to calendar",
      true,
    ),
    ...(maps ? [button(maps, mk ? "Насоки" : "Directions")] : []),
    ...(call ? [button(call, mk ? "Јавете се" : "Call studio")] : []),
  ].join("");
  const content = `${appointmentCard(data)}
    <div style="padding-top:22px;">${actions}</div>
    <p style="margin:10px 0 0;font-size:12px;line-height:19px;color:${EMAIL_COLORS.muted};">${escapeHtml(mk ? "Во прилог има и календарска датотека за Apple Calendar, Outlook и други апликации." : "A calendar file for Apple Calendar, Outlook, and other apps is attached too.")}</p>`;
  return {
    subject: cleanSubject(
      mk
        ? `Потврден термин · ${data.studioName}`
        : `Appointment confirmed · ${data.studioName}`,
    ),
    html: renderShell({
      preheader: `${data.serviceName} · ${formatDate(data.startAt, locale)} · ${formatTime(data.startAt, locale)}`,
      eyebrow: mk ? "Терминот е потврден" : "Appointment confirmed",
      title: mk ? "Терминот е ваш." : "The time is yours.",
      intro: mk
        ? `${data.customerName}, ве очекуваме во ${data.studioName}. Сè што ви треба е подолу.`
        : `${data.customerName}, ${data.studioName} is expecting you. Everything you need is below.`,
      studioName: data.studioName,
      content,
    }),
    text: `${mk ? "Терминот е потврден." : "Your appointment is confirmed."}\n\n${appointmentText(data)}\n\n${mk ? "Додај во календар" : "Add to calendar"}: ${calendarUrl(data)}${maps ? `\n${mk ? "Насоки" : "Directions"}: ${maps}` : ""}${call ? `\n${mk ? "Телефон" : "Phone"}: ${data.studioPhone}` : ""}`,
    attachments: [calendarAttachment(data)],
  };
}

export function renderClientReminderEmail(
  data: AppointmentEmailData,
): RenderedEmail {
  const locale = data.locale ?? "mk-MK";
  const mk = isMacedonian(locale);
  const maps = directionsUrl(data);
  const content = `${appointmentCard(data)}
    <div style="padding-top:22px;">
      ${button(calendarUrl(data), mk ? "Отвори календар" : "Open calendar", true)}
      ${maps ? button(maps, mk ? "Насоки" : "Directions") : ""}
    </div>`;
  return {
    subject: cleanSubject(
      mk
        ? `Потсетник за ${data.studioName}`
        : `Appointment reminder · ${data.studioName}`,
    ),
    html: renderShell({
      preheader: `${data.serviceName} · ${formatDate(data.startAt, locale)} · ${formatTime(data.startAt, locale)}`,
      eyebrow: mk ? "Потсетник за термин" : "Appointment reminder",
      title: mk ? "Се гледаме наскоро." : "See you soon.",
      intro: mk
        ? `${data.customerName}, вашиот термин во ${data.studioName} се приближува.`
        : `${data.customerName}, your appointment at ${data.studioName} is coming up.`,
      studioName: data.studioName,
      content,
    }),
    text: `${mk ? "Потсетник за вашиот термин." : "Appointment reminder."}\n\n${appointmentText(data)}${maps ? `\n\n${maps}` : ""}`,
    attachments: [calendarAttachment(data)],
  };
}

export function renderClientRescheduledEmail(
  data: AppointmentEmailData,
): RenderedEmail {
  const locale = data.locale ?? "mk-MK";
  const mk = isMacedonian(locale);
  const maps = directionsUrl(data);
  const call = data.studioPhone
    ? `tel:${data.studioPhone.replace(/[^+\d]/g, "")}`
    : undefined;
  const previousTime =
    data.previousStartAt !== undefined
      ? `<div style="margin:0 0 18px;padding:14px 16px;border-radius:14px;background:${EMAIL_COLORS.paper};">
          <div style="font-size:11px;font-weight:750;letter-spacing:.1em;text-transform:uppercase;color:${EMAIL_COLORS.muted};">${escapeHtml(mk ? "Претходен термин" : "Previous time")}</div>
          <div style="margin-top:6px;font-size:13px;line-height:20px;color:${EMAIL_COLORS.ink};text-decoration:line-through;">${escapeHtml(`${formatDate(data.previousStartAt, locale)}, ${formatTime(data.previousStartAt, locale)}${data.previousEndAt !== undefined ? `–${formatTime(data.previousEndAt, locale)}` : ""}`)}</div>
        </div>`
      : "";
  const actions = [
    button(
      calendarUrl(data),
      mk ? "Додај нов термин" : "Add new time to calendar",
      true,
    ),
    ...(maps ? [button(maps, mk ? "Насоки" : "Directions")] : []),
    ...(call ? [button(call, mk ? "Јавете се" : "Call studio")] : []),
  ].join("");
  const content = `${previousTime}
    <div style="margin:0 0 8px;font-size:11px;font-weight:750;letter-spacing:.1em;text-transform:uppercase;color:${EMAIL_COLORS.brand};">${escapeHtml(mk ? "Нов термин" : "New time")}</div>
    ${appointmentCard(data)}
    <div style="padding-top:22px;">${actions}</div>
    <p style="margin:10px 0 0;font-size:12px;line-height:19px;color:${EMAIL_COLORS.muted};">${escapeHtml(mk ? "Во прилог има ажурирана календарска датотека за Apple Calendar, Outlook и други апликации." : "An updated calendar file for Apple Calendar, Outlook, and other apps is attached.")}</p>`;
  const previousText =
    data.previousStartAt !== undefined
      ? `${mk ? "Претходно" : "Previous"}: ${formatDate(data.previousStartAt, locale)}, ${formatTime(data.previousStartAt, locale)}${data.previousEndAt !== undefined ? `–${formatTime(data.previousEndAt, locale)}` : ""}\n\n`
      : "";

  return {
    subject: cleanSubject(
      mk
        ? `Презакажан термин · ${data.studioName}`
        : `Appointment rescheduled · ${data.studioName}`,
    ),
    html: renderShell({
      preheader: `${data.serviceName} · ${formatDate(data.startAt, locale)} · ${formatTime(data.startAt, locale)}`,
      eyebrow: mk ? "Терминот е презакажан" : "Appointment rescheduled",
      title: mk
        ? "Вашиот термин има ново време."
        : "Your appointment has a new time.",
      intro: mk
        ? `${data.customerName}, ${data.studioName} го презакажа вашиот термин. Новите детали се подолу.`
        : `${data.customerName}, ${data.studioName} rescheduled your appointment. The updated details are below.`,
      studioName: data.studioName,
      content,
    }),
    text: `${mk ? "Терминот е презакажан." : "Your appointment was rescheduled."}\n\n${previousText}${mk ? "Нов термин" : "New time"}:\n${appointmentText(data)}`,
    attachments: [calendarAttachment(data)],
  };
}

export function renderStaffNewBookingEmail(
  data: AppointmentEmailData,
): RenderedEmail {
  const locale = data.locale ?? "en-GB";
  const contact = [data.customerEmail, data.customerPhone]
    .filter(Boolean)
    .join(" · ");
  const content = `${appointmentCard(data)}
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:16px;padding:14px 16px;background:${EMAIL_COLORS.paper};border-radius:14px;">
      ${detailRow("Client", data.customerName)}
      ${contact ? detailRow("Contact", contact) : ""}
    </table>
    ${data.dashboardUrl ? `<div style="padding-top:22px;">${button(data.dashboardUrl, "Open appointment", true)}</div>` : ""}`;
  return {
    subject: cleanSubject(
      `New booking · ${data.customerName} · ${data.studioName}`,
    ),
    html: renderShell({
      preheader: `${data.customerName} booked ${data.serviceName} for ${formatDate(data.startAt, locale)} at ${formatTime(data.startAt, locale)}.`,
      eyebrow: "New booking",
      title: "A new client is on the calendar.",
      intro: `${data.customerName} has confirmed their email and booked ${data.serviceName}.`,
      studioName: data.studioName,
      content,
    }),
    text: `New booking for ${data.studioName}.\n\nClient: ${data.customerName}${contact ? `\nContact: ${contact}` : ""}\n${appointmentText(data)}${data.dashboardUrl ? `\n\nOpen appointment: ${data.dashboardUrl}` : ""}`,
  };
}

export function renderStaffReminderEmail(
  data: AppointmentEmailData,
): RenderedEmail {
  const timing =
    data.hoursBefore === 1
      ? "in one hour"
      : data.hoursBefore
        ? `in ${data.hoursBefore} hours`
        : "soon";
  const contact = [data.customerEmail, data.customerPhone]
    .filter(Boolean)
    .join(" · ");
  const content = `${appointmentCard(data)}
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:16px;padding:14px 16px;background:${EMAIL_COLORS.paper};border-radius:14px;">
      ${detailRow("Client", data.customerName)}
      ${contact ? detailRow("Contact", contact) : ""}
    </table>
    ${data.dashboardUrl ? `<div style="padding-top:22px;">${button(data.dashboardUrl, "Open appointment", true)}</div>` : ""}`;
  return {
    subject: cleanSubject(`Coming up ${timing} · ${data.customerName}`),
    html: renderShell({
      preheader: `${data.customerName} · ${data.serviceName} · ${formatTime(data.startAt, data.locale ?? "en-GB")}`,
      eyebrow: "Team reminder",
      title: `Coming up ${timing}.`,
      intro: `${data.customerName} is booked with ${data.staffName}. Here is the appointment at a glance.`,
      studioName: data.studioName,
      content,
    }),
    text: `Team reminder for ${data.studioName}.\n\nClient: ${data.customerName}${contact ? `\nContact: ${contact}` : ""}\n${appointmentText(data)}${data.dashboardUrl ? `\n\nOpen appointment: ${data.dashboardUrl}` : ""}`,
  };
}

export function renderSimpleAppointmentEmail({
  data,
  title,
  intro,
  subject,
}: {
  data: AppointmentEmailData;
  title: string;
  intro: string;
  subject: string;
}): RenderedEmail {
  return {
    subject: cleanSubject(subject),
    html: renderShell({
      preheader: `${data.serviceName} · ${formatDate(data.startAt, data.locale)}`,
      eyebrow: "Appointment update",
      title,
      intro,
      studioName: data.studioName,
      content: appointmentCard(data),
    }),
    text: `${title}\n\n${intro}\n\n${appointmentText(data)}`,
  };
}

export function renderStaffInviteEmail({
  studioName,
  dashboardUrl,
}: {
  studioName: string;
  dashboardUrl: string;
}): RenderedEmail {
  return {
    subject: cleanSubject(`Join ${studioName} on OPUS`),
    html: renderShell({
      preheader: `${studioName} invited you to its OPUS workspace.`,
      eyebrow: "Team invitation",
      title: "Your workspace is ready.",
      intro: `${studioName} invited you to manage appointments together in OPUS. Sign in with this email address to continue.`,
      studioName,
      content: button(dashboardUrl, "Open OPUS Studio", true),
    }),
    text: `${studioName} invited you to its OPUS workspace. Sign in with this email address at ${dashboardUrl}.`,
  };
}
