import type { RenderedEmail } from "./emailTemplates";

const escape = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
const icsEscape = (value: string) =>
  value
    .replaceAll("\\", "\\\\")
    .replaceAll("\r", "")
    .replaceAll("\n", "\\n")
    .replaceAll(",", "\\,")
    .replaceAll(";", "\\;");
const instant = (value: number) =>
  new Date(value)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");

function shell(
  subject: string,
  lines: string[],
  link?: { label: string; url: string },
): RenderedEmail {
  return {
    subject: subject.replace(/[\r\n]/g, " "),
    text: [...lines, ...(link ? [`${link.label}: ${link.url}`] : [])].join(
      "\n\n",
    ),
    html: `<html><body style="font-family:Arial,sans-serif;color:#24282f"><main style="max-width:560px;margin:32px auto;padding:24px"><h1 style="font-size:24px">${escape(subject)}</h1>${lines.map((line) => `<p>${escape(line)}</p>`).join("")}${link ? `<p><a href="${escape(link.url)}">${escape(link.label)}</a></p>` : ""}<p style="color:#697580;font-size:12px">OPUS</p></main></body></html>`,
  };
}

export function renderReservationVerification(
  venue: string,
  code: string,
  locale: string,
): RenderedEmail {
  const mk = locale.startsWith("mk");
  return shell(
    mk
      ? `Потврдете ја резервацијата · ${venue}`
      : `Confirm your reservation · ${venue}`,
    [
      mk
        ? `Вашиот код е ${code}. Важи 10 минути.`
        : `Your code is ${code}. It expires in 10 minutes.`,
      mk
        ? "Ако не побаравте резервација, игнорирајте ја оваа порака."
        : "If you did not request a reservation, ignore this message.",
    ],
  );
}

export function renderReservationMessage(data: {
  orgId: string;
  reservationId: string;
  revision: number;
  venue: string;
  customerName: string;
  startAt: number;
  endAt: number;
  partySize: number;
  timezone: string;
  locale: string;
  event: "confirmation" | "changed" | "cancelled" | "reminder";
  staff: boolean;
  address?: string;
  manageUrl?: string;
  dashboardUrl?: string;
}): RenderedEmail {
  const mk = data.locale.startsWith("mk");
  const titles = mk
    ? {
        confirmation: "Резервацијата е потврдена",
        changed: "Резервацијата е изменета",
        cancelled: "Резервацијата е откажана",
        reminder: "Потсетник за резервација",
      }
    : {
        confirmation: "Reservation confirmed",
        changed: "Reservation updated",
        cancelled: "Reservation cancelled",
        reminder: "Reservation reminder",
      };
  const when = new Intl.DateTimeFormat(mk ? "mk-MK" : "en-GB", {
    timeZone: data.timezone,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "shortOffset",
  }).format(new Date(data.startAt));
  const url = data.staff ? data.dashboardUrl : data.manageUrl;
  const result = shell(
    `${titles[data.event]} · ${data.venue}`,
    [
      data.customerName,
      `${mk ? "Гости" : "Guests"}: ${data.partySize}`,
      `${when} (${data.timezone})`,
      ...(data.address ? [data.address] : []),
    ],
    url
      ? { label: mk ? "Отвори резервација" : "Manage reservation", url }
      : undefined,
  );
  if (!data.staff) {
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//OPUS//Reservations//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:reservation-${data.orgId}-${data.reservationId}@opus.mk`,
      `SEQUENCE:${data.revision}`,
      `DTSTAMP:${instant(Date.now())}`,
      `DTSTART:${instant(data.startAt)}`,
      `DTEND:${instant(data.endAt)}`,
      `STATUS:${data.event === "cancelled" ? "CANCELLED" : "CONFIRMED"}`,
      `SUMMARY:${icsEscape(`${data.venue} · ${data.partySize} guests`)}`,
      ...(data.address ? [`LOCATION:${icsEscape(data.address)}`] : []),
      "END:VEVENT",
      "END:VCALENDAR",
      "",
    ].join("\r\n");
    result.attachments = [
      {
        filename: "opus-reservation.ics",
        content: btoa(String.fromCharCode(...new TextEncoder().encode(ics))),
      },
    ];
  }
  return result;
}
