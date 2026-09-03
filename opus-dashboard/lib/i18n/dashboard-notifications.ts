import type { DashboardLanguage } from "./types";

interface DashboardNotificationCopyInput {
  type: string;
  title: string;
  body: string;
}

interface DashboardNotificationCopy {
  title: string;
  body: string;
}

function translateNotificationTitle(type: string, fallback: string): string {
  switch (type) {
    case "new_booking":
      return fallback === "Booking Rescheduled"
        ? "Презакажан термин"
        : "Нов термин";
    case "booking_cancelled":
      return "Откажан термин";
    case "no_show":
      return "Непојавување";
    default:
      return fallback;
  }
}

const MACEDONIAN_DATE_TOKEN: Record<string, string> = {
  Mon: "пон.",
  Tue: "вто.",
  Wed: "сре.",
  Thu: "чет.",
  Fri: "пет.",
  Sat: "саб.",
  Sun: "нед.",
  Jan: "јан.",
  Feb: "фев.",
  Mar: "мар.",
  Apr: "апр.",
  May: "мај",
  Jun: "јун.",
  Jul: "јул.",
  Aug: "авг.",
  Sep: "сеп.",
  Sept: "сеп.",
  Oct: "окт.",
  Nov: "ное.",
  Dec: "дек.",
};

function translateAppointmentLabel(label: string): string {
  return label
    .replace(
      /\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec)\b/g,
      (token) => MACEDONIAN_DATE_TOKEN[token] ?? token,
    )
    .replace(" at ", " во ");
}

function translateNotificationBody(type: string, body: string): string {
  if (type === "new_booking") {
    const match = body.match(/^(.+?) booked (.+?) with (.+?) for (.+)$/);
    if (match) {
      const [, customer, service, staff, appointment] = match;
      return `${customer} закажа ${service} кај ${staff} за ${translateAppointmentLabel(appointment)}.`;
    }

    const rescheduled = body.match(
      /^(.+?)'s (.+?) with (.+?) was rescheduled to (.+)$/,
    );
    if (rescheduled) {
      const [, customer, service, staff, appointment] = rescheduled;
      return `Терминот на ${customer} за ${service} кај ${staff} е презакажан за ${translateAppointmentLabel(appointment)}.`;
    }
  }

  if (type === "booking_cancelled") {
    const match = body.match(
      /^The (.+?) booking for (.+?) on (.+?) was cancelled$/,
    );
    if (match) {
      const [, service, customer, appointment] = match;
      return `Терминот на ${customer} за ${service}, закажан за ${translateAppointmentLabel(appointment)}, беше откажан.`;
    }
  }

  if (type === "no_show") {
    const match = body.match(/^(.+?) didn't show up for (.+?) on (.+)$/);
    if (match) {
      const [, customer, service, appointment] = match;
      return `${customer} не се појави на терминот за ${service} на ${translateAppointmentLabel(appointment)}.`;
    }
  }

  return body;
}

/**
 * Localizes the known booking notification templates at render time so both
 * existing and newly-created dashboard notifications follow the selected UI
 * language without changing the persisted audit-facing notification payload.
 */
export function getDashboardNotificationCopy(
  language: DashboardLanguage,
  notification: DashboardNotificationCopyInput,
): DashboardNotificationCopy {
  if (language === "en") {
    return {
      title: notification.title,
      body: notification.body,
    };
  }

  return {
    title: translateNotificationTitle(notification.type, notification.title),
    body: translateNotificationBody(notification.type, notification.body),
  };
}
